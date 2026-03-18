'use server';

import { query, withTransaction } from '@/lib/db';
import { parseProductionExcel, ProductionHeader, ProductionRow } from '@/lib/parseExcel';

export interface ProductionUploadResult {
  success: boolean;
  productionDataId: number | null;
  rowsInserted: number;
  rowsSkipped: number;
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
  total_slaughtered: number;
  halak_count: number;
  muchshar_count: number;
}

export async function getAvailableSlaughterBatches(factoryId: number): Promise<SlaughterBatchOption[]> {
  const result = await query(
    `SELECT sb.id, sb.date::text,
            sb.total_slaughtered,
            sb.halak_count, sb.muchshar_count
     FROM slaughter_batches sb
     WHERE sb.factory_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM work_orders wo
         WHERE wo.slaughter_batch_id = sb.id
           AND wo.production_data_id IS NOT NULL
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
  slaughterBatchId: number,
  base64: string,
  fileName: string
): Promise<ProductionUploadResult> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const parsed = parseProductionExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

    if (parsed.rows.length === 0) {
      return { success: false, productionDataId: null, rowsInserted: 0, rowsSkipped: 0, errors: parsed.errors.length > 0 ? parsed.errors : ['No product rows found'], unknownItemIds: [] };
    }

    // Validate item_ids exist and fetch product_id mapping
    const allItemIds = parsed.rows.map(r => r.item_id);
    const existingResult = await query(
      `SELECT item_id, id AS product_id FROM products WHERE item_id = ANY($1)`,
      [allItemIds]
    );
    const existingIds = new Set(existingResult.rows.map((r: any) => r.item_id));
    const itemToProductId = new Map<string, number>(existingResult.rows.map((r: any) => [r.item_id, r.product_id]));
    const unknownItemIds = [...new Set(allItemIds.filter(id => !existingIds.has(id)))];
    const rowsSkipped = parsed.rows.filter(r => !existingIds.has(r.item_id)).length;

    // All DB mutations inside a transaction
    const result = await withTransaction(async (client) => {
      // Log the upload
      const logResult = await client.query(
        `INSERT INTO import_logs (file_name, upload_type, factory_id, status) VALUES ($1, 'production', $2, 'processing') RETURNING id`,
        [fileName, factoryId]
      );
      const logId = logResult.rows[0].id;

      // Check for existing production_data linked to this slaughter batch (re-upload)
      const existingWO = await client.query(
        `SELECT production_data_id FROM work_orders
         WHERE slaughter_batch_id = $1 AND production_data_id IS NOT NULL`,
        [slaughterBatchId]
      );
      const oldProdDataId: number | null = existingWO.rows[0]?.production_data_id ?? null;

      // Create new production_data entry
      const pdResult = await client.query(`
        INSERT INTO production_data (date, halak_quarters, kosher_quarters, halak_weight_kg, kosher_weight_kg)
        VALUES ($1::date, $2, $3, $4, $5)
        RETURNING id
      `, [
        productionDate,
        parsed.header.halak_quarters_in,
        parsed.header.kosher_quarters_in,
        parsed.header.halak_weight_in_kg,
        parsed.header.kosher_weight_in_kg,
      ]);
      const prodDataId: number = pdResult.rows[0].id;

      // Delete old records if re-upload
      if (oldProdDataId) {
        await client.query(`DELETE FROM production_records WHERE production_data_id = $1`, [oldProdDataId]);
      }

      // Insert production records (only for known products)
      let inserted = 0;
      const errors = [...parsed.errors];

      for (const row of parsed.rows) {
        if (!existingIds.has(row.item_id)) continue;

        await client.query(`
          INSERT INTO production_records (production_data_id, product_id, units, boxes, weight_kg)
          VALUES ($1, $2, $3, $4, $5)
        `, [prodDataId, itemToProductId.get(row.item_id), row.units, row.boxes, row.weight_kg]);
        inserted++;
      }

      // Link via work_orders (upsert on slaughter_batch_id)
      await client.query(`
        INSERT INTO work_orders (slaughter_batch_id, production_data_id)
        VALUES ($1, $2)
        ON CONFLICT (slaughter_batch_id) DO UPDATE SET production_data_id = EXCLUDED.production_data_id
      `, [slaughterBatchId, prodDataId]);

      // Clean up old production_data (now orphaned)
      if (oldProdDataId) {
        await client.query(`DELETE FROM production_data WHERE id = $1`, [oldProdDataId]);
      }

      const status = inserted === 0 && parsed.rows.length > 0 ? 'error' :
                     errors.length === 0 && unknownItemIds.length === 0 ? 'success' :
                     inserted > 0 ? 'partial' : 'error';

      await client.query(
        `UPDATE import_logs SET status = $1, error_details = $2 WHERE id = $3`,
        [status, errors.length > 0 ? errors.join('\n') : null, logId]
      );

      return { prodDataId, inserted, errors };
    });

    return { success: result.inserted > 0, productionDataId: result.prodDataId, rowsInserted: result.inserted, rowsSkipped, errors: result.errors, unknownItemIds };
  } catch (error: any) {
    return { success: false, productionDataId: null, rowsInserted: 0, rowsSkipped: 0, errors: [error.message], unknownItemIds: [] };
  }
}
