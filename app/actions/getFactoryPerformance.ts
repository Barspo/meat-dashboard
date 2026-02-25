'use server';

import { query } from '@/lib/db';

export async function getFactoryPerformance(startDate: string, endDate: string) {
  try {
    // 1. Get all active factories
    const factoriesResult = await query(`SELECT id, name, name_hebrew FROM factories WHERE active = true ORDER BY id ASC`);
    const factories = factoriesResult.rows;

    // 2. Slaughter stats per factory
    const sql = `
      SELECT
        factory_id,
        COUNT(id) as batches_count,
        SUM(cows_count + bulls_count) as total,
        SUM(cows_count) as cows,
        SUM(bulls_count) as bulls,
        SUM(halak_count) as halak,
        SUM(muchshar_count) as muchshar,
        SUM(COALESCE(waste_lungs, 0) + COALESCE(waste_inner, 0) + COALESCE(waste_outer, 0)) as waste_total,
        SUM(COALESCE(waste_lungs, 0)) as waste1,
        SUM(COALESCE(waste_inner, 0)) as waste2,
        SUM(COALESCE(waste_outer, 0)) as waste3
      FROM slaughter_batches
      WHERE date >= $1::date AND date <= $2::date
      GROUP BY factory_id
    `;

    const result = await query(sql, [startDate, endDate]);

    const statsMap = new Map();
    result.rows.forEach((row: any) => {
      statsMap.set(row.factory_id, row);
    });

    // 3. Merge
    const finalData = factories.map((factory: any) => {
      const stats = statsMap.get(factory.id) || {};

      return {
        id: factory.id.toString(),
        name: factory.name_hebrew || factory.name,
        total: Number(stats.total) || 0,
        cows: Number(stats.cows) || 0,
        bulls: Number(stats.bulls) || 0,
        halak: Number(stats.halak) || 0,
        muchshar: Number(stats.muchshar) || 0,
        wasteTotal: Number(stats.waste_total) || 0,
        waste1: Number(stats.waste1) || 0,
        waste2: Number(stats.waste2) || 0,
        waste3: Number(stats.waste3) || 0,
      };
    });

    return finalData;

  } catch (error) {
    console.error("Error fetching factory performance:", error);
    return [];
  }
}
