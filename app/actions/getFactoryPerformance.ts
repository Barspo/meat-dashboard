'use server';

import { query } from '@/lib/db';

export async function getFactoryPerformance(startDate: string, endDate: string) {
  try {
    // 1. שליפת רשימת המפעלים
    const factoriesResult = await query(`SELECT factory_id, name FROM factories ORDER BY factory_id ASC`);
    const factories = factoriesResult.rows;

    // 2. שליפת נתוני שחיטה מסוכמים לפי שמות העמודות האמיתיים ב-DB שלך
    const sql = `
      SELECT 
        factory_id,
        COUNT(faena_id) as batches_count,
        -- חישוב סה"כ (פרות + שוורים)
        SUM(cow_count + bull_count) as total,
        
        -- פירוט ראשים
        SUM(cow_count) as cows,
        SUM(bull_count) as bulls,
        
        -- פירוט כשרות
        SUM(halak_count) as halak,
        SUM(kosher_count) as muchshar,
        
        -- חישוב סה"כ פחת (סכום של כל סוגי הריג'קטים)
        SUM(rejected_pulmon + rejected_panza + rejected_cajon) as waste_total,
        
        -- פירוט פחת לפי עמודות ה-DB
        SUM(rejected_pulmon) as waste1,  -- ריאות
        SUM(rejected_panza) as waste2,   -- כרס/פנים
        SUM(rejected_cajon) as waste3    -- חוץ/כללי
      FROM slaughter_batches
      WHERE date >= $1::date AND date <= $2::date
      GROUP BY factory_id
    `;

    const result = await query(sql, [startDate, endDate]);
    
    const statsMap = new Map();
    result.rows.forEach((row: any) => {
        statsMap.set(row.factory_id, row);
    });

    // 3. מיזוג הנתונים
    const finalData = factories.map((factory: any) => {
        const stats = statsMap.get(factory.factory_id) || {};
        
        return {
            id: factory.factory_id.toString(),
            name: factory.name,
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
    console.error("❌ Error fetching factory performance:", error);
    return [];
  }
}