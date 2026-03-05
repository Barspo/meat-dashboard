'use server';

import { query } from '@/lib/db';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';
export type AlertCategory = 'waste' | 'production' | 'slaughter' | 'system' | 'upload';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  factoryName?: string;
  date: string;
  value?: number;
  threshold?: number;
  // upload-specific fields
  fileName?: string;
  uploadType?: string;
  uploadMethod?: string;
  status?: string;
  errorDetails?: string | null;
}

export async function getAlerts(): Promise<Alert[]> {
  try {
    const alerts: Alert[] = [];
    const today = new Date().toLocaleDateString('he-IL');

    // ── 1. Waste % per factory (last 30 days) ──────────────────────────────
    const wasteResult = await query(`
      SELECT COALESCE(f.name_hebrew, f.name_english) as factory_name,
             COALESCE(SUM(sb.cows_count + sb.bulls_count), 0) as total_heads,
             COALESCE(SUM(COALESCE(sb.waste_lungs,0) + COALESCE(sb.waste_inner,0) + COALESCE(sb.waste_outer,0)), 0) as total_waste
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      WHERE sb.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY f.id, f.name_english, f.name_hebrew
      HAVING COALESCE(SUM(sb.cows_count + sb.bulls_count), 0) > 0
    `);
    for (const row of wasteResult.rows) {
      const heads = Number(row.total_heads);
      const waste = Number(row.total_waste);
      const pct = heads > 0 ? (waste / heads) * 100 : 0;
      if (pct > 15) {
        alerts.push({ id: `waste-error-${row.factory_name}`, severity: 'error', category: 'waste',
          title: 'חריגת פחת קריטית',
          message: `אחוז הפחת עומד על ${pct.toFixed(1)}% — מעל הסף המותר של 15%`,
          factoryName: row.factory_name, date: today, value: pct, threshold: 15 });
      } else if (pct > 12) {
        alerts.push({ id: `waste-warn-${row.factory_name}`, severity: 'warning', category: 'waste',
          title: 'התראת פחת',
          message: `אחוז הפחת מתקרב לסף — ${pct.toFixed(1)}% (הסף הוא 15%)`,
          factoryName: row.factory_name, date: today, value: pct, threshold: 15 });
      }
    }

    // ── 2. Slaughter batches without linked production (via work_orders) ────
    const unlinkedResult = await query(`
      SELECT sb.id, sb.date::text, COALESCE(f.name_hebrew, f.name_english) as factory_name,
             (sb.cows_count + sb.bulls_count) as total_heads
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      WHERE NOT EXISTS (
        SELECT 1 FROM work_orders wo
        WHERE wo.slaughter_batch_id = sb.id
          AND wo.production_data_id IS NOT NULL
      )
      ORDER BY sb.date DESC
      LIMIT 20
    `);
    for (const row of unlinkedResult.rows) {
      alerts.push({ id: `unlinked-slaughter-${row.id}`, severity: 'warning', category: 'slaughter',
        title: 'שחיטה ללא ייצור מקושר',
        message: `${row.total_heads} ראשים משחיטה מ-${row.date} לא מקושרים לשום דוח ייצור`,
        factoryName: row.factory_name, date: row.date });
    }

    // ── 3. Slaughter/production quarters mismatch (tolerance ±2 quarters) ──
    const mismatchResult = await query(`
      SELECT sb.date::text, COALESCE(f.name_hebrew, f.name_english) as factory_name,
             sb.halak_count, pd.halak_quarters,
             sb.muchshar_count, pd.kosher_quarters
      FROM work_orders wo
      JOIN slaughter_batches sb ON wo.slaughter_batch_id = sb.id
      JOIN production_data pd ON wo.production_data_id = pd.id
      JOIN factories f ON sb.factory_id = f.id
      WHERE ABS(sb.halak_count * 2 - pd.halak_quarters) > 2
         OR ABS(sb.muchshar_count * 2 - pd.kosher_quarters) > 2
    `);
    for (const row of mismatchResult.rows) {
      const hDiff = Math.abs(Number(row.halak_count) * 2 - Number(row.halak_quarters));
      const mDiff = Math.abs(Number(row.muchshar_count) * 2 - Number(row.kosher_quarters));
      alerts.push({ id: `mismatch-${row.factory_name}-${row.date}`, severity: 'warning', category: 'slaughter',
        title: 'אי-התאמה שחיטה-ייצור',
        message: `הפרש רבעים: חלק ${hDiff > 2 ? `±${hDiff}` : 'תקין'}, מוכשר ${mDiff > 2 ? `±${mDiff}` : 'תקין'}`,
        factoryName: row.factory_name, date: row.date });
    }

    // ── 4. Active factories with no slaughter in 14+ days ──────────────────
    const noSlaughterResult = await query(`
      SELECT COALESCE(f.name_hebrew, f.name_english) as factory_name,
             MAX(sb.date)::text as last_slaughter_date
      FROM factories f
      LEFT JOIN slaughter_batches sb ON f.id = sb.factory_id
      WHERE f.active = true
      GROUP BY f.id, f.name_english, f.name_hebrew
      HAVING MAX(sb.date) < CURRENT_DATE - INTERVAL '14 days'
          OR MAX(sb.date) IS NULL
    `);
    for (const row of noSlaughterResult.rows) {
      alerts.push({ id: `no-slaughter-${row.factory_name}`, severity: 'info', category: 'slaughter',
        title: 'חוסר פעילות שחיטה',
        message: row.last_slaughter_date
          ? `שחיטה אחרונה לפני 14+ ימים (${row.last_slaughter_date})`
          : 'לא נמצאו נתוני שחיטה למפעל זה',
        factoryName: row.factory_name, date: today });
    }

    // ── 5. Steak yield target 10–13% (last 7 days) ─────────────────────────
    const steakResult = await query(`
      SELECT COALESCE(f.name_hebrew, f.name_english) as factory_name,
             COALESCE(SUM(CASE WHEN p.is_anatomical IS TRUE THEN pr.weight_kg ELSE 0 END), 0) as x9_weight,
             COALESCE(SUM(CASE WHEN p.is_steak = true THEN pr.weight_kg ELSE 0 END), 0) as steak_weight
      FROM production_records pr
      JOIN products p ON pr.product_id = p.id
      JOIN production_data pd ON pr.production_data_id = pd.id
      JOIN work_orders wo ON wo.production_data_id = pd.id
      JOIN slaughter_batches sb ON wo.slaughter_batch_id = sb.id
      JOIN factories f ON sb.factory_id = f.id
      WHERE pd.date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY f.id, f.name_english, f.name_hebrew
      HAVING COALESCE(SUM(CASE WHEN p.is_anatomical IS TRUE THEN pr.weight_kg ELSE 0 END), 0) > 0
    `);
    for (const row of steakResult.rows) {
      const x9 = Number(row.x9_weight);
      const steak = Number(row.steak_weight);
      const steakPct = x9 > 0 ? (steak / x9) * 100 : 0;
      if (steakPct > 0 && (steakPct < 10 || steakPct > 13)) {
        const tooLow = steakPct < 10;
        alerts.push({ id: `steak-${row.factory_name}`, severity: 'warning', category: 'production',
          title: `אחוז סטייקים ${tooLow ? 'נמוך מדי' : 'גבוה מדי'}`,
          message: `אחוז הסטייקים מ-X9 הוא ${steakPct.toFixed(1)}% — היעד הוא 10%–13%`,
          factoryName: row.factory_name, date: today, value: steakPct });
      }
    }

    // ── 6. Upload history (last 30 entries) ────────────────────────────────
    const uploadsResult = await query(`
      SELECT il.id, il.file_name, il.upload_type, il.status,
             il.error_details, il.uploaded_at::text as uploaded_at,
             COALESCE(il.upload_method, 'manual') as upload_method,
             COALESCE(f.name_hebrew, f.name_english, '-') as factory_name
      FROM import_logs il
      LEFT JOIN factories f ON il.factory_id = f.id
      ORDER BY il.id DESC
      LIMIT 30
    `);
    for (const row of uploadsResult.rows) {
      const severity: AlertSeverity = row.status === 'error' ? 'error'
        : row.status === 'partial' ? 'warning'
        : row.status === 'success' ? 'success' : 'info';
      alerts.push({
        id: `upload-${row.id}`,
        severity,
        category: 'upload',
        title: `העלאת ${row.upload_type === 'slaughter' ? 'שחיטה' : 'ייצור'}`,
        message: row.file_name,
        factoryName: row.factory_name,
        date: row.uploaded_at ? row.uploaded_at.slice(0, 16).replace('T', ' ') : today,
        fileName: row.file_name,
        uploadType: row.upload_type,
        uploadMethod: row.upload_method,
        status: row.status,
        errorDetails: row.error_details || null,
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}
