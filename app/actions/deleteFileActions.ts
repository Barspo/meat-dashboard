'use server';

import { query } from '@/lib/db';

export async function deleteSlaughterBatch(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete work_orders first (no DB cascade defined), then slaughter_batch
    await query(`DELETE FROM work_orders WHERE slaughter_batch_id = $1`, [id]);
    await query(`DELETE FROM slaughter_batches WHERE id = $1`, [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProductionData(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete production_records first
    await query(`DELETE FROM production_records WHERE production_data_id = $1`, [id]);
    // Remove work_order linking this production (slaughter batch remains intact)
    await query(`DELETE FROM work_orders WHERE production_data_id = $1`, [id]);
    // Delete production_data
    await query(`DELETE FROM production_data WHERE id = $1`, [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
