export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const factoryId = searchParams.get('factoryId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!factoryId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing factoryId, startDate, or endDate' }, { status: 400 });
  }

  try {
    // 1a. Output KPIs (from production_records JOIN work_orders)
    const outputResult = await query(`
      SELECT
        COALESCE(SUM(pr.weight_kg), 0) as total_weight,
        COALESCE(SUM(pr.boxes), 0) as total_boxes,
        COUNT(DISTINCT wo.production_date) as work_days
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE wo.factory_id = $1
        AND wo.production_date BETWEEN $2::date AND $3::date
    `, [factoryId, startDate, endDate]);

    // 1b. Input KPIs (from work_orders alone — avoids JOIN duplication)
    const inputResult = await query(`
      SELECT
        COALESCE(SUM(halak_weight_in_kg + kosher_weight_in_kg), 0) as total_input_kg
      FROM work_orders
      WHERE factory_id = $1
        AND production_date BETWEEN $2::date AND $3::date
    `, [factoryId, startDate, endDate]);

    const kpi = { ...outputResult.rows[0], ...inputResult.rows[0] };
    const totalInput = Number(kpi.total_input_kg) || 0;
    const totalOutput = Number(kpi.total_weight) || 0;
    const yieldPct = totalInput > 0 ? Math.round((totalOutput / totalInput) * 1000) / 10 : 0;

    // 2. Daily production
    const dailyResult = await query(`
      SELECT TO_CHAR(wo.production_date, 'DD/MM') as date,
             COALESCE(SUM(pr.weight_kg), 0) as weight
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE wo.factory_id = $1
        AND wo.production_date BETWEEN $2::date AND $3::date
      GROUP BY wo.production_date
      ORDER BY wo.production_date
    `, [factoryId, startDate, endDate]);

    // 3. Top 5 products
    const topResult = await query(`
      SELECT COALESCE(p.name_hebrew, p.name_foreign) as name,
             COALESCE(SUM(pr.weight_kg), 0) as weight
      FROM production_records pr
      JOIN work_orders wo ON pr.work_order_id = wo.id
      JOIN products p ON pr.item_id = p.item_id
      WHERE wo.factory_id = $1
        AND wo.production_date BETWEEN $2::date AND $3::date
      GROUP BY p.name_hebrew, p.name_foreign
      ORDER BY weight DESC LIMIT 5
    `, [factoryId, startDate, endDate]);

    return NextResponse.json({
      kpi: { ...kpi, yield: yieldPct },
      daily: dailyResult.rows.map((r: any) => ({ ...r, weight: Number(r.weight) })),
      products: topResult.rows.map((r: any) => ({ ...r, weight: Number(r.weight) })),
    });

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
