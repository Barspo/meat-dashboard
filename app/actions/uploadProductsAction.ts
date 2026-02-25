'use server';

import * as XLSX from 'xlsx';
import { query } from '@/lib/db';

// ==================== TYPES ====================

export interface ProductRowPreview {
  row: number;
  item_id: string;
  name_hebrew: string;
  name_foreign: string;
  kosher_name: string;
  kosher_id: number | null;
  department: string;
  is_anatomical: boolean;
  is_steak: boolean;
  freshness: string;
  breed: string;
  bone_waste_percentage: number | null;
  customer_name: string;
  customer_id: number | null;
  hasError: boolean;
  errorMsg: string;
  isWarning: boolean;
  warningMsg: string;
}

export interface ProductsPreviewResult {
  rows: ProductRowPreview[];
  globalErrors: string[];
  totalRows: number;
  errorCount: number;
  warningCount: number;
}

export interface ProductsUploadResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: string[];
}

// ==================== CONSTANTS ====================

const VALID_DEPARTMENTS = ['carne', 'carne con hueso', 'menaker', 'menudencias'];
const VALID_FRESHNESS = ['fresh', 'frozen', 'טרי', 'קפוא'];
const FRESHNESS_NORMALIZE: Record<string, string> = {
  'fresh': 'fresh', 'טרי': 'fresh',
  'frozen': 'frozen', 'קפוא': 'frozen',
};

// ==================== HELPERS ====================

function parseBool(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'כן' || s === 'x' || s === '✓' || s === 'v';
}

function toOptNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function normDept(val: any): string {
  if (!val) return '';
  return String(val).toLowerCase().trim();
}

function normFreshness(val: any): string {
  if (!val) return '';
  const s = String(val).toLowerCase().trim();
  return FRESHNESS_NORMALIZE[s] ?? s;
}

// ==================== CORE PARSE & VALIDATE ====================

async function parseAndValidate(base64: string): Promise<{ rows: ProductRowPreview[]; globalErrors: string[] }> {
  const globalErrors: string[] = [];
  const rows: ProductRowPreview[] = [];

  // Load Excel
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return { rows, globalErrors: ['נכשל בפענוח הקובץ'] };
  }

  let jsonData: any[][];
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
  } catch {
    return { rows, globalErrors: ['הקובץ אינו קובץ Excel תקין'] };
  }

  if (jsonData.length < 2) {
    return { rows, globalErrors: ['הקובץ ריק או מכיל רק שורת כותרת'] };
  }

  // Load kosher map (id → name lookup by name)
  const kosherRes = await query('SELECT id, name, name_hebrew FROM kosher_families');
  const kosherMap = new Map<string, number>();
  for (const r of kosherRes.rows) {
    if (r.name) kosherMap.set(String(r.name).toLowerCase().trim(), r.id);
    if (r.name_hebrew) kosherMap.set(String(r.name_hebrew).toLowerCase().trim(), r.id);
  }

  // Load customer map
  const customerRes = await query('SELECT id, name, name_hebrew FROM customers WHERE active = true');
  const customerMap = new Map<string, number>();
  for (const r of customerRes.rows) {
    if (r.name) customerMap.set(String(r.name).toLowerCase().trim(), r.id);
    if (r.name_hebrew) customerMap.set(String(r.name_hebrew).toLowerCase().trim(), r.id);
  }

  // Detect columns from header row
  const headerRow = (jsonData[0] || []).map((h: any) => String(h ?? '').toLowerCase().trim());
  const col = detectProductColumns(headerRow);

  // Parse rows
  for (let i = 1; i < jsonData.length; i++) {
    const raw = jsonData[i];
    if (!raw || raw.length === 0) continue;
    const hasData = raw.some((c: any) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    const item_id = String(raw[col.item_id] ?? '').trim();
    const name_hebrew = String(raw[col.name_hebrew] ?? '').trim();
    const name_foreign = String(raw[col.name_foreign] ?? '').trim();
    const kosher_raw = String(raw[col.kosher] ?? '').trim();
    const dept_raw = normDept(raw[col.department]);
    const is_anatomical = parseBool(raw[col.is_anatomical]);
    const is_steak = parseBool(raw[col.is_steak]);
    const freshness_raw = normFreshness(raw[col.freshness]);
    const breed = String(raw[col.breed] ?? '').trim();
    const bone_waste = toOptNum(raw[col.bone_waste]);
    const customer_raw = String(raw[col.customer] ?? '').trim();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!item_id) errors.push('ברקוד חסר');
    if (!name_hebrew) errors.push('שם עברי חסר');

    // Resolve kosher
    const kosher_id = kosher_raw ? (kosherMap.get(kosher_raw.toLowerCase()) ?? null) : null;
    if (!kosher_raw) {
      errors.push('כשרות חסרה');
    } else if (kosher_id === null) {
      errors.push(`כשרות לא מוכרת: "${kosher_raw}"`);
    }

    // Validate department
    const dept_normalized = dept_raw;
    if (dept_raw && !VALID_DEPARTMENTS.includes(dept_raw)) {
      warnings.push(`מחלקה לא מוכרת: "${dept_raw}" (יישמר כפי שהוא)`);
    }

    // Validate freshness
    if (freshness_raw && !VALID_FRESHNESS.includes(freshness_raw)) {
      warnings.push(`ריענון לא מוכר: "${freshness_raw}" (יישמר כפי שהוא)`);
    }

    // Resolve customer (optional)
    let customer_id: number | null = null;
    if (customer_raw) {
      customer_id = customerMap.get(customer_raw.toLowerCase()) ?? null;
      if (customer_id === null) {
        warnings.push(`לקוח לא מוכר: "${customer_raw}" — יישמר כריק`);
      }
    }

    rows.push({
      row: i + 1,
      item_id,
      name_hebrew,
      name_foreign,
      kosher_name: kosher_raw,
      kosher_id,
      department: dept_normalized,
      is_anatomical,
      is_steak,
      freshness: freshness_raw,
      breed,
      bone_waste_percentage: bone_waste,
      customer_name: customer_raw,
      customer_id,
      hasError: errors.length > 0,
      errorMsg: errors.join('; '),
      isWarning: warnings.length > 0,
      warningMsg: warnings.join('; '),
    });
  }

  return { rows, globalErrors };
}

function detectProductColumns(header: string[]): Record<string, number> {
  // Default positional mapping (column order as specified)
  // item_id | name_hebrew | name_foreign | kosher | department | is_anatomical | is_steak | freshness | breed | bone_waste | customer
  const defaults = {
    item_id: 0, name_hebrew: 1, name_foreign: 2, kosher: 3,
    department: 4, is_anatomical: 5, is_steak: 6, freshness: 7,
    breed: 8, bone_waste: 9, customer: 10,
  };

  if (!header || header.length === 0) return defaults;

  const map = { ...defaults };

  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (h.includes('item') || h.includes('barcode') || h.includes('ean') || h.includes('ברקוד') || h.includes('קוד')) map.item_id = i;
    else if (h.includes('עברי') || h.includes('hebrew') || h.includes('name_heb')) map.name_hebrew = i;
    else if (h.includes('לועזי') || h.includes('foreign') || h.includes('name_for') || h.includes('español') || h.includes('nombre')) map.name_foreign = i;
    else if (h.includes('כשרות') || h.includes('kosher') || h.includes('koshер')) map.kosher = i;
    else if (h.includes('מחלקה') || h.includes('department') || h.includes('dept')) map.department = i;
    else if (h.includes('x9') || h.includes('anatomic') || h.includes('אנטומי')) map.is_anatomical = i;
    else if (h.includes('סטייק') || h.includes('steak')) map.is_steak = i;
    else if (h.includes('ריענון') || h.includes('freshness') || h.includes('fresh') || h.includes('frozen')) map.freshness = i;
    else if (h.includes('זן') || h.includes('breed') || h.includes('raza')) map.breed = i;
    else if (h.includes('עצם') || h.includes('bone') || h.includes('waste') || h.includes('hueso')) map.bone_waste = i;
    else if (h.includes('לקוח') || h.includes('customer') || h.includes('cliente')) map.customer = i;
  }

  return map;
}

// ==================== EXPORTED SERVER ACTIONS ====================

export async function previewProductsUpload(base64: string): Promise<ProductsPreviewResult> {
  const { rows, globalErrors } = await parseAndValidate(base64);
  return {
    rows,
    globalErrors,
    totalRows: rows.length,
    errorCount: rows.filter(r => r.hasError).length,
    warningCount: rows.filter(r => r.isWarning).length,
  };
}

export async function uploadProducts(base64: string): Promise<ProductsUploadResult> {
  const { rows, globalErrors } = await parseAndValidate(base64);

  if (globalErrors.length > 0) {
    return { success: false, inserted: 0, skipped: 0, errors: globalErrors };
  }

  const validRows = rows.filter(r => !r.hasError);
  if (validRows.length === 0) {
    return { success: false, inserted: 0, skipped: rows.length, errors: ['אין שורות תקינות להעלאה'] };
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of validRows) {
    try {
      const res = await query(
        `INSERT INTO products
           (item_id, name_foreign, name_hebrew, department, freshness, breed,
            is_anatomical, is_steak, kosher_id, customer_id, bone_waste_percentage, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
         ON CONFLICT (item_id) DO NOTHING`,
        [r.item_id, r.name_foreign || null, r.name_hebrew, r.department || null,
         r.freshness || null, r.breed || null, r.is_anatomical, r.is_steak,
         r.kosher_id, r.customer_id, r.bone_waste_percentage]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
      else skipped++;
    } catch (err: any) {
      errors.push(`שורה ${r.row} (${r.item_id}): ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    skipped,
    errors,
  };
}
