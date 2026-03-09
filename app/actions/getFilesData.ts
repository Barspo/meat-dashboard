'use server';

import { query } from '@/lib/db';

export interface FactoryOption {
  id: number;
  name: string;
  country_name: string | null;
}

export interface SlaughterBatchRow {
  id: number;
  factory_id: number;
  factory_name: string;
  country_name: string | null;
  date: string;
  total_slaughtered: number;
  cows_count: number;
  bulls_count: number;
  halak_count: number;
  muchshar_count: number;
  waste_lungs: number;
  waste_inner: number;
  waste_outer: number;
  waste_total: number;
  linked_production_id: number | null;
  linked_production_date: string | null;
}

export interface ProductionDataRow {
  id: number;
  date: string;
  halak_quarters: number | null;
  kosher_quarters: number | null;
  halak_weight_kg: number | null;
  kosher_weight_kg: number | null;
  linked_slaughter_id: number | null;
  linked_slaughter_date: string | null;
  factory_id: number | null;
  factory_name: string | null;
}

export interface FilesData {
  factories: FactoryOption[];
  slaughterBatches: SlaughterBatchRow[];
  productionData: ProductionDataRow[];
}

export async function getFilesData(startDate: string, endDate: string): Promise<FilesData> {
  const [factoriesResult, slaughterResult, productionResult] = await Promise.all([
    query(`
      SELECT f.id, COALESCE(f.name_hebrew, f.name_english) AS name, c.name_hebrew AS country_name
      FROM factories f
      LEFT JOIN countries c ON f.country_id = c.id
      WHERE f.active = true
      ORDER BY f.id ASC
    `),
    query(`
      SELECT
        sb.id,
        sb.factory_id,
        COALESCE(f.name_hebrew, f.name_english) AS factory_name,
        c.name_hebrew AS country_name,
        sb.date::text AS date,
        sb.total_slaughtered,
        sb.cows_count,
        sb.bulls_count,
        sb.halak_count,
        sb.muchshar_count,
        COALESCE(sb.waste_lungs, 0) AS waste_lungs,
        COALESCE(sb.waste_inner, 0) AS waste_inner,
        COALESCE(sb.waste_outer, 0) AS waste_outer,
        (COALESCE(sb.waste_lungs,0) + COALESCE(sb.waste_inner,0) + COALESCE(sb.waste_outer,0)) AS waste_total,
        wo.production_data_id AS linked_production_id,
        pd.date::text AS linked_production_date
      FROM slaughter_batches sb
      JOIN factories f ON sb.factory_id = f.id
      LEFT JOIN countries c ON f.country_id = c.id
      LEFT JOIN work_orders wo ON wo.slaughter_batch_id = sb.id
      LEFT JOIN production_data pd ON pd.id = wo.production_data_id
      WHERE sb.date >= $1::date AND sb.date <= $2::date
      ORDER BY sb.date DESC, COALESCE(f.name_hebrew, f.name_english) ASC
    `, [startDate, endDate]),
    query(`
      SELECT
        pd.id,
        pd.date::text AS date,
        pd.halak_quarters,
        pd.kosher_quarters,
        pd.halak_weight_kg,
        pd.kosher_weight_kg,
        wo.slaughter_batch_id AS linked_slaughter_id,
        sb.date::text AS linked_slaughter_date,
        sb.factory_id,
        COALESCE(f.name_hebrew, f.name_english) AS factory_name
      FROM production_data pd
      LEFT JOIN work_orders wo ON wo.production_data_id = pd.id
      LEFT JOIN slaughter_batches sb ON sb.id = wo.slaughter_batch_id
      LEFT JOIN factories f ON f.id = sb.factory_id
      WHERE pd.date >= $1::date AND pd.date <= $2::date
      ORDER BY pd.date DESC
    `, [startDate, endDate]),
  ]);

  return {
    factories: factoriesResult.rows as FactoryOption[],
    slaughterBatches: slaughterResult.rows.map((r: any) => ({
      ...r,
      total_slaughtered: Number(r.total_slaughtered) || 0,
      cows_count: Number(r.cows_count) || 0,
      bulls_count: Number(r.bulls_count) || 0,
      halak_count: Number(r.halak_count) || 0,
      muchshar_count: Number(r.muchshar_count) || 0,
      waste_lungs: Number(r.waste_lungs) || 0,
      waste_inner: Number(r.waste_inner) || 0,
      waste_outer: Number(r.waste_outer) || 0,
      waste_total: Number(r.waste_total) || 0,
      linked_production_id: r.linked_production_id ? Number(r.linked_production_id) : null,
    })),
    productionData: productionResult.rows.map((r: any) => ({
      ...r,
      halak_quarters: r.halak_quarters != null ? Number(r.halak_quarters) : null,
      kosher_quarters: r.kosher_quarters != null ? Number(r.kosher_quarters) : null,
      halak_weight_kg: r.halak_weight_kg != null ? Number(r.halak_weight_kg) : null,
      kosher_weight_kg: r.kosher_weight_kg != null ? Number(r.kosher_weight_kg) : null,
      linked_slaughter_id: r.linked_slaughter_id ? Number(r.linked_slaughter_id) : null,
      factory_id: r.factory_id ? Number(r.factory_id) : null,
    })),
  };
}
