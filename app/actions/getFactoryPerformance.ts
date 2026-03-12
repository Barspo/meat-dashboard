'use server';

import { query } from '@/lib/db';

export async function getFactoryPerformance(startDate: string, endDate: string) {
  try {
    // 1. Get all active factories
    const factoriesResult = await query(
      `SELECT f.id, f.name_english, f.name_hebrew, c.name_hebrew AS country_name_hebrew
       FROM factories f
       LEFT JOIN countries c ON f.country_id = c.id
       WHERE f.active = true ORDER BY f.id ASC`
    );
    const factories = factoriesResult.rows;

    // 2. Slaughter stats per factory
    const sql = `
      SELECT
        factory_id,
        COUNT(id)                                                                AS batches_count,
        SUM(total_slaughtered)                                                     AS total,
        SUM(cows_count)                                                          AS cows,
        SUM(bulls_count)                                                         AS bulls,
        SUM(halak_count)                                                         AS halak,
        SUM(muchshar_count)                                                      AS muchshar,
        SUM(COALESCE(waste_count,0))                                                    AS waste_total,
        SUM(COALESCE(waste_lungs,0))                                             AS waste1,
        SUM(COALESCE(waste_inner,0))                                             AS waste2,
        SUM(COALESCE(waste_outer,0))                                             AS waste3
      FROM slaughter_batches
      WHERE date >= $1::date AND date <= $2::date
      GROUP BY factory_id
    `;
    const result = await query(sql, [startDate, endDate]);

    const statsMap = new Map<number, any>();
    result.rows.forEach((row: any) => statsMap.set(row.factory_id, row));

    // 3. Merge
    return factories.map((factory: any) => {
      const stats = statsMap.get(factory.id) || {};
      return {
        id: factory.id.toString(),
        name: factory.name_hebrew || factory.name_english,
        countryNameHebrew: factory.country_name_hebrew || null,
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
  } catch (error) {
    console.error('Error fetching factory performance:', error);
    return [];
  }
}
