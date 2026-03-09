'use server';

import { query } from '@/lib/db';

export type AlertType = 'file_matching' | 'anomaly' | 'factory' | 'upload';

export interface AlertItem {
  id: string;
  name: string;
  detail: string;
  type: AlertType;
  type_label: string;
  date: string;
  severity: 'error' | 'warning' | 'info';
}

export async function getAlerts(params: {
  startDate?: string;
  endDate?: string;
  type?: AlertType | 'all';
  uploadStatus?: 'all' | 'success' | 'error';
} = {}): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const { startDate, endDate, type = 'all', uploadStatus = 'all' } = params;

  try {
    // ── 1. שיוך קבצים — Unlinked slaughter / production ──────────────────
    if (type === 'all' || type === 'file_matching') {
      const q1P: unknown[] = [];
      let q1W = '';
      if (startDate) { q1P.push(startDate); q1W += ` AND sb.date >= $${q1P.length}::date`; }
      if (endDate)   { q1P.push(endDate);   q1W += ` AND sb.date <= $${q1P.length}::date`; }

      const unlinkedSlaughter = await query(`
        SELECT sb.id, sb.date::text AS date, COALESCE(f.name_hebrew, f.name_english) AS factory_name
        FROM slaughter_batches sb
        JOIN factories f ON sb.factory_id = f.id
        LEFT JOIN work_orders wo ON wo.slaughter_batch_id = sb.id AND wo.production_data_id IS NOT NULL
        WHERE wo.id IS NULL ${q1W}
        ORDER BY sb.date DESC
      `, q1P);

      for (const r of unlinkedSlaughter.rows as any[]) {
        alerts.push({
          id: `fm-s-${r.id}`,
          name: 'דוח שחיטה ללא קישור ייצור',
          detail: `מפעל ${r.factory_name} | תאריך ${r.date}`,
          type: 'file_matching',
          type_label: 'שיוך קבצים',
          date: r.date,
          severity: 'warning',
        });
      }

      const q2P: unknown[] = [];
      let q2W = '';
      if (startDate) { q2P.push(startDate); q2W += ` AND pd.date >= $${q2P.length}::date`; }
      if (endDate)   { q2P.push(endDate);   q2W += ` AND pd.date <= $${q2P.length}::date`; }

      const unlinkedProduction = await query(`
        SELECT pd.id, pd.date::text AS date
        FROM production_data pd
        LEFT JOIN work_orders wo ON wo.production_data_id = pd.id AND wo.slaughter_batch_id IS NOT NULL
        WHERE wo.id IS NULL ${q2W}
        ORDER BY pd.date DESC
      `, q2P);

      for (const r of unlinkedProduction.rows as any[]) {
        alerts.push({
          id: `fm-p-${r.id}`,
          name: 'דוח ייצור ללא קישור שחיטה',
          detail: `תאריך ${r.date}`,
          type: 'file_matching',
          type_label: 'שיוך קבצים',
          date: r.date,
          severity: 'warning',
        });
      }
    }

    // ── 2. נתונים חריגים — Anomalies ─────────────────────────────────────
    if (type === 'all' || type === 'anomaly') {
      const q3P: unknown[] = [];
      let q3W = '';
      if (startDate) { q3P.push(startDate); q3W += ` AND sb.date >= $${q3P.length}::date`; }
      if (endDate)   { q3P.push(endDate);   q3W += ` AND sb.date <= $${q3P.length}::date`; }

      const anomalies = await query(`
        SELECT sb.id, sb.date::text AS date,
               COALESCE(f.name_hebrew, f.name_english) AS factory_name,
               sb.halak_count, sb.muchshar_count,
               pd.halak_quarters, pd.kosher_quarters
        FROM slaughter_batches sb
        JOIN factories f ON sb.factory_id = f.id
        JOIN work_orders wo ON wo.slaughter_batch_id = sb.id AND wo.production_data_id IS NOT NULL
        JOIN production_data pd ON pd.id = wo.production_data_id
        WHERE (sb.halak_count * 2 <> COALESCE(pd.halak_quarters, 0)
            OR sb.muchshar_count * 2 <> COALESCE(pd.kosher_quarters, 0)) ${q3W}
        ORDER BY sb.date DESC
      `, q3P);

      for (const r of anomalies.rows as any[]) {
        const hE = Number(r.halak_count) * 2;
        const hA = Number(r.halak_quarters) || 0;
        const mE = Number(r.muchshar_count) * 2;
        const mA = Number(r.kosher_quarters) || 0;
        const parts: string[] = [];
        if (hE !== hA) parts.push(`חלק: צפוי ${hE}, בפועל ${hA}`);
        if (mE !== mA) parts.push(`מוכשר: צפוי ${mE}, בפועל ${mA}`);

        alerts.push({
          id: `an-${r.id}`,
          name: 'אי התאמה ברבעים',
          detail: `${r.factory_name} | ${r.date} — ${parts.join(', ')}`,
          type: 'anomaly',
          type_label: 'נתונים חריגים',
          date: r.date,
          severity: 'error',
        });
      }
    }

    // ── 3. מפעלים — Factories without uploads for 7+ days ─────────────────
    if (type === 'all' || type === 'factory') {
      const inactive = await query(`
        SELECT f.id, COALESCE(f.name_hebrew, f.name_english) AS name,
               (SELECT MAX(il.created_at)::text FROM import_logs il WHERE il.factory_id = f.id) AS last_upload
        FROM factories f
        WHERE f.active = true
          AND NOT EXISTS (
            SELECT 1 FROM import_logs il
            WHERE il.factory_id = f.id
              AND il.created_at > NOW() - INTERVAL '7 days'
          )
        ORDER BY f.id
      `);

      for (const r of inactive.rows as any[]) {
        alerts.push({
          id: `fac-${r.id}`,
          name: 'מפעל ללא העלאה מעל שבוע',
          detail: `${r.name}${r.last_upload ? ` | העלאה אחרונה: ${r.last_upload.substring(0, 10)}` : ' | לא נמצאו העלאות'}`,
          type: 'factory',
          type_label: 'מפעלים',
          date: r.last_upload ? r.last_upload.substring(0, 10) : '',
          severity: 'warning',
        });
      }
    }

    // ── 4. העלאות — Upload logs ────────────────────────────────────────────
    if (type === 'all' || type === 'upload') {
      const q4P: unknown[] = [];
      let q4W = '';
      if (startDate)              { q4P.push(startDate);    q4W += ` AND il.created_at::date >= $${q4P.length}::date`; }
      if (endDate)                { q4P.push(endDate);      q4W += ` AND il.created_at::date <= $${q4P.length}::date`; }
      if (uploadStatus !== 'all') { q4P.push(uploadStatus); q4W += ` AND il.status = $${q4P.length}`; }

      const uploads = await query(`
        SELECT il.id, il.file_name, il.upload_type, il.status,
               COALESCE(il.rows_imported, 0) AS rows_imported,
               il.error_details,
               il.created_at::text AS created_at,
               COALESCE(f.name_hebrew, f.name_english, '-') AS factory_name
        FROM import_logs il
        LEFT JOIN factories f ON il.factory_id = f.id
        WHERE 1=1 ${q4W}
        ORDER BY il.id DESC
        LIMIT 200
      `, q4P);

      for (const r of uploads.rows as any[]) {
        const isErr = r.status === 'error';
        alerts.push({
          id: `up-${r.id}`,
          name: r.upload_type === 'slaughter' ? 'העלאת קובץ שחיטה' : r.upload_type === 'production' ? 'העלאת קובץ ייצור' : `העלאה: ${r.upload_type}`,
          detail: `${r.factory_name} | ${r.file_name} | ${r.rows_imported} שורות${isErr && r.error_details ? ` | שגיאה: ${r.error_details}` : ''}`,
          type: 'upload',
          type_label: 'העלאות',
          date: r.created_at ? r.created_at.substring(0, 10) : '',
          severity: isErr ? 'error' : 'info',
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}
