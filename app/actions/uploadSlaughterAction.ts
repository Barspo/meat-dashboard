'use server';

import { query } from '@/lib/db';
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

    // Log the upload attempt
    const logResult = await query(
      `INSERT INTO import_logs (file_name, upload_type, factory_id, status) VALUES ($1, 'slaughter', $2, 'processing') RETURNING id`,
      [fileName, factoryId]
    );
    const logId = logResult.rows[0].id;

    let inserted = 0;
    let skipped = 0;
    const errors = [...parsed.errors];
    const warnings: string[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];

      // Mismatch warning: cows+bulls should equal halak+muchshar+waste_lungs+waste_inner+waste_outer
      const expected = row.cows_count + row.bulls_count;
      const accounted = row.halak_count + row.muchshar_count + row.waste_lungs + row.waste_inner + row.waste_outer;
      if (expected !== accounted) {
        warnings.push(`שורה ${i + 1} (${row.date}): סכום ${expected} ראשים לא מתאים לחלוקה ${accounted} (הלק+מוכשר+פחתים)`);
      }

      try {
        await query(`
          INSERT INTO slaughter_batches (
            factory_id, date, cows_count, bulls_count,
            halak_count, muchshar_count,
            waste_lungs, waste_inner, waste_outer
          ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (factory_id, date) DO UPDATE SET
            cows_count = EXCLUDED.cows_count,
            bulls_count = EXCLUDED.bulls_count,
            halak_count = EXCLUDED.halak_count,
            muchshar_count = EXCLUDED.muchshar_count,
            waste_lungs = EXCLUDED.waste_lungs,
            waste_inner = EXCLUDED.waste_inner,
            waste_outer = EXCLUDED.waste_outer
        `, [
          factoryId, row.date, row.cows_count, row.bulls_count,
          row.halak_count, row.muchshar_count,
          row.waste_lungs, row.waste_inner, row.waste_outer,
        ]);
        inserted++;
      } catch (rowError: any) {
        errors.push(`Date ${row.date}: ${rowError.message}`);
        skipped++;
      }
    }

    // Update log
    const status = errors.length === 0 ? 'success' : (inserted > 0 ? 'partial' : 'error');
    await query(
      `UPDATE import_logs SET status = $1, rows_imported = $2, error_details = $3 WHERE id = $4`,
      [status, inserted, errors.length > 0 ? errors.join('\n') : null, logId]
    );

    return { success: inserted > 0, rowsInserted: inserted, rowsSkipped: skipped, errors, warnings };
  } catch (error: any) {
    return { success: false, rowsInserted: 0, rowsSkipped: 0, errors: [error.message], warnings: [] };
  }
}
