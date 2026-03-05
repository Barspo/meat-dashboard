'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSeasonsList, getSlaughterReport, type Season, type SlaughterReportRow, type SlaughterReportData } from '@/app/actions/getSlaughterReport';
import { exportTableToExcel } from '@/lib/exportToExcel';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown,
  Maximize2, X, Upload, Bell, ExternalLink,
} from 'lucide-react';

// ---------- Types ----------
type SortKey = keyof Omit<SlaughterReportRow, 'factory_id'>;

// ---------- Helpers ----------
function pctFmt(n: number) { return `${n.toLocaleString('he-IL', { maximumFractionDigits: 1 })}%`; }
function numFmt(n: number) { return n.toLocaleString('he-IL'); }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    success: { label: 'הצלחה', bg: '#EFF6FF', color: '#1D4ED8' },
    partial: { label: 'חלקי', bg: '#FFFBEB', color: '#B45309' },
    error: { label: 'שגיאה', bg: '#FFF7ED', color: '#C2410C' },
    processing: { label: 'בעיבוד', bg: '#EFF6FF', color: '#1D4ED8' },
  };
  const s = map[status] ?? { label: status, bg: '#F8FAFC', color: '#64748B' };
  return (
    <span style={{ background: s.bg, color: s.color }}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
      {s.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
      {method === 'manual' ? 'ידני' : method}
    </span>
  );
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="opacity-30" />;
  return dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

// ---------- Slaughter Table ----------
const COLUMNS: { key: SortKey; label: string; halak?: boolean; muchshar?: boolean }[] = [
  { key: 'factory_name', label: 'מפעל' },
  { key: 'country_name_hebrew', label: 'מדינה' },
  { key: 'total', label: 'סה"כ שחיטות' },
  { key: 'halak', label: 'חלק', halak: true },
  { key: 'halak_pct', label: '% חלק מסה"כ', halak: true },
  { key: 'muchshar', label: 'מוכשר', muchshar: true },
  { key: 'muchshar_pct', label: '% מוכשר מסה"כ', muchshar: true },
  { key: 'treif', label: 'טרף (פחת)' },
  { key: 'treif_pct', label: '% טרף מסה"כ' },
  { key: 'without_treif', label: 'סה"כ ללא טרף' },
  { key: 'halak_of_clean_pct', label: '% חלק ללא טרף', halak: true },
  { key: 'muchshar_of_clean_pct', label: '% מוכשר ללא טרף', muchshar: true },
];

const HALAK_COLOR = '#FF3300';
const MUCHSHAR_COLOR = '#008000';

function cellColor(col: typeof COLUMNS[number]) {
  if (col.halak) return HALAK_COLOR;
  if (col.muchshar) return MUCHSHAR_COLOR;
  return undefined;
}

function formatCell(col: typeof COLUMNS[number], row: SlaughterReportRow) {
  const v = row[col.key];
  if (col.key === 'factory_name') return String(v);
  if (col.key === 'country_name_hebrew') return v ? String(v) : '—';
  if (typeof v !== 'number') return '—';
  if (col.key.endsWith('_pct')) return pctFmt(v);
  return numFmt(v);
}

function SlaughterTable({
  rows, summary, sortKey, sortDir, onSort,
}: {
  rows: SlaughterReportRow[];
  summary: SlaughterReportRow;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv, 'he') : bv.localeCompare(av, 'he');
    const an = Number(av ?? 0), bn = Number(bv ?? 0);
    return sortDir === 'asc' ? an - bn : bn - an;
  });

  return (
    <table className="w-full text-right text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100 text-xs text-slate-600 font-bold">
          {COLUMNS.map(col => (
            <th key={col.key}
                className="px-3 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors select-none"
                style={{ color: cellColor(col) }}
                onClick={() => onSort(col.key)}>
              <div className="flex items-center gap-1 justify-end">
                {col.label}
                <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Summary row */}
        <tr className="bg-slate-800 text-white font-black border-b-2 border-slate-600">
          {COLUMNS.map(col => (
            <td key={col.key}
                className="px-3 py-3 whitespace-nowrap"
                style={{ color: col.halak ? '#FF9980' : col.muchshar ? '#66CC66' : undefined }}>
              {formatCell(col, summary)}
            </td>
          ))}
        </tr>
        {/* Factory rows */}
        {sorted.map(row => (
          <tr key={row.factory_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            {COLUMNS.map(col => (
              <td key={col.key}
                  className="px-3 py-2.5 whitespace-nowrap"
                  style={{ color: cellColor(col) }}>
                {formatCell(col, row)}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-slate-400">
              אין נתוני שחיטה לעונה זו
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ---------- Main Page ----------
export default function DashboardPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [report, setReport] = useState<SlaughterReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('factory_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Load seasons list once
  useEffect(() => {
    getSeasonsList().then(list => {
      setSeasons(list);
      const current = list.find(s => s.is_current);
      setSelectedSeasonId(current?.id ?? list[0]?.id ?? null);
    });
  }, []);

  // Load report when season changes
  const loadReport = useCallback((sid: number | null) => {
    setLoading(true);
    getSlaughterReport(sid).then(r => { setReport(r); setLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedSeasonId !== null || seasons.length > 0) {
      loadReport(selectedSeasonId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function handleExport() {
    if (!report) return;
    const allRows = [report.summary, ...report.rows];
    exportTableToExcel(
      COLUMNS.map(c => ({ header: c.label, key: c.key, width: 14 })),
      allRows.map(r => {
        const out: Record<string, unknown> = {};
        COLUMNS.forEach(c => {
          const v = r[c.key];
          out[c.key] = typeof v === 'number' && c.key.endsWith('_pct') ? `${v}%` : v;
        });
        return out;
      }),
      `דוח-שחיטות-${report.season?.name_hebrew ?? 'ללא-עונה'}`
    );
  }

  const tableProps = report ? {
    rows: report.rows,
    summary: report.summary,
    sortKey,
    sortDir,
    onSort: handleSort,
  } : null;

  return (
    <div className="space-y-6 pb-24 font-sans text-slate-800" dir="rtl">

      {/* ====== Area 1: Slaughter Report ====== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <h2 className="font-black text-slate-800 text-base flex-1">דוח שחיטות מפעלים</h2>

          {/* Season DDL */}
          <select
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedSeasonId ?? ''}
            onChange={e => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
            disabled={seasons.length === 0}
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.name_hebrew}{s.is_current ? ' (נוכחית)' : ''}
              </option>
            ))}
            {seasons.length === 0 && <option value="">טוען...</option>}
          </select>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={!report || report.rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40">
            ייצוא Excel
          </button>

          {/* Performance link */}
          <Link href="/performance"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            נתונים מורחבים <ExternalLink size={14} />
          </Link>

          {/* Fullscreen */}
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            <Maximize2 size={14} /> מסך מלא
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState message="טוען דוח שחיטות..." />
        ) : (
          <div className="overflow-x-auto">
            {tableProps && <SlaughterTable {...tableProps} />}
          </div>
        )}

        {report?.season && (
          <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {report.season.name_hebrew} | {report.season.start_date} — {report.season.end_date}
          </div>
        )}
      </div>

      {/* ====== Area 2: Recent Uploads ====== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-1.5 rounded-lg"><Upload size={16} className="text-blue-600" /></div>
            <h3 className="font-black text-slate-800 text-sm">העלאות אחרונות</h3>
          </div>
          <Link href="/alerts"
                className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline">
            <Bell size={12} /> לדף ההתראות <ArrowLeft size={12} />
          </Link>
        </div>

        {!report ? (
          <LoadingState message="טוען..." />
        ) : report.recentUploads.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">לא בוצעו העלאות עדיין</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-bold">
                <tr>
                  <th className="px-4 py-3">תאריך</th>
                  <th className="px-4 py-3">קובץ</th>
                  <th className="px-4 py-3">סוג</th>
                  <th className="px-4 py-3">מפעל</th>
                  <th className="px-4 py-3">שיטה</th>
                  <th className="px-4 py-3">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {report.recentUploads.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                      {u.uploadedAt ? u.uploadedAt.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-600 max-w-[180px] truncate">{u.fileName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.uploadType === 'slaughter' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {u.uploadType === 'slaughter' ? 'שחיטה' : 'ייצור'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{u.factoryName}</td>
                    <td className="px-4 py-2.5"><MethodBadge method={u.uploadMethod} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== Fullscreen Modal ====== */}
      {fullscreen && tableProps && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <h2 className="font-black text-slate-800">דוח שחיטות מפעלים</h2>
              {report?.season && (
                <span className="text-sm text-slate-500">{report.season.name_hebrew}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                ייצוא Excel
              </button>
              <button onClick={() => setFullscreen(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200 text-slate-700 hover:bg-slate-300">
                <X size={16} /> סגור
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <SlaughterTable {...tableProps} />
          </div>
        </div>
      )}

    </div>
  );
}
