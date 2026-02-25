import * as XLSX from 'xlsx';

// ==================== TYPES ====================

export interface SlaughterRow {
  date: string;           // YYYY-MM-DD
  cows_count: number;
  bulls_count: number;
  total_heads: number;    // calculated: cows + bulls
  halak_count: number;
  muchshar_count: number;
  waste_lungs: number;
  waste_inner: number;
  waste_outer: number;
  // treif_count is NOT stored — it is total_heads - halak_count - muchshar_count (computed)
}

export interface ProductionHeader {
  halak_quarters_in: number;
  kosher_quarters_in: number;
  halak_weight_in_kg: number;
  kosher_weight_in_kg: number;
}

export interface ProductionRow {
  item_id: string;
  units: number;
  boxes: number;
  weight_kg: number;
  row_number: number;     // original row in the Excel
}

export interface ParsedSlaughterData {
  rows: SlaughterRow[];
  errors: string[];
}

export interface ParsedProductionData {
  header: ProductionHeader;
  rows: ProductionRow[];
  productionDate: string | null;
  errors: string[];
}

// ==================== HELPERS ====================

function parseDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // Try to parse string dates
  const str = String(val).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Try DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // Try MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  // Try Excel serial number
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return null;
}

function toNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ==================== SLAUGHTER PARSER ====================
// Expected columns: Date | Cows | Bulls | Halak | Muchshar | Treif | Waste Lungs | Waste Inner | Waste Outer
// Column names may be in Spanish: Fecha | Vacas | Toros | Halak | Kosher | Rej.Pulmon | Rej.Panza | Rej.Cajon

export function parseSlaughterExcel(buffer: ArrayBuffer): ParsedSlaughterData {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];

  const rows: SlaughterRow[] = [];
  const errors: string[] = [];

  if (jsonData.length < 2) {
    errors.push('File is empty or has only a header row');
    return { rows, errors };
  }

  // Try to detect header row and column mapping
  const headerRow = jsonData[0] || [];
  const colMap = detectSlaughterColumns(headerRow);

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    // Skip completely empty rows
    const hasData = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) continue;

    const dateStr = parseDate(row[colMap.date]);
    if (!dateStr) {
      errors.push(`Row ${i + 1}: Invalid or missing date "${row[colMap.date]}"`);
      continue;
    }

    const cows = toNum(row[colMap.cows]);
    const bulls = toNum(row[colMap.bulls]);
    const halak = toNum(row[colMap.halak]);
    const muchshar = toNum(row[colMap.muchshar]);
    const treif = toNum(row[colMap.treif]); // read for validation only, not stored
    const wasteLungs = toNum(row[colMap.wasteLungs]);
    const wasteInner = toNum(row[colMap.wasteInner]);
    const wasteOuter = toNum(row[colMap.wasteOuter]);
    const totalHeads = cows + bulls;

    if (totalHeads === 0) {
      errors.push(`Row ${i + 1}: Total heads is 0 (cows=${cows}, bulls=${bulls}), skipping`);
      continue;
    }

    // Validation: halak + muchshar + treif should equal total heads
    const kosherSum = halak + muchshar + treif;
    if (kosherSum !== totalHeads) {
      errors.push(`Row ${i + 1}: Kosher split mismatch: halak(${halak})+muchshar(${muchshar})+treif(${treif})=${kosherSum} != total(${totalHeads})`);
    }

    rows.push({
      date: dateStr,
      cows_count: cows,
      bulls_count: bulls,
      total_heads: totalHeads,
      halak_count: halak,
      muchshar_count: muchshar,
      waste_lungs: wasteLungs,
      waste_inner: wasteInner,
      waste_outer: wasteOuter,
    });
  }

  return { rows, errors };
}

function detectSlaughterColumns(header: any[]): Record<string, number> {
  // Default positional mapping
  const defaults = { date: 0, cows: 1, bulls: 2, halak: 3, muchshar: 4, treif: 5, wasteLungs: 6, wasteInner: 7, wasteOuter: 8 };

  if (!header || header.length === 0) return defaults;

  const map = { ...defaults };
  const normalized = header.map((h: any) => String(h || '').toLowerCase().trim());

  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (h.includes('fecha') || h.includes('date') || h.includes('תאריך')) map.date = i;
    else if (h.includes('vaca') || h.includes('cow') || h.includes('פרות')) map.cows = i;
    else if (h.includes('toro') || h.includes('bull') || h.includes('שוורים')) map.bulls = i;
    else if (h.includes('halak') || h.includes('חלק')) map.halak = i;
    else if (h.includes('kosher') || h.includes('muchshar') || h.includes('מוכשר')) map.muchshar = i;
    else if (h.includes('treif') || h.includes('טריף')) map.treif = i;
    else if (h.includes('pulmon') || h.includes('lung') || h.includes('ריאות')) map.wasteLungs = i;
    else if (h.includes('panza') || h.includes('inner') || h.includes('כרס')) map.wasteInner = i;
    else if (h.includes('cajon') || h.includes('outer') || h.includes('כללי')) map.wasteOuter = i;
  }

  return map;
}

// ==================== PRODUCTION PARSER ====================
// Header section: input weight and quarters by kosher type
// Product table: item_id (barcode), units, boxes, weight_kg

export function parseProductionExcel(buffer: ArrayBuffer): ParsedProductionData {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];

  const errors: string[] = [];
  let productionDate: string | null = null;

  const header: ProductionHeader = {
    halak_quarters_in: 0,
    kosher_quarters_in: 0,
    halak_weight_in_kg: 0,
    kosher_weight_in_kg: 0,
  };

  // Scan for header data and product table start
  let productStartRow = -1;
  let productColMap = { itemId: 0, units: 1, boxes: 2, weightKg: 3 };

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').toLowerCase().trim();
    const secondCell = row.length > 1 ? row[1] : null;

    // Try to detect production date
    if (!productionDate && (firstCell.includes('date') || firstCell.includes('fecha') || firstCell.includes('תאריך'))) {
      productionDate = parseDate(secondCell);
    }

    // Detect header data by keywords
    if (firstCell.includes('halak') && (firstCell.includes('kg') || firstCell.includes('peso') || firstCell.includes('משקל'))) {
      header.halak_weight_in_kg = toNum(secondCell);
    } else if ((firstCell.includes('kosher') || firstCell.includes('muchshar') || firstCell.includes('מוכשר')) && (firstCell.includes('kg') || firstCell.includes('peso') || firstCell.includes('משקל'))) {
      header.kosher_weight_in_kg = toNum(secondCell);
    } else if (firstCell.includes('halak') && (firstCell.includes('quarter') || firstCell.includes('cuarto') || firstCell.includes('רבע'))) {
      header.halak_quarters_in = toNum(secondCell);
    } else if ((firstCell.includes('kosher') || firstCell.includes('muchshar') || firstCell.includes('מוכשר')) && (firstCell.includes('quarter') || firstCell.includes('cuarto') || firstCell.includes('רבע'))) {
      header.kosher_quarters_in = toNum(secondCell);
    }

    // Detect product table start (header row of the table)
    if (firstCell.includes('ean') || firstCell.includes('barcode') || firstCell.includes('item') || firstCell.includes('ברקוד') || firstCell.includes('קוד')) {
      productStartRow = i + 1;
      // Detect column positions in the product table
      const normRow = row.map((c: any) => String(c || '').toLowerCase().trim());
      for (let j = 0; j < normRow.length; j++) {
        const c = normRow[j];
        if (c.includes('ean') || c.includes('barcode') || c.includes('item') || c.includes('ברקוד') || c.includes('קוד')) productColMap.itemId = j;
        else if (c.includes('unidad') || c.includes('unit') || c.includes('יחידות')) productColMap.units = j;
        else if (c.includes('caja') || c.includes('box') || c.includes('קופסאות') || c.includes('קרטון')) productColMap.boxes = j;
        else if (c.includes('peso') || c.includes('weight') || c.includes('kg') || c.includes('משקל')) productColMap.weightKg = j;
      }
      break;
    }
  }

  const rows: ProductionRow[] = [];

  if (productStartRow === -1) {
    // Fallback: treat entire sheet as product table (skip header row)
    productStartRow = 1;
  }

  for (let i = productStartRow; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const itemId = String(row[productColMap.itemId] || '').trim();
    if (!itemId || itemId === '0' || itemId === 'null') continue;

    // Skip summary/total rows
    if (itemId.toLowerCase().includes('total') || itemId.toLowerCase().includes('סה"כ')) continue;

    const weightKg = toNum(row[productColMap.weightKg]);
    if (weightKg === 0) continue; // Skip rows with no weight

    rows.push({
      item_id: itemId,
      units: toNum(row[productColMap.units]),
      boxes: toNum(row[productColMap.boxes]),
      weight_kg: weightKg,
      row_number: i + 1,
    });
  }

  if (rows.length === 0) {
    errors.push('No valid product rows found in file');
  }

  return { header, rows, productionDate, errors };
}
