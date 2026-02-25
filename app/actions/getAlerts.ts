'use server';

import { query } from '@/lib/db';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';
export type AlertCategory = 'waste' | 'production' | 'slaughter' | 'system';

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
}

export async function getAlerts(): Promise<Alert[]> {
  try {
    const alerts: Alert[] = [];

    // 1. Check waste % per factory over last 30 days (threshold: >15% = error, >12% = warning)
    const wasteSql = `
      SELECT
        COALESCE(f.name_hebrew, f.name) as factory_name,
        COALESCE(SUM(sb.cows_count + sb.bulls_count), 0) as total_heads,
        COALESCE(SUM(COALESCE(sb.waste_lungs, 0) + COALESCE(sb.waste_inner, 0) + COALESCE(sb.waste_outer, 0)), 0) as total_waste
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      WHERE sb.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY f.id, f.name, f.name_hebrew
      HAVING COALESCE(SUM(sb.cows_count + sb.bulls_count), 0) > 0
    `;
    const wasteResult = await query(wasteSql);
    for (const row of wasteResult.rows) {
      const heads = Number(row.total_heads);
      const waste = Number(row.total_waste);
      const pct = heads > 0 ? (waste / heads) * 100 : 0;
      if (pct > 15) {
        alerts.push({
          id: `waste-error-${row.factory_name}`,
          severity: 'error',
          category: 'waste',
          title: 'חריגת פחת קריטית',
          message: `אחוז הפחת עומד על ${pct.toFixed(1)}% — מעל הסף המותר של 15%`,
          factoryName: row.factory_name,
          date: new Date().toLocaleDateString('he-IL'),
          value: pct,
          threshold: 15,
        });
      } else if (pct > 12) {
        alerts.push({
          id: `waste-warn-${row.factory_name}`,
          severity: 'warning',
          category: 'waste',
          title: 'התראת פחת',
          message: `אחוז הפחת מתקרב לסף — ${pct.toFixed(1)}% (הסף הוא 15%)`,
          factoryName: row.factory_name,
          date: new Date().toLocaleDateString('he-IL'),
          value: pct,
          threshold: 15,
        });
      }
    }

    // 2. Factories with slaughter but no production in last 7 days
    const missingProdSql = `
      SELECT COALESCE(f.name_hebrew, f.name) as factory_name, MAX(sb.date) as last_slaughter
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      WHERE sb.date >= CURRENT_DATE - INTERVAL '7 days'
        AND f.id NOT IN (
          SELECT DISTINCT wo.factory_id
          FROM work_orders wo
          WHERE wo.production_date >= CURRENT_DATE - INTERVAL '7 days'
        )
      GROUP BY f.id, f.name, f.name_hebrew
    `;
    const missingResult = await query(missingProdSql);
    for (const row of missingResult.rows) {
      alerts.push({
        id: `no-prod-${row.factory_name}`,
        severity: 'warning',
        category: 'production',
        title: 'חסר דוח ייצור',
        message: `לא הועלו נתוני ייצור ב-7 ימים האחרונים. שחיטה אחרונה: ${new Date(row.last_slaughter).toLocaleDateString('he-IL')}`,
        factoryName: row.factory_name,
        date: new Date().toLocaleDateString('he-IL'),
      });
    }

    // 3. Steak yield out of 10%-13% target (last 7 days)
    const steakSql = `
      SELECT
        COALESCE(f.name_hebrew, f.name) as factory_name,
        COALESCE(SUM(CASE WHEN p.is_anatomical IS TRUE THEN pr.weight_kg ELSE 0 END), 0) as x9_weight,
        COALESCE(SUM(CASE WHEN p.is_steak = true THEN pr.weight_kg ELSE 0 END), 0) as steak_weight
      FROM production_records pr
      JOIN products p ON pr.item_id = p.item_id
      JOIN work_orders wo ON pr.work_order_id = wo.id
      JOIN factories f ON wo.factory_id = f.id
      WHERE wo.production_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY f.id, f.name, f.name_hebrew
      HAVING COALESCE(SUM(CASE WHEN p.is_anatomical IS TRUE THEN pr.weight_kg ELSE 0 END), 0) > 0
    `;
    const steakResult = await query(steakSql);
    for (const row of steakResult.rows) {
      const x9 = Number(row.x9_weight);
      const steak = Number(row.steak_weight);
      const steakPct = x9 > 0 ? (steak / x9) * 100 : 0;
      if (steakPct > 0 && (steakPct < 10 || steakPct > 13)) {
        const tooLow = steakPct < 10;
        alerts.push({
          id: `steak-${row.factory_name}`,
          severity: 'warning',
          category: 'production',
          title: `אחוז סטייקים ${tooLow ? 'נמוך מדי' : 'גבוה מדי'}`,
          message: `אחוז הסטייקים מ-X9 הוא ${steakPct.toFixed(1)}% — היעד הוא 10%–13%`,
          factoryName: row.factory_name,
          date: new Date().toLocaleDateString('he-IL'),
          value: steakPct,
        });
      }
    }

    // 4. If no production data at all in last 7 days — info alert
    const lastProdSql = `
      SELECT COUNT(*) as cnt FROM work_orders
      WHERE production_date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const lastProdResult = await query(lastProdSql);
    if (Number(lastProdResult.rows[0]?.cnt) === 0) {
      alerts.push({
        id: 'no-recent-production',
        severity: 'info',
        category: 'system',
        title: 'אין נתוני ייצור אחרונים',
        message: 'לא הועלו נתוני ייצור ב-7 ימים האחרונים. ודא שהקבצים הועלו.',
        date: new Date().toLocaleDateString('he-IL'),
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}
