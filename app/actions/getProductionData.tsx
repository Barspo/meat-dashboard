'use server';

import { query } from '@/lib/db';

export async function getFactories() {
  try {
    const result = await query(`
      SELECT f.id, f.name_english, f.name_hebrew, c.name_hebrew AS country_name_hebrew
      FROM factories f
      LEFT JOIN countries c ON f.country_id = c.id
      WHERE f.active = true ORDER BY f.name_hebrew ASC
    `);
    return result.rows.map((row: any) => ({
      id: row.id.toString(),
      name: row.name_hebrew || row.name_english,
      countryNameHebrew: row.country_name_hebrew || null,
    }));
  } catch (error) {
    console.error('Error fetching factories:', error);
    return [];
  }
}

export async function getLastProductionDate(factoryId: string) {
  try {
    const sql = `
      SELECT pd.date
      FROM production_data pd
      JOIN work_orders wo ON wo.production_data_id = pd.id
      JOIN slaughter_batches sb ON wo.slaughter_batch_id = sb.id
      WHERE sb.factory_id = $1
      ORDER BY pd.date DESC
      LIMIT 1
    `;
    const result = await query(sql, [parseInt(factoryId)]);
    return result.rows.length > 0 ? result.rows[0].date : null;
  } catch (error) {
    console.error('Error fetching last date:', error);
    return null;
  }
}

export async function getProductionData(factoryId: string, startDate: string, endDate: string) {
  try {
    // 1. Production stats by item (new join path: pr → pd → wo → sb → factory)
    const statsSql = `
      SELECT
        pr.product_id,
        SUM(pr.weight_kg) AS total_weight,
        SUM(pr.units)     AS total_units,
        SUM(pr.boxes)     AS total_boxes
      FROM production_records pr
      JOIN production_data pd   ON pr.production_data_id = pd.id
      JOIN work_orders wo       ON wo.production_data_id = pd.id
      JOIN slaughter_batches sb ON wo.slaughter_batch_id = sb.id
      WHERE sb.factory_id = $1
        AND pd.date >= $2::date
        AND pd.date <= $3::date
      GROUP BY pr.product_id
    `;
    const statsResult = await query(statsSql, [parseInt(factoryId), startDate, endDate]);
    const rawStats = statsResult.rows;

    if (rawStats.length === 0) {
      return {
        summary: {
          days: 0, totalWeight: 0, totalUnits: 0, unitsMenakar: 0, totalBoxes: 0,
          quarters: { halak: 0, muchshar: 0, total: 0 },
        },
        yields: {
          total: { in: 0, out: 0 },
          halak: { in: 0, out: 0 },
          muchshar: { in: 0, out: 0 },
          x9: { total: 0, halak: 0, muchshar: 0 },
          steaks: { unitsHalak: 0, unitsMuchshar: 0, weight: 0 },
        },
        tableData: [],
        hasData: false,
      };
    }

    // 2. Input data from production_data (via new joins)
    const inputSql = `
      SELECT
        COUNT(DISTINCT pd.date)            AS days_count,
        COALESCE(SUM(pd.halak_quarters),  0) AS total_halak_quarters,
        COALESCE(SUM(pd.kosher_quarters), 0) AS total_kosher_quarters,
        COALESCE(SUM(pd.halak_weight_kg), 0) AS total_halak_kg,
        COALESCE(SUM(pd.kosher_weight_kg),0) AS total_kosher_kg
      FROM production_data pd
      JOIN work_orders wo       ON wo.production_data_id = pd.id
      JOIN slaughter_batches sb ON wo.slaughter_batch_id = sb.id
      WHERE sb.factory_id = $1
        AND pd.date >= $2::date
        AND pd.date <= $3::date
    `;
    const inputResult = await query(inputSql, [parseInt(factoryId), startDate, endDate]);
    const inputRow = inputResult.rows[0] || {};

    // 3. Product info — JOIN departments, kosher_types → kosher_families, customers, breeds
    const productIds = rawStats.map((r: any) => r.product_id);
    const productsSql = `
      SELECT
        p.id, p.item_id, p.name_hebrew, p.name_foreign,
        p.freshness, p.is_steak, p.is_anatomical,
        p.customer_id,
        d.name_english  AS department_english,
        d.name_hebrew   AS department_hebrew,
        kt.id            AS kosher_type_id,
        kt.name_english  AS kosher_type_name,
        kt.name_hebrew   AS kosher_type_hebrew,
        kf.name_english  AS kosher_family,
        kf.name_hebrew   AS kosher_family_hebrew,
        c.name_hebrew    AS customer_name_hebrew,
        c.name_english   AS customer_name,
        br.name_hebrew   AS breed_name
      FROM products p
      LEFT JOIN departments d    ON p.department_id  = d.id
      LEFT JOIN kosher_types kt  ON p.kosher_type_id = kt.id
      LEFT JOIN kosher_families kf ON kt.family_id   = kf.id
      LEFT JOIN customers c      ON p.customer_id    = c.id
      LEFT JOIN breeds br        ON p.breed_id       = br.id
      WHERE p.id = ANY($1::int[])
    `;
    const productsResult = await query(productsSql, [productIds]);
    const productsMap = new Map<number, any>();
    productsResult.rows.forEach((p: any) => productsMap.set(p.id, p));

    // 4. Process
    let totalWeight = 0;
    let totalUnits = 0;
    let unitsMenakar = 0;
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
      const item = productsMap.get(stat.product_id) || {};
      const w = Number(stat.total_weight) || 0;
      const u = Number(stat.total_units) || 0;
      const b = Number(stat.total_boxes) || 0;

      totalWeight += w;
      totalUnits += u;
      totalBoxes += b;

      // menaker dept: check departments.name_english
      const deptEnglish = String(item.department_english || '').trim().toLowerCase();
      if (deptEnglish === 'menaker') unitsMenakar += u;

      // Kosher family: kosher_families.name_english ('halak' or 'muchshar')
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
      // freshness: boolean true=fresh, false=frozen
      const freshnessLabel = item.freshness === true ? 'fresh' : item.freshness === false ? 'frozen' : '';

      return {
        id: stat.product_id,
        name: item.name_hebrew || item.name_foreign || 'מוצר ללא שם',
        weight: w,
        units: u,
        boxes: b,
        kosher: isHalak ? 'Halak' : 'Muchshar',
        kosherFamily: item.kosher_family_hebrew || item.kosher_family || '',
        kosherType: item.kosher_type_hebrew || item.kosher_type_name || '',
        department: item.department_hebrew || item.department_english || '',
        departmentEnglish: item.department_english || '',
        freshness: freshnessLabel,
        breed: item.breed_name || '',
        customer: customerName,
        isX9: isAnatomical,
        isSteak: isSteak,
      };
    });

    const inputHalakKg = Number(inputRow.total_halak_kg) || 0;
    const inputKosherKg = Number(inputRow.total_kosher_kg) || 0;

    return {
      summary: {
        days: Number(inputRow.days_count) || 0,
        totalWeight,
        totalUnits,
        unitsMenakar,
        totalBoxes,
        quarters: {
          halak: Number(inputRow.total_halak_quarters) || 0,
          muchshar: Number(inputRow.total_kosher_quarters) || 0,
          total: (Number(inputRow.total_halak_quarters) || 0) + (Number(inputRow.total_kosher_quarters) || 0),
        },
      },
      yields: {
        total: { in: inputHalakKg + inputKosherKg, out: totalWeight },
        halak: { in: inputHalakKg, out: halakOutput },
        muchshar: { in: inputKosherKg, out: kosherOutput },
        x9: { total: x9WeightTotal, halak: x9WeightHalak, muchshar: x9WeightMuchshar },
        steaks: { unitsHalak: steakUnitsHalak, unitsMuchshar: steakUnitsMuchshar, weight: steakWeight },
      },
      tableData,
      hasData: true,
    };
  } catch (error) {
    console.error('Error fetching production data:', error);
    return null;
  }
}
