'use server';

import * as XLSX from 'xlsx';

export async function getSlaughterSampleFile(): Promise<string> {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Date', 'Cows', 'Bulls', 'Halak', 'Muchshar', 'Treif', 'Waste Lungs', 'Waste Inner', 'Waste Outer'],
    ['2024-01-15', 120, 80, 150, 40, 10, 5, 3, 2],
    ['2024-01-16', 100, 70, 130, 30, 10, 4, 3, 3],
    ['2024-01-17', 110, 90, 160, 30, 10, 6, 2, 2],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = Array(9).fill({ wch: 14 });
  XLSX.utils.book_append_sheet(wb, ws, 'Slaughter');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

export async function getProductsSampleFile(): Promise<string> {
  const wb = XLSX.utils.book_new();
  const data = [
    ['ברקוד', 'שם עברית', 'שם לועזית', 'כשרות', 'מחלקה', 'X9', 'סטייק', 'ריענון', 'זן', 'אחוז משקל מעצם', 'לקוח'],
    ['7290000000001', 'פילה', 'Filete', 'Halak', 'carne', 'FALSE', 'TRUE', 'fresh', 'Aberdeen', '5', 'לקוח א'],
    ['7290000000002', 'כתף', 'Paleta', 'Muchshar', 'carne con hueso', 'TRUE', 'FALSE', 'frozen', 'Angus', '12', ''],
    ['7290000000003', 'כבד', 'Higado', 'Halak', 'menudencias', 'FALSE', 'FALSE', 'fresh', '', '0', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 20 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

export async function getProductionSampleFile(): Promise<string> {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Date:', '2024-01-15'],
    ['Halak Weight (kg):', 5000],
    ['Kosher Weight (kg):', 3000],
    ['Halak Quarters:', 40],
    ['Kosher Quarters:', 24],
    [],
    ['EAN/Barcode', 'Units', 'Boxes', 'Weight (kg)'],
    ['7290000000001', 50, 5, 250.5],
    ['7290000000002', 30, 3, 180.0],
    ['7290000000003', 20, 2, 95.0],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Production');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
