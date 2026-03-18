'use server';

import { query, withTransaction } from '@/lib/db';
import { parseSlaughterExcel, SlaughterRow } from '@/lib/parseExcel';

export interface SlaughterUploadResult {
  success: boolean;
  rowsInserted: number;
  rowsSkipped: number;
  errors: string[];
  warnings: string[];
}

export interface SlaughterPreviewResult {
  rows: SlaughterRow[];
  errors: string[];
}

export async function previewSlaughter(base64: string): Promise<SlaughterPreviewResult> {
  const buffer = Buffer.from(base64, 'base64');
  return parseSlaughterExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

export async function uploadSlaughter(
  factoryId: number,
  base64: string,
  fileName: string
): Promise<SlaughterUploadResult> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const parsed = parseSlaughterExcel(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

    if (parsed.rows.length === 0) {
      return { success: false, rowsInserted: 0, rowsSkipped: 0, errors: parsed.errors.length > 0 ? parsed.errors : ['No valid rows found in file'], warnings: [] };
    }

    // Collect warnings before transaction (validation only)
    const warnings: string[] = [];
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const accounted = row.halak_count + row.muchshar_count + row.waste_count;
      if (row.total_slaughtered !== accounted) {
        warnings.push(`שורה ${i + 1} (${row.date}): סה״כ שחיטות ${row.total_slaughtered} לא מתאים לחלוקה ${accounted} (חלק ${row.halak_count} + מוכשר ${row.muchshar_count} + טרף ${row.waste_count})`);
      }
    }

    // All DB mutations inside a transaction
    const result = await withTransaction(async (client) => {
      const logResult = await client.query(
        `INSERT INTO import_logs (file_name, upload_type, factory_id, status) VALUES ($1, 'slaughter', $2, 'processing') RETURNING id`,
        [fileName, factoryId]
      );
      const logId = logResult.rows[0].id;

      let inserted = 0;
      const errors = [...parsed.errors];

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];

        const sbResult = await client.query(`
          INSERT INTO slaughter_batches (
            factory_id, date, total_slaughtered,
            cows_count, bulls_count,
            halak_count, muchshar_count,
            waste_count, waste_lungs, waste_inner, waste_outer
          ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (factory_id, date) DO UPDATE SET
            total_slaughtered = EXCLUDED.total_slaughtered,
            cows_count = EXCLUDED.cows_count,
            bulls_count = EXCLUDED.bulls_count,
            halak_count = EXCLUDED.halak_count,
            muchshar_count = EXCLUDED.muchshar_count,
            waste_count = EXCLUDED.waste_count,
            waste_lungs = EXCLUDED.waste_lungs,
            waste_inner = EXCLUDED.waste_inner,
            waste_outer = EXCLUDED.waste_outer
          RETURNING id
        `, [
          factoryId, row.date, row.total_slaughtered,
          row.cows_count, row.bulls_count,
          row.halak_count, row.muchshar_count,
          row.waste_count, row.waste_lungs, row.waste_inner, row.waste_outer,
        ]);

        // Auto-create work_order (waiting for production)
        if (sbResult.rows.length > 0) {
          await client.query(`
            INSERT INTO work_orders (slaughter_batch_id)
            VALUES ($1)
            ON CONFLICT (slaughter_batch_id) DO NOTHING
          `, [sbResult.rows[0].id]);
        }

        inserted++;
      }

      const status = errors.length === 0 ? 'success' : (inserted > 0 ? 'partial' : 'error');
      await client.query(
        `UPDATE import_logs SET status = $1, error_details = $2 WHERE id = $3`,
        [status, errors.length > 0 ? errors.join('\n') : null, logId]
      );

      return { inserted, errors };
    });

    return { success: result.inserted > 0, rowsInserted: result.inserted, rowsSkipped: parsed.rows.length - result.inserted, errors: result.errors, warnings };
  } catch (error: any) {
    return { success: false, rowsInserted: 0, rowsSkipped: 0, errors: [error.message], warnings: [] };
  }
}
