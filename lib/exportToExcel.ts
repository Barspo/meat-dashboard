import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportTableToExcel(
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
  filename: string
): void {
  const worksheetData = [
    columns.map(c => c.header),
    ...rows.map(row => columns.map(c => row[c.key] ?? '')),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = columns.map(c => ({ wch: c.width ?? 16 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'נתונים');

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
