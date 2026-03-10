'use server';

import { query } from '@/lib/db';
import { logUploadAttempt } from './logUpload';

export async function uploadSlaughterData(factoryId: string, rows: any[], fileName: string) {
  try {
    console.log(`Starting Slaughter Upload. Factory: ${factoryId}, Rows: ${rows.length}`);

    const values: any[] = [];
    const placeholders: string[] = [];
    
    rows.forEach((row, index) => {
      const i = index * 14; // 14 פרמטרים לכל שורה

      placeholders.push(`(
        $${i+1}, $${i+2}, $${i+3}, $${i+4}, $${i+5},
        $${i+6}, $${i+7}, $${i+8}, $${i+9},
        $${i+10}, $${i+11}, $${i+12}, $${i+13}, $${i+14}
      )`);

      values.push(
        parseInt(factoryId),
        row.date,
        Number(row.total_slaughtered) || (Number(row.cows) || 0) + (Number(row.bulls) || 0),
        Number(row.cows) || 0,
        Number(row.bulls) || 0,
        Number(row.halak) || 0,
        Number(row.kosher) || 0,
        Number(row.waste_lungs) || 0,
        Number(row.waste_inner) || 0,
        Number(row.waste_outer) || 0,
        Number(row.halak_quarters) || 0,
        Number(row.kosher_quarters) || 0,
        Number(row.halak_weight) || 0,
        Number(row.kosher_weight) || 0
      );
    });

    const sql = `
      INSERT INTO slaughter_batches (
        factory_id, date, total_slaughtered, cows_count, bulls_count,
        halak_count, muchshar_count,
        waste_lungs, waste_inner, waste_outer,
        halak_quarters, kosher_quarters,
        halak_weight_kg, kosher_weight_kg
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (factory_id, date)
      DO UPDATE SET
        total_slaughtered = EXCLUDED.total_slaughtered,
        cows_count = EXCLUDED.cows_count,
        bulls_count = EXCLUDED.bulls_count,
        halak_count = EXCLUDED.halak_count,
        muchshar_count = EXCLUDED.muchshar_count,
        waste_lungs = EXCLUDED.waste_lungs,
        waste_inner = EXCLUDED.waste_inner,
        waste_outer = EXCLUDED.waste_outer,
        halak_quarters = EXCLUDED.halak_quarters,
        kosher_quarters = EXCLUDED.kosher_quarters,
        halak_weight_kg = EXCLUDED.halak_weight_kg,
        kosher_weight_kg = EXCLUDED.kosher_weight_kg;
    `;

    await query(sql, values);
    
    // דיווח הצלחה ללוג
    await logUploadAttempt(fileName, 'slaughter', 'success', `הועלו בהצלחה ${rows.length} רשומות למפעל ${factoryId}`);

    return { success: true, message: `הועלו בהצלחה ${rows.length} רשומות` };

  } catch (error: any) {
    console.error("❌ Database Error:", error);
    
    // דיווח כישלון ללוג
    const errorMsg = error.message || 'שגיאה לא ידועה בשמירה';
    await logUploadAttempt(fileName, 'slaughter', 'error', errorMsg);

    return { success: false, message: 'שגיאה בשמירה למסד הנתונים: ' + errorMsg };
  }
}