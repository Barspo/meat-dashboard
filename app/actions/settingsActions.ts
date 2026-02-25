'use server';

import { query } from '@/lib/db';

// ==================== FACTORIES ====================

export interface Factory {
  id: number;
  name: string | null;
  name_hebrew: string | null;
  country: string | null;
  factory_code: string | null;
  active: boolean;
}

export async function getFactories(): Promise<Factory[]> {
  const result = await query('SELECT id, name, name_hebrew, country, factory_code, active FROM factories ORDER BY name ASC');
  return result.rows;
}

export async function createFactory(data: { name: string; name_hebrew: string; country: string; factory_code: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO factories (name, name_hebrew, country, factory_code, active) VALUES ($1, $2, $3, $4, true)',
      [data.name, data.name_hebrew, data.country, data.factory_code]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFactory(id: number, data: { name: string; name_hebrew: string; country: string; factory_code: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE factories SET name = $1, name_hebrew = $2, country = $3, factory_code = $4 WHERE id = $5',
      [data.name, data.name_hebrew, data.country, data.factory_code, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFactory(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for references
    const refs = await query('SELECT COUNT(*) as cnt FROM slaughter_batches WHERE factory_id = $1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק מפעל עם נתוני שחיטה קיימים' };
    }
    await query('DELETE FROM factories WHERE id = $1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== PRODUCTS ====================

export interface Product {
  item_id: string;
  name_foreign: string | null;
  name_hebrew: string | null;
  department: string | null;
  freshness: string | null;
  breed: string | null;
  is_anatomical: boolean | null;
  is_steak: boolean | null;
  kosher_id: number | null;
  kosher_type_name?: string | null;  // from JOIN (display only)
  customer_id: number | null;
  customer_name?: string | null;
  bone_waste_percentage: number | null;
  active: boolean | null;
}

export async function getProducts(): Promise<Product[]> {
  const result = await query(
    `SELECT p.item_id, p.name_foreign, p.name_hebrew, p.department, p.freshness, p.breed,
            p.is_anatomical, p.is_steak, p.kosher_id, p.customer_id, p.bone_waste_percentage, p.active,
            kf.name_hebrew as kosher_type_name,
            c.name_hebrew as customer_name
     FROM products p
     LEFT JOIN kosher_families kf ON p.kosher_id = kf.id
     LEFT JOIN customers c ON p.customer_id = c.id
     ORDER BY p.item_id ASC`
  );
  return result.rows;
}

export async function createProduct(data: {
  item_id: string; name_foreign: string; name_hebrew: string; department: string;
  freshness: string; breed: string;
  is_anatomical: boolean; is_steak: boolean; kosher_id: number | null; customer_id: number | null;
  bone_waste_percentage: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `INSERT INTO products (item_id, name_foreign, name_hebrew, department, freshness, breed, is_anatomical, is_steak, kosher_id, customer_id, bone_waste_percentage, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
      [data.item_id, data.name_foreign, data.name_hebrew, data.department, data.freshness, data.breed, data.is_anatomical, data.is_steak, data.kosher_id, data.customer_id, data.bone_waste_percentage]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProduct(itemId: string, data: {
  name_foreign: string; name_hebrew: string; department: string;
  freshness: string; breed: string;
  is_anatomical: boolean; is_steak: boolean; kosher_id: number | null; customer_id: number | null;
  bone_waste_percentage: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `UPDATE products SET name_foreign = $1, name_hebrew = $2, department = $3, freshness = $4, breed = $5,
              is_anatomical = $6, is_steak = $7, kosher_id = $8, customer_id = $9, bone_waste_percentage = $10
       WHERE item_id = $11`,
      [data.name_foreign, data.name_hebrew, data.department, data.freshness, data.breed, data.is_anatomical, data.is_steak, data.kosher_id, data.customer_id, data.bone_waste_percentage, itemId]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM production_records WHERE item_id = $1', [itemId]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק מוצר עם רשומות ייצור קיימות' };
    }
    await query('DELETE FROM products WHERE item_id = $1', [itemId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== KOSHER FAMILIES ====================

export interface KosherEntry {
  id: number;
  name: string | null;
  family: string | null;
  name_hebrew: string | null;
  family_hebrew: string | null;
}

export async function getKosherRegistry(): Promise<KosherEntry[]> {
  const result = await query('SELECT id, name, family, name_hebrew, family_hebrew FROM kosher_families ORDER BY family ASC, name ASC');
  return result.rows;
}

export async function createKosherEntry(data: { name: string; family: string; name_hebrew: string; family_hebrew: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO kosher_families (name, family, name_hebrew, family_hebrew) VALUES ($1, $2, $3, $4)',
      [data.name, data.family, data.name_hebrew, data.family_hebrew]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKosherEntry(id: number, data: { name: string; family: string; name_hebrew: string; family_hebrew: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE kosher_families SET name = $1, family = $2, name_hebrew = $3, family_hebrew = $4 WHERE id = $5',
      [data.name, data.family, data.name_hebrew, data.family_hebrew, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKosherEntry(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await query('DELETE FROM kosher_families WHERE id = $1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== CUSTOMERS ====================

export interface Customer {
  id: number;
  name: string | null;
  name_hebrew: string | null;
  active: boolean | null;
}

export async function getCustomers(): Promise<Customer[]> {
  const result = await query('SELECT id, name, name_hebrew, active FROM customers ORDER BY name ASC');
  return result.rows;
}

export async function createCustomer(data: { name: string; name_hebrew: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO customers (name, name_hebrew, active) VALUES ($1, $2, true)',
      [data.name, data.name_hebrew]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: number, data: { name: string; name_hebrew: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE customers SET name = $1, name_hebrew = $2 WHERE id = $3',
      [data.name, data.name_hebrew, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM products WHERE customer_id = $1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק לקוח עם מוצרים מקושרים' };
    }
    await query('DELETE FROM customers WHERE id = $1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== SEASONS ====================

export interface Season {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_active: boolean;
}

export async function getSeasons(): Promise<Season[]> {
  const result = await query(
    `SELECT id, name, start_date::text, end_date::text, is_active
     FROM seasons
     ORDER BY start_date DESC`
  );
  return result.rows;
}

export async function createSeason(data: {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ($1, $2::date, $3::date, $4)',
      [data.name, data.start_date, data.end_date, data.is_active]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSeason(id: number, data: {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE seasons SET name = $1, start_date = $2::date, end_date = $3::date, is_active = $4 WHERE id = $5',
      [data.name, data.start_date, data.end_date, data.is_active, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSeason(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await query('DELETE FROM seasons WHERE id = $1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
