'use server';

import { query } from '@/lib/db';

export async function getFactories() {
  try {
    const result = await query(`SELECT factory_id, name FROM factories ORDER BY name ASC`);
    return result.rows.map((row: any) => ({
      id: row.factory_id.toString(),
      name: row.name
    }));
  } catch (error) {
    console.error("Error fetching factories:", error);
    return [];
  }
}

export async function getLastProductionDate(factoryId: string) {
  try {
    const sql = `
      SELECT db.date 
      FROM debone_batches db
      JOIN work_orders wo ON db.debone_id = wo.debone_id
      WHERE wo.factory_id = $1 
      ORDER BY db.date DESC 
      LIMIT 1
    `;
    const result = await query(sql, [parseInt(factoryId)]);
    return result.rows.length > 0 ? result.rows[0].date : null;
  } catch (error) {
    console.error("Error fetching last date:", error);
    return null;
  }
}

export async function getProductionData(factoryId: string, startDate: string, endDate: string) {
  try {
    // 1. נתונים מספריים
    const statsSql = `
      SELECT 
        pr.item_id,
        SUM(pr.weight_kg) as total_weight,
        SUM(pr.units) as total_units,
        SUM(pr.boxes) as total_boxes
      FROM production_records pr
      JOIN work_orders wo ON pr.work_id = wo.work_id
      JOIN debone_batches db ON wo.debone_id = db.debone_id
      WHERE wo.factory_id = $1
      AND db.date >= $2::date AND db.date <= $3::date
      GROUP BY pr.item_id
    `;
    
    const statsResult = await query(statsSql, [parseInt(factoryId), startDate, endDate]);
    const rawStats = statsResult.rows;

    if (rawStats.length === 0) {
      return { 
        summary: { days: 0, totalWeight: 0, totalUnits: 0, totalBoxes: 0, quarters: {halak:0, muchshar:0, total:0} },
        yields: { total: {in:0, out:0}, halak: {in:0, out:0}, muchshar: {in:0, out:0}, x9: {total:0, halak:0, muchshar:0}, steaks: {unitsHalak:0, unitsMuchshar:0, weight:0} },
        tableData: [],
        hasData: false 
      };
    }

    // 2. נתונים משלימים
    const inputSql = `
      SELECT 
        COUNT(DISTINCT db.date) as days_count,
        SUM(db.halak_quarters_in) as total_halak_quarters,
        SUM(db.kosher_quarters_in) as total_kosher_quarters,
        SUM(db.halak_kg_in) as total_halak_kg,
        SUM(db.kosher_kg_in) as total_kosher_kg
      FROM debone_batches db
      WHERE db.debone_id IN (SELECT debone_id FROM work_orders WHERE factory_id = $1)
      AND db.date >= $2::date AND db.date <= $3::date
    `;
    const inputResult = await query(inputSql, [parseInt(factoryId), startDate, endDate]);
    const inputRow = inputResult.rows[0] || {};

    const itemIds = rawStats.map((r: any) => `'${r.item_id}'`).join(',');
    const productsSql = `SELECT DISTINCT ON (item_id) * FROM products WHERE item_id IN (${itemIds})`;
    const productsResult = await query(productsSql);
    const productsMap = new Map();
    productsResult.rows.forEach((p: any) => productsMap.set(p.item_id, p));

    const kosherSql = `SELECT name, family FROM kosher_registry`;
    const kosherResult = await query(kosherSql);
    const kosherFamilyMap = new Map<string, string>();
    kosherResult.rows.forEach((k: any) => {
        if (k.name && k.family) kosherFamilyMap.set(k.name.trim().toLowerCase(), k.family.trim().toLowerCase());
    });

    // 3. עיבוד
    let totalWeight = 0;
    let totalUnits = 0;
    let totalBoxes = 0;
    
    let halakOutput = 0;
    let kosherOutput = 0;
    
    let x9WeightTotal = 0;
    let x9WeightHalak = 0;
    let x9WeightMuchshar = 0;
    
    let steakWeight = 0;
    let steakUnitsHalak = 0;
    let steakUnitsMuchshar = 0;

    const tableData = rawStats.map((stat: any) => {
        const item = productsMap.get(stat.item_id) || {};
        const w = Number(stat.total_weight) || 0;
        const u = Number(stat.total_units) || 0;
        const b = Number(stat.total_boxes) || 0;

        totalWeight += w;
        totalUnits += u;
        totalBoxes += b;

        // כשרות
        const productKosherType = String(item.kosher_type || '').trim().toLowerCase();
        const family = kosherFamilyMap.get(productKosherType) || 'unknown';
        const isHalak = family === 'halak';

        if (isHalak) halakOutput += w;
        else kosherOutput += w;

        // X9
        const isAnatomical = String(item.is_anatomical || '').trim().toLowerCase() === 'yes';
        if (isAnatomical) {
            x9WeightTotal += w;
            if (isHalak) x9WeightHalak += w;
            else x9WeightMuchshar += w;
        }

        // Steaks
        const isSteak = String(item.is_steak || '').trim().toLowerCase() === 'yes';
        if (isSteak) {
            steakWeight += w;
            if (isHalak) steakUnitsHalak += u;
            else steakUnitsMuchshar += u;
        }

        // --- תיקון טריות (The Fix) ---
        const rawFreshness = String(item.freshness || '').trim().toUpperCase();
        let displayFreshness = 'Frozen'; // ברירת מחדל
        // אם כתוב CHILLED או FRESH, נציג Fresh. כל השאר Frozen.
        if (rawFreshness.includes('CHILLED') || rawFreshness.includes('FRESH')) {
            displayFreshness = 'Fresh';
        }

        return {
            id: stat.item_id,
            name: item.name_hebrew || item.name_spanish || 'מוצר ללא שם',
            weight: w,
            units: u,
            boxes: b,
            kosher: isHalak ? 'Halak' : 'Muchshar',
            department: item.department || 'General',
            freshness: displayFreshness, // הערך המנורמל
            breed: item.breed || 'Angus',
            customer: item.customer || 'General',
            isX9: isAnatomical,
            isSteak: isSteak
        };
    });

    const inputHalakKg = Number(inputRow.total_halak_kg) || 0;
    const inputKosherKg = Number(inputRow.total_kosher_kg) || 0;

    return {
      summary: {
        days: Number(inputRow.days_count) || 0,
        totalWeight: totalWeight, 
        totalUnits: totalUnits,
        totalBoxes: totalBoxes,
        quarters: {
           halak: Number(inputRow.total_halak_quarters) || 0,
           muchshar: Number(inputRow.total_kosher_quarters) || 0,
           total: (Number(inputRow.total_halak_quarters) || 0) + (Number(inputRow.total_kosher_quarters) || 0)
        }
      },
      yields: {
          total: { in: inputHalakKg + inputKosherKg, out: totalWeight },
          halak: { in: inputHalakKg, out: halakOutput },
          muchshar: { in: inputKosherKg, out: kosherOutput },
          x9: { total: x9WeightTotal, halak: x9WeightHalak, muchshar: x9WeightMuchshar },
          steaks: { unitsHalak: steakUnitsHalak, unitsMuchshar: steakUnitsMuchshar, weight: steakWeight }
      },
      tableData: tableData,
      hasData: true
    };

  } catch (error) {
    console.error("❌ Error fetching production data:", error);
    return null;
  }
}