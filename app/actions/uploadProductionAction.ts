'use server';

import { query } from '@/lib/db';
import { parseProductionExcel, ProductionHeader, ProductionRow } from '@/lib/parseExcel';

export interface ProductionUploadResult {
  success: boolean;
  workOrderId: number | null;
  rowsInserted: number;
  errors: string[];
  unknownItemIds: string[];
}

export interface ProductionPreviewResult {
  header: ProductionHeader;
  rows: ProductionRow[];
  productionDate: string | null;
  errors: string[];
  unknownItemIds: string[];
}

export interface SlaughterBatchOption {
  id: number;
  date: string;
  total_heads: number;
  halak_count: number;
  muchshar_count: number;
}

export async function getAvailableSlaughterBatches(factoryId: number): Promise<SlaughterBatchOption[]> {
  const result = await query(
    `SELECT sb.id, sb.date::text,
            (sb.cows_count + sb.bulls_count) AS total_heads,
            sb.halak_count, sb.muchshar_count
     FROM slaughter_batches sb
     WHERE sb.factory_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM production_sources ps
         WHERE ps.slaughter_batch_id = sb.id
       )
     ORDER BY sb.date DESC
     LIMIT 30`,
    [factoryId]
  );
  return result.rows;
}

export async function previewProduction(base64: string): Promise<ProductionPreviewResult> {
  const buffer = Buffer.from(base64, 'base64');
  const parsed = parseProductionExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  // Check which item_ids exist
  const allItemIds = parsed.rows.map(r => r.item_id);
  let unknownItemIds: string[] = [];

  if (allItemIds.length > 0) {
    try {
      const existingResult = await query(
        `SELECT item_id FROM products WHERE item_id = ANY($1)`,
        [allItemIds]
      );
      const existingIds = new Set(existingResult.rows.map((r: any) => r.item_id));
      unknownItemIds = [...new Set(allItemIds.filter(id => !existingIds.has(id)))];
    } catch {
      // If DB check fails during preview, continue without validation
    }
  }

  return {
    header: parsed.header,
    rows: parsed.rows,
    productionDate: parsed.productionDate,
    errors: parsed.errors,
    unknownItemIds,
  };
}

export async function uploadProduction(
  factoryId: number,
  productionDate: string,
  slaughterBatchId: number | null,
  base64: string,
  fileName: string
): Promise<ProductionUploadResult> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const parsed = parseProductionExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

    if (parsed.rows.length === 0) {
      return { success: false, workOrderId: null, rowsInserted: 0, errors: parsed.errors.length > 0 ? parsed.errors : ['No product rows found'], unknownItemIds: [] };
    }

    // Validate item_ids exist
    const allItemIds = parsed.rows.map(r => r.item_id);
    const existingResult = await query(
      `SELECT item_id FROM products WHERE item_id = ANY($1)`,
      [allItemIds]
    );
    const existingIds = new Set(existingResult.rows.map((r: any) => r.item_id));
    const unknownItemIds = [...new Set(allItemIds.filter(id => !existingIds.has(id)))];

    // Log the upload
    const logResult = await query(
      `INSERT INTO import_logs (file_name, upload_type, factory_id, status) VALUES ($1, 'production', $2, 'processing') RETURNING id`,
      [fileName, factoryId]
    );
    const logId = logResult.rows[0].id;

    // Create/update work_order with input data
    const woResult = await query(`
      INSERT INTO work_orders (factory_id, production_date,
        halak_quarters_in, kosher_quarters_in, halak_weight_in_kg, kosher_weight_in_kg)
      VALUES ($1, $2::date, $3, $4, $5, $6)
      ON CONFLICT (factory_id, production_date) DO UPDATE SET
        halak_quarters_in = EXCLUDED.halak_quarters_in,
        kosher_quarters_in = EXCLUDED.kosher_quarters_in,
        halak_weight_in_kg = EXCLUDED.halak_weight_in_kg,
        kosher_weight_in_kg = EXCLUDED.kosher_weight_in_kg
      RETURNING id
    `, [
      factoryId, productionDate,
      parsed.header.halak_quarters_in,
      parsed.header.kosher_quarters_in,
      parsed.header.halak_weight_in_kg,
      parsed.header.kosher_weight_in_kg,
    ]);
    const workOrderId = woResult.rows[0].id;

    // Delete old production records for clean re-upload
    await query(`DELETE FROM production_records WHERE work_order_id = $1`, [workOrderId]);

    // Link to slaughter batch — explicit selection by user (replaces date-based auto-link)
    await query(`DELETE FROM production_sources WHERE work_order_id = $1`, [workOrderId]);
    if (slaughterBatchId !== null) {
      await query(
        `INSERT INTO production_sources (work_order_id, slaughter_batch_id)
         VALUES ($1, $2)
         ON CONFLICT (slaughter_batch_id) DO NOTHING`,
        [workOrderId, slaughterBatchId]
      );
    }

    // Insert production records (only for known products)
    let inserted = 0;
    const errors = [...parsed.errors];

    for (const row of parsed.rows) {
      if (!existingIds.has(row.item_id)) continue; // Skip unknown items

      try {
        await query(`
          INSERT INTO production_records (work_order_id, item_id, units, boxes, weight_kg)
          VALUES ($1, $2, $3, $4, $5)
        `, [workOrderId, row.item_id, row.units, row.boxes, row.weight_kg]);
        inserted++;
      } catch (rowError: any) {
        errors.push(`Item ${row.item_id}: ${rowError.message}`);
      }
    }

    // Status: 0 rows inserted with parseable data = error
    const status = inserted === 0 && parsed.rows.length > 0 ? 'error' :
                   errors.length === 0 && unknownItemIds.length === 0 ? 'success' :
                   inserted > 0 ? 'partial' : 'error';

    await query(
      `UPDATE import_logs SET status = $1, rows_imported = $2, error_details = $3 WHERE id = $4`,
      [status, inserted, errors.length > 0 ? errors.join('\n') : null, logId]
    );

    return { success: inserted > 0, workOrderId, rowsInserted: inserted, errors, unknownItemIds };
  } catch (error: any) {
    return { success: false, workOrderId: null, rowsInserted: 0, errors: [error.message], unknownItemIds: [] };
  }
}

export async function getSeasons(): Promise<{ id: number; name: string }[]> {
  const result = await query(`SELECT id, name FROM seasons WHERE is_active = true ORDER BY start_date DESC`);
  return result.rows;
}
