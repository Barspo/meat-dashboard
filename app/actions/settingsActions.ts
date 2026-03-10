'use server';

import { query } from '@/lib/db';

// ==================== COUNTRIES ====================

export interface Country {
  id: number;
  name_english: string;
  name_hebrew: string;
}

export async function getCountries(): Promise<Country[]> {
  const result = await query(
    'SELECT id, name_english, name_hebrew FROM countries ORDER BY name_hebrew ASC'
  );
  return result.rows;
}

export async function createCountry(data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('INSERT INTO countries (name_english, name_hebrew) VALUES ($1, $2)', [data.name_english, data.name_hebrew]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCountry(id: number, data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE countries SET name_english=$1, name_hebrew=$2 WHERE id=$3', [data.name_english, data.name_hebrew, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCountry(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const factoryRefs = await query('SELECT COUNT(*) as cnt FROM factories WHERE country_id=$1', [id]);
    if (Number(factoryRefs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק — יש מפעלים המשויכים למדינה זו' };
    }
    const productRefs = await query('SELECT COUNT(*) as cnt FROM products WHERE country_id=$1', [id]);
    if (Number(productRefs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק — יש מוצרים המשויכים למדינה זו' };
    }
    await query('DELETE FROM countries WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== FACTORIES ====================

export interface Factory {
  id: number;
  name_english: string;
  name_hebrew: string;
  country_id: number | null;
  factory_code: string | null;
  active: boolean;
  country_name_english?: string | null;
  country_name_hebrew?: string | null;
}

export async function getFactories(): Promise<Factory[]> {
  const result = await query(`
    SELECT f.id, f.name_english, f.name_hebrew, f.country_id, f.factory_code, f.active,
           c.name_english AS country_name_english, c.name_hebrew AS country_name_hebrew
    FROM factories f
    LEFT JOIN countries c ON f.country_id = c.id
    ORDER BY f.name_hebrew ASC
  `);
  return result.rows;
}

export async function createFactory(data: {
  name_english: string; name_hebrew: string; country_id: number | null; factory_code: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO factories (name_english, name_hebrew, country_id, factory_code, active) VALUES ($1, $2, $3, $4, true)',
      [data.name_english, data.name_hebrew, data.country_id || null, data.factory_code]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFactory(id: number, data: {
  name_english: string; name_hebrew: string; country_id: number | null; factory_code: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE factories SET name_english=$1, name_hebrew=$2, country_id=$3, factory_code=$4 WHERE id=$5',
      [data.name_english, data.name_hebrew, data.country_id || null, data.factory_code, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleFactoryActive(id: number, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE factories SET active=$1 WHERE id=$2', [active, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== DEPARTMENTS ====================

export interface Department {
  id: number;
  name_english: string;
  name_hebrew: string;
}

export async function getDepartments(): Promise<Department[]> {
  const result = await query('SELECT id, name_english, name_hebrew FROM departments ORDER BY name_hebrew ASC');
  return result.rows;
}

export async function createDepartment(data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('INSERT INTO departments (name_english, name_hebrew) VALUES ($1, $2)', [data.name_english, data.name_hebrew]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDepartment(id: number, data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE departments SET name_english=$1, name_hebrew=$2 WHERE id=$3', [data.name_english, data.name_hebrew, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDepartment(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM products WHERE department_id=$1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק מחלקה עם מוצרים מקושרים' };
    }
    await query('DELETE FROM departments WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== PRODUCTS ====================

export interface Product {
  id: number;
  item_id: string;
  name_hebrew: string;
  name_foreign: string | null;
  department_id: number;
  freshness: boolean;
  kosher_type_id: number;
  customer_id: number;
  breed_id: number;
  country_id: number;
  is_steak: boolean;
  is_anatomical: boolean;
  bone_waste_percentage: number;
  // joined
  department_name_hebrew?: string | null;
  department_name_english?: string | null;
  kosher_type_name_hebrew?: string | null;
  kosher_family_name_english?: string | null;
  kosher_family_name_hebrew?: string | null;
  customer_name_hebrew?: string | null;
  breed_name_hebrew?: string | null;
  country_name_hebrew?: string | null;
  country_name_english?: string | null;
}

export async function getProducts(): Promise<Product[]> {
  const result = await query(`
    SELECT p.id, p.item_id, p.name_hebrew, p.name_foreign,
           p.department_id, p.freshness, p.kosher_type_id,
           p.customer_id, p.breed_id, p.country_id,
           p.is_steak, p.is_anatomical, p.bone_waste_percentage,
           d.name_hebrew   AS department_name_hebrew,
           d.name_english  AS department_name_english,
           kt.name_hebrew  AS kosher_type_name_hebrew,
           kf.name_english AS kosher_family_name_english,
           kf.name_hebrew  AS kosher_family_name_hebrew,
           cu.name_hebrew  AS customer_name_hebrew,
           br.name_hebrew  AS breed_name_hebrew,
           cn.name_hebrew  AS country_name_hebrew,
           cn.name_english AS country_name_english
    FROM products p
    LEFT JOIN departments d    ON p.department_id  = d.id
    LEFT JOIN kosher_types kt  ON p.kosher_type_id = kt.id
    LEFT JOIN kosher_families kf ON kt.family_id   = kf.id
    LEFT JOIN customers cu     ON p.customer_id    = cu.id
    LEFT JOIN breeds br        ON p.breed_id       = br.id
    LEFT JOIN countries cn     ON p.country_id     = cn.id
    ORDER BY p.item_id ASC
  `);
  return result.rows;
}

export async function createProduct(data: {
  item_id: string; name_hebrew: string; name_foreign: string;
  department_id: number; freshness: boolean; kosher_type_id: number;
  customer_id: number; breed_id: number; country_id: number;
  is_steak: boolean; is_anatomical: boolean; bone_waste_percentage: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `INSERT INTO products
         (item_id, name_hebrew, name_foreign, department_id, freshness, kosher_type_id,
          customer_id, breed_id, country_id, is_steak, is_anatomical, bone_waste_percentage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [data.item_id, data.name_hebrew, data.name_foreign, data.department_id, data.freshness,
       data.kosher_type_id, data.customer_id, data.breed_id, data.country_id,
       data.is_steak, data.is_anatomical, data.bone_waste_percentage]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProduct(itemId: string, data: {
  name_hebrew: string; name_foreign: string;
  department_id: number; freshness: boolean; kosher_type_id: number;
  customer_id: number; breed_id: number; country_id: number;
  is_steak: boolean; is_anatomical: boolean; bone_waste_percentage: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `UPDATE products SET name_hebrew=$1, name_foreign=$2, department_id=$3, freshness=$4,
         kosher_type_id=$5, customer_id=$6, breed_id=$7, country_id=$8,
         is_steak=$9, is_anatomical=$10, bone_waste_percentage=$11
       WHERE item_id=$12`,
      [data.name_hebrew, data.name_foreign, data.department_id, data.freshness,
       data.kosher_type_id, data.customer_id, data.breed_id, data.country_id,
       data.is_steak, data.is_anatomical, data.bone_waste_percentage, itemId]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== BREEDS ====================

export interface Breed {
  id: number;
  name_english: string;
  name_hebrew: string;
}

export async function getBreeds(): Promise<Breed[]> {
  const result = await query('SELECT id, name_english, name_hebrew FROM breeds ORDER BY name_hebrew ASC');
  return result.rows;
}

export async function createBreed(data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('INSERT INTO breeds (name_english, name_hebrew) VALUES ($1, $2)', [data.name_english, data.name_hebrew]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBreed(id: number, data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE breeds SET name_english=$1, name_hebrew=$2 WHERE id=$3', [data.name_english, data.name_hebrew, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBreed(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM products WHERE breed_id=$1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק זן עם מוצרים מקושרים' };
    }
    await query('DELETE FROM breeds WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== KOSHER FAMILIES ====================

export interface KosherFamily {
  id: number;
  name_english: string;
  name_hebrew: string;
}

export async function getKosherFamilies(): Promise<KosherFamily[]> {
  const result = await query('SELECT id, name_english, name_hebrew FROM kosher_families ORDER BY name_english ASC');
  return result.rows;
}

export async function createKosherFamily(data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('INSERT INTO kosher_families (name_english, name_hebrew) VALUES ($1, $2)', [data.name_english, data.name_hebrew]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKosherFamily(id: number, data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE kosher_families SET name_english=$1, name_hebrew=$2 WHERE id=$3', [data.name_english, data.name_hebrew, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKosherFamily(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM kosher_types WHERE family_id=$1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק משפחה עם סוגי כשרות מקושרים' };
    }
    await query('DELETE FROM kosher_families WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== KOSHER TYPES ====================

export interface KosherType {
  id: number;
  name_english: string;
  name_hebrew: string;
  family_id: number;
  family_name_hebrew?: string | null;
  family_name_english?: string | null;
}

export async function getKosherTypes(): Promise<KosherType[]> {
  const result = await query(`
    SELECT kt.id, kt.name_english, kt.name_hebrew, kt.family_id,
           kf.name_hebrew  AS family_name_hebrew,
           kf.name_english AS family_name_english
    FROM kosher_types kt
    JOIN kosher_families kf ON kt.family_id = kf.id
    ORDER BY kf.name_english ASC, kt.name_english ASC
  `);
  return result.rows;
}

export async function createKosherType(data: {
  name_english: string; name_hebrew: string; family_id: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO kosher_types (name_english, name_hebrew, family_id) VALUES ($1, $2, $3)',
      [data.name_english, data.name_hebrew, data.family_id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKosherType(id: number, data: {
  name_english: string; name_hebrew: string; family_id: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE kosher_types SET name_english=$1, name_hebrew=$2, family_id=$3 WHERE id=$4',
      [data.name_english, data.name_hebrew, data.family_id, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKosherType(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refs = await query('SELECT COUNT(*) as cnt FROM products WHERE kosher_type_id=$1', [id]);
    if (Number(refs.rows[0].cnt) > 0) {
      return { success: false, error: 'לא ניתן למחוק — יש מוצרים משויכים לסוג כשרות זה' };
    }
    await query('DELETE FROM kosher_types WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== CUSTOMERS ====================

export interface Customer {
  id: number;
  name_english: string;
  name_hebrew: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const result = await query('SELECT id, name_english, name_hebrew FROM customers ORDER BY name_hebrew ASC');
  return result.rows;
}

export async function createCustomer(data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('INSERT INTO customers (name_english, name_hebrew) VALUES ($1, $2)', [data.name_english, data.name_hebrew]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: number, data: {
  name_english: string; name_hebrew: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query('UPDATE customers SET name_english=$1, name_hebrew=$2 WHERE id=$3', [data.name_english, data.name_hebrew, id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== SEASONS ====================

export interface Season {
  id: number;
  name_hebrew: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export async function getSeasons(): Promise<Season[]> {
  const result = await query(
    `SELECT id, name_hebrew, start_date::text, end_date::text, is_current
     FROM seasons
     ORDER BY start_date DESC`
  );
  return result.rows.map((r: any) => ({ ...r, is_current: Boolean(r.is_current) }));
}

export async function createSeason(data: {
  name_hebrew: string; start_date: string; end_date: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'INSERT INTO seasons (name_hebrew, start_date, end_date, is_current) VALUES ($1, $2::date, $3::date, false)',
      [data.name_hebrew, data.start_date, data.end_date]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSeason(id: number, data: {
  name_hebrew: string; start_date: string; end_date: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      'UPDATE seasons SET name_hebrew=$1, start_date=$2::date, end_date=$3::date WHERE id=$4',
      [data.name_hebrew, data.start_date, data.end_date, id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setCurrentSeason(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: unset all current seasons
    await query('UPDATE seasons SET is_current = false WHERE is_current = true');
    // Step 2: set the target season as current
    await query('UPDATE seasons SET is_current = true WHERE id = $1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSeason(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await query('DELETE FROM seasons WHERE id=$1', [id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
