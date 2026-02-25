'use server';

import { query } from '@/lib/db';

export async function getFactories() {
  try {
    const result = await query(`SELECT id, name, name_hebrew FROM factories WHERE active = true ORDER BY name ASC`);
    return result.rows.map((row: any) => ({
      id: row.id.toString(),
      name: row.name_hebrew || row.name
    }));
  } catch (error) {
    console.error("Error fetching factories:", error);
    return [];
  }
}

export async function getLastProductionDate(factoryId: string) {
  try {
    const sql = `
      SELECT wo.production_date as date
      FROM work_orders wo
      WHERE wo.factory_id = $1
      ORDER BY wo.production_date DESC
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
    // 1. Production stats by item
    const statsSql = `
      SELECT
        pr.item_id,
        SUM(pr.weight_kg) as total_weight,
        SUM(pr.units) as total_units,
        SUM(pr.boxes) as total_boxes
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE wo.factory_id = $1
      AND wo.production_date >= $2::date AND wo.production_date <= $3::date
      GROUP BY pr.item_id
    `;
    const statsResult = await query(statsSql, [parseInt(factoryId), startDate, endDate]);
    const rawStats = statsResult.rows;

    if (rawStats.length === 0) {
      return {
        summary: { days: 0, totalWeight: 0, totalUnits: 0, totalBoxes: 0, quarters: { halak: 0, muchshar: 0, total: 0 } },
        yields: { total: { in: 0, out: 0 }, halak: { in: 0, out: 0 }, muchshar: { in: 0, out: 0 }, x9: { total: 0, halak: 0, muchshar: 0 }, steaks: { unitsHalak: 0, unitsMuchshar: 0, weight: 0 } },
        tableData: [],
        hasData: false
      };
    }

    // 2. Input data from work_orders
    const inputSql = `
      SELECT
        COUNT(DISTINCT wo.production_date) as days_count,
        COALESCE(SUM(wo.halak_quarters_in), 0) as total_halak_quarters,
        COALESCE(SUM(wo.kosher_quarters_in), 0) as total_kosher_quarters,
        COALESCE(SUM(wo.halak_weight_in_kg), 0) as total_halak_kg,
        COALESCE(SUM(wo.kosher_weight_in_kg), 0) as total_kosher_kg
      FROM work_orders wo
      WHERE wo.factory_id = $1
      AND wo.production_date >= $2::date AND wo.production_date <= $3::date
    `;
    const inputResult = await query(inputSql, [parseInt(factoryId), startDate, endDate]);
    const inputRow = inputResult.rows[0] || {};

    // 3. Product info — JOIN kosher_families via kosher_id, and customers
    const itemIds = rawStats.map((r: any) => r.item_id);
    const productsSql = `
      SELECT
        p.item_id, p.name_hebrew, p.name_foreign,
        p.department, p.freshness, p.breed,
        p.is_steak, p.is_anatomical,
        p.customer_id,
        kf.id     AS kosher_id,
        kf.name   AS kosher_type_name,
        kf.name_hebrew AS kosher_type_hebrew,
        kf.family AS kosher_family,
        kf.family_hebrew AS kosher_family_hebrew,
        c.name_hebrew AS customer_name_hebrew,
        c.name        AS customer_name
      FROM products p
      LEFT JOIN kosher_families kf ON p.kosher_id = kf.id
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.item_id = ANY($1)
    `;
    const productsResult = await query(productsSql, [itemIds]);
    const productsMap = new Map<string, any>();
    productsResult.rows.forEach((p: any) => productsMap.set(p.item_id, p));

    // 4. Process
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

      // Kosher family from JOIN: 'halak' or 'muchshar' (or empty)
      const family = String(item.kosher_family || '').trim().toLowerCase();
      const isHalak = family === 'halak';

      if (isHalak) halakOutput += w;
      else kosherOutput += w;

      const isAnatomical = item.is_anatomical === true;
      if (isAnatomical) {
        x9WeightTotal += w;
        if (isHalak) x9WeightHalak += w;
        else x9WeightMuchshar += w;
      }

      const isSteak = item.is_steak === true;
      if (isSteak) {
        steakWeight += w;
        if (isHalak) steakUnitsHalak += u;
        else steakUnitsMuchshar += u;
      }

      const customerName = item.customer_name_hebrew || item.customer_name || 'כללי';

      return {
        id: stat.item_id,
        name: item.name_hebrew || item.name_foreign || 'מוצר ללא שם',
        weight: w,
        units: u,
        boxes: b,
        kosher: isHalak ? 'Halak' : 'Muchshar',
        kosherFamily: item.kosher_family_hebrew || item.kosher_family || '',
        kosherType: item.kosher_type_hebrew || item.kosher_type_name || '',
        department: item.department || '',
        freshness: item.freshness || '',
        breed: item.breed || '',
        customer: customerName,
        isX9: isAnatomical,
        isSteak: isSteak
      };
    });

    const inputHalakKg = Number(inputRow.total_halak_kg) || 0;
    const inputKosherKg = Number(inputRow.total_kosher_kg) || 0;

    return {
      summary: {
        days: Number(inputRow.days_count) || 0,
        totalWeight,
        totalUnits,
        totalBoxes,
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
      tableData,
      hasData: true
    };

  } catch (error) {
    console.error("Error fetching production data:", error);
    return null;
  }
}
