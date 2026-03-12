'use server';

import { query } from '@/lib/db';

// ─── Update Slaughter Batch ───────────────────────────────────────────────────

export interface UpdateSlaughterData {
  date: string;
  factory_id: number;
  total_slaughtered: number;
  cows_count: number;
  bulls_count: number;
  halak_count: number;
  muchshar_count: number;
  waste_count: number;
  waste_lungs: number;
  waste_inner: number;
  waste_outer: number;
}

export async function updateSlaughterBatch(
  id: number,
  data: UpdateSlaughterData
): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `UPDATE slaughter_batches SET
        date            = $1::date,
        factory_id      = $2,
        total_slaughtered = $3,
        cows_count      = $4,
        bulls_count     = $5,
        halak_count     = $6,
        muchshar_count  = $7,
        waste_count     = $8,
        waste_lungs     = $9,
        waste_inner     = $10,
        waste_outer     = $11
       WHERE id = $12`,
      [
        data.date, data.factory_id,
        data.total_slaughtered, data.cows_count, data.bulls_count,
        data.halak_count, data.muchshar_count,
        data.waste_count, data.waste_lungs, data.waste_inner, data.waste_outer,
        id,
      ]
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Update Production Data ───────────────────────────────────────────────────

export interface UpdateProductionData {
  date: string;
  halak_quarters: number;
  kosher_quarters: number;
  halak_weight_kg: number;
  kosher_weight_kg: number;
}

export async function updateProductionData(
  id: number,
  data: UpdateProductionData
): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `UPDATE production_data SET
        date             = $1::date,
        halak_quarters   = $2,
        kosher_quarters  = $3,
        halak_weight_kg  = $4,
        kosher_weight_kg = $5
       WHERE id = $6`,
      [
        data.date,
        data.halak_quarters, data.kosher_quarters,
        data.halak_weight_kg, data.kosher_weight_kg,
        id,
      ]
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Link / Unlink ────────────────────────────────────────────────────────────
// Manages the slaughter ↔ production connection via work_orders table.
// productionDataId=null → unlink only.

export async function setSlaughterProductionLink(
  slaughterBatchId: number,
  productionDataId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remove existing production link for this slaughter batch
    await query(
      `UPDATE work_orders SET production_data_id = NULL
       WHERE slaughter_batch_id = $1 AND production_data_id IS NOT NULL`,
      [slaughterBatchId]
    );

    if (productionDataId !== null) {
      // 2. Remove existing slaughter link on the target production record
      await query(
        `UPDATE work_orders SET slaughter_batch_id = NULL
         WHERE production_data_id = $1 AND slaughter_batch_id IS NOT NULL`,
        [productionDataId]
      );

      // 3. Link: reuse existing work_order for this slaughter batch or insert new one
      const existing = await query(
        `SELECT id FROM work_orders WHERE slaughter_batch_id = $1 LIMIT 1`,
        [slaughterBatchId]
      );
      if (existing.rows.length > 0) {
        await query(
          `UPDATE work_orders SET production_data_id = $1 WHERE slaughter_batch_id = $2`,
          [productionDataId, slaughterBatchId]
        );
      } else {
        await query(
          `INSERT INTO work_orders (slaughter_batch_id, production_data_id) VALUES ($1, $2)`,
          [slaughterBatchId, productionDataId]
        );
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Available Production Data (for slaughter edit modal) ────────────────────

export interface AvailableProductionOption {
  id: number;
  date: string;
  halak_quarters: number | null;
  kosher_quarters: number | null;
}

export async function getAvailableProductionData(
  excludeCurrentlyLinkedToSlaughter?: number
): Promise<AvailableProductionOption[]> {
  const result = await query(
    `SELECT pd.id, pd.date::text AS date, pd.halak_quarters, pd.kosher_quarters
     FROM production_data pd
     WHERE NOT EXISTS (
       SELECT 1 FROM work_orders wo
       WHERE wo.production_data_id = pd.id
         AND wo.slaughter_batch_id IS NOT NULL
         AND ($1::int IS NULL OR wo.slaughter_batch_id <> $1)
     )
     ORDER BY pd.date DESC
     LIMIT 30`,
    [excludeCurrentlyLinkedToSlaughter ?? null]
  );
  return result.rows.map((r: any) => ({
    ...r,
    halak_quarters: r.halak_quarters != null ? Number(r.halak_quarters) : null,
    kosher_quarters: r.kosher_quarters != null ? Number(r.kosher_quarters) : null,
  }));
}
