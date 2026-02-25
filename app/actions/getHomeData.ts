'use server';

import { query } from '@/lib/db';
import { getAlerts } from './getAlerts';

export interface HomeData {
  activeFactories: number;
  recentSlaughterDays: { date: string; totalHeads: number; factories: string[] }[];
  recentProductionDays: { date: string; totalWeightKg: number; factories: string[] }[];
  recentUploads: {
    id: number;
    fileName: string;
    uploadType: string;
    factoryName: string;
    status: string;
    rowsImported: number;
  }[];
  alertCounts: { error: number; warning: number; info: number };
}

export async function getHomeData(): Promise<HomeData> {
  try {
    const [alertsList, factoriesRes, slaughterRes, productionRes, uploadsRes] = await Promise.all([
      getAlerts().catch(() => []),
      query(`SELECT COUNT(*) as cnt FROM factories WHERE active = true`),
      query(`
        SELECT sb.date::text, SUM(sb.cows_count + sb.bulls_count) as total_heads,
               ARRAY_AGG(DISTINCT COALESCE(f.name_hebrew, f.name)) as factories
        FROM slaughter_batches sb
        JOIN factories f ON sb.factory_id = f.id
        GROUP BY sb.date
        ORDER BY sb.date DESC
        LIMIT 3
      `),
      query(`
        SELECT wo.production_date::text as date,
               COALESCE(SUM(pr.weight_kg), 0) as total_weight,
               ARRAY_AGG(DISTINCT COALESCE(f.name_hebrew, f.name)) as factories
        FROM work_orders wo
        LEFT JOIN production_records pr ON wo.id = pr.work_order_id
        JOIN factories f ON wo.factory_id = f.id
        GROUP BY wo.production_date
        ORDER BY wo.production_date DESC
        LIMIT 3
      `),
      query(`
        SELECT il.id, il.file_name, il.upload_type,
               COALESCE(il.status, 'unknown') as status,
               COALESCE(il.rows_imported, 0) as rows_imported,
               COALESCE(f.name_hebrew, f.name, '-') as factory_name
        FROM import_logs il
        LEFT JOIN factories f ON il.factory_id = f.id
        ORDER BY il.id DESC
        LIMIT 10
      `),
    ]);

    const alertCounts = alertsList.reduce(
      (acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; },
      { error: 0, warning: 0, info: 0 } as Record<string, number>
    );

    return {
      activeFactories: Number(factoriesRes.rows[0]?.cnt) || 0,
      recentSlaughterDays: slaughterRes.rows.map((r: any) => ({
        date: r.date,
        totalHeads: Number(r.total_heads) || 0,
        factories: Array.isArray(r.factories) ? r.factories.filter(Boolean) : [],
      })),
      recentProductionDays: productionRes.rows.map((r: any) => ({
        date: r.date,
        totalWeightKg: Number(r.total_weight) || 0,
        factories: Array.isArray(r.factories) ? r.factories.filter(Boolean) : [],
      })),
      recentUploads: uploadsRes.rows.map((r: any) => ({
        id: r.id,
        fileName: r.file_name,
        uploadType: r.upload_type,
        factoryName: r.factory_name || '-',
        status: r.status,
        rowsImported: Number(r.rows_imported) || 0,
      })),
      alertCounts: {
        error: alertCounts.error || 0,
        warning: alertCounts.warning || 0,
        info: alertCounts.info || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      activeFactories: 0,
      recentSlaughterDays: [],
      recentProductionDays: [],
      recentUploads: [],
      alertCounts: { error: 0, warning: 0, info: 0 },
    };
  }
}
