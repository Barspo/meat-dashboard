export const dynamic = 'force-dynamic'; // <--- הוספנו את זה
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const factoryId = searchParams.get('factoryId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // אם לא נבחר מפעל, לא מחזירים כלום
  if (!factoryId) {
    return NextResponse.json({ error: 'Missing factoryId' }, { status: 400 });
  }

  try {
    // 1. נתונים כלליים (KPIs)
    const kpiQuery = await query(`
      SELECT 
        SUM(pr.weight_kg) as total_weight,
        SUM(pr.boxes) as total_boxes,
        COUNT(DISTINCT w.work_id) as work_days,
        ROUND((SUM(pr.weight_kg) / NULLIF((SELECT SUM(halak_kg_in + kosher_kg_in) 
          FROM debone_batches db 
          JOIN work_orders wo ON db.debone_id = wo.debone_id 
          WHERE wo.factory_id = $1 AND db.date BETWEEN $2 AND $3), 0)) * 100, 1) as yield
      FROM production_records pr
      JOIN work_orders w ON pr.work_id = w.work_id
      JOIN slaughter_batches sb ON w.faena_id = sb.faena_id
      WHERE w.factory_id = $1 AND sb.date BETWEEN $2 AND $3
    `, [factoryId, startDate, endDate]);

    // 2. גרף ייצור יומי
    const dailyQuery = await query(`
      SELECT TO_CHAR(sb.date, 'DD/MM') as date, SUM(pr.weight_kg) as weight
      FROM production_records pr
      JOIN work_orders w ON pr.work_id = w.work_id
      JOIN slaughter_batches sb ON w.faena_id = sb.faena_id
      WHERE w.factory_id = $1 AND sb.date BETWEEN $2 AND $3
      GROUP BY sb.date ORDER BY sb.date
    `, [factoryId, startDate, endDate]);

    // 3. טופ 5 מוצרים
    const topProductsQuery = await query(`
      SELECT p.name_hebrew as name, SUM(pr.weight_kg) as weight
      FROM production_records pr
      JOIN work_orders w ON pr.work_id = w.work_id
      JOIN slaughter_batches sb ON w.faena_id = sb.faena_id
      JOIN products p ON pr.item_id = p.item_id
      WHERE w.factory_id = $1 AND sb.date BETWEEN $2 AND $3
      GROUP BY p.name_hebrew
      ORDER BY weight DESC LIMIT 5
    `, [factoryId, startDate, endDate]);

    return NextResponse.json({
      kpi: kpiQuery.rows[0],
      daily: dailyQuery.rows.map((r: any) => ({ ...r, weight: Number(r.weight) })),
      products: topProductsQuery.rows.map((r: any) => ({ ...r, weight: Number(r.weight) }))
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}