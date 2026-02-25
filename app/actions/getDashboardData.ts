'use server';

import { query } from '@/lib/db';

export interface DashboardData {
  kpis: {
    slaughterDays: number;
    totalSlaughtered: number;
    totalProductionKg: number;
    activeFactories: number;
    wastePercent: number;
    totalWaste: number;
  };
  trendData: { date: string; weight: number }[];
  kosherData: { name: string; value: number }[];
  factoryData: { name: string; production: number }[];
  recentBatches: {
    date: string;
    factoryName: string;
    totalHeads: number;
    halak: number;
    kosher: number;
  }[];
}

export async function getDashboardData(): Promise<DashboardData | null> {
  try {
    // 1. KPIs from slaughter_batches
    const kpiSql = `
      SELECT
        (SELECT COUNT(DISTINCT date) FROM slaughter_batches WHERE date >= CURRENT_DATE - INTERVAL '30 days') as slaughter_days,
        (SELECT COALESCE(SUM(cows_count + bulls_count), 0) FROM slaughter_batches WHERE date >= CURRENT_DATE - INTERVAL '30 days') as total_slaughtered,
        (SELECT COALESCE(SUM(pr.weight_kg), 0)
         FROM production_records pr
         JOIN work_orders wo ON pr.work_order_id = wo.id
         WHERE wo.production_date >= CURRENT_DATE - INTERVAL '30 days') as total_production_kg,
        (SELECT COUNT(DISTINCT wo.factory_id)
         FROM work_orders wo
         WHERE wo.production_date >= CURRENT_DATE - INTERVAL '30 days') as active_factories,
        (SELECT COALESCE(SUM(COALESCE(waste_lungs, 0) + COALESCE(waste_inner, 0) + COALESCE(waste_outer, 0)), 0) FROM slaughter_batches WHERE date >= CURRENT_DATE - INTERVAL '30 days') as total_waste,
        (SELECT COALESCE(SUM(cows_count + bulls_count), 0) FROM slaughter_batches WHERE date >= CURRENT_DATE - INTERVAL '30 days') as total_heads_for_waste
    `;
    const kpiResult = await query(kpiSql);
    const kpiRow = kpiResult.rows[0] || {};
    const totalHeadsForWaste = Number(kpiRow.total_heads_for_waste) || 0;
    const totalWaste = Number(kpiRow.total_waste) || 0;

    // 2. Daily production trend
    const trendSql = `
      SELECT TO_CHAR(wo.production_date, 'DD/MM') as date, COALESCE(SUM(pr.weight_kg), 0) as weight
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE wo.production_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY wo.production_date
      ORDER BY wo.production_date ASC
    `;
    const trendResult = await query(trendSql);

    // 3. Kosher split
    const kosherSql = `
      SELECT
        CASE WHEN kf.family = 'Halak' THEN 'חלק' ELSE 'מוכשר' END as name,
        COALESCE(SUM(pr.weight_kg), 0) as value
      FROM production_records pr
      JOIN products p ON pr.item_id = p.item_id
      JOIN kosher_families kf ON p.kosher_id = kf.id
      JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE wo.production_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY kf.family
    `;
    const kosherResult = await query(kosherSql);

    // 4. Factory production
    const factorySql = `
      SELECT COALESCE(f.name_hebrew, f.name) as name, COALESCE(SUM(pr.weight_kg), 0) as production
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      JOIN factories f ON wo.factory_id = f.id
      WHERE wo.production_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY f.name_hebrew, f.name
      ORDER BY production DESC
    `;
    const factoryResult = await query(factorySql);

    // 5. Recent slaughter batches
    const recentSql = `
      SELECT sb.date, COALESCE(f.name_hebrew, f.name) as factory_name,
        sb.cows_count + sb.bulls_count as total_heads,
        sb.halak_count, sb.muchshar_count
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      ORDER BY sb.date DESC
      LIMIT 5
    `;
    const recentResult = await query(recentSql);

    return {
      kpis: {
        slaughterDays: Number(kpiRow.slaughter_days) || 0,
        totalSlaughtered: Number(kpiRow.total_slaughtered) || 0,
        totalProductionKg: Number(kpiRow.total_production_kg) || 0,
        activeFactories: Number(kpiRow.active_factories) || 0,
        wastePercent: totalHeadsForWaste > 0 ? Math.round((totalWaste / totalHeadsForWaste) * 1000) / 10 : 0,
        totalWaste,
      },
      trendData: trendResult.rows.map((r: any) => ({
        date: r.date,
        weight: Number(r.weight) || 0,
      })),
      kosherData: kosherResult.rows.map((r: any) => ({
        name: r.name,
        value: Number(r.value) || 0,
      })),
      factoryData: factoryResult.rows.map((r: any) => ({
        name: r.name,
        production: Number(r.production) || 0,
      })),
      recentBatches: recentResult.rows.map((r: any) => ({
        date: new Date(r.date).toLocaleDateString('he-IL'),
        factoryName: r.factory_name,
        totalHeads: Number(r.total_heads) || 0,
        halak: Number(r.halak_count) || 0,
        kosher: Number(r.muchshar_count) || 0,
      })),
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
}
