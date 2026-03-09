'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getFactoryPerformance } from '@/app/actions/getFactoryPerformance';
import { getSeasons, type Season } from '@/app/actions/settingsActions';
import {
  ChevronDown, ArrowUpDown, X, Eye,
  Factory, Check, Loader2, AlertCircle, Download,
  Maximize2, Minimize2, Building2,
} from 'lucide-react';
import { DateRangePicker, QuickBtn, fmtHE, sameDay, calDays, parseHEDate } from '@/components/DateRangePicker';
import { exportTableToExcel } from '@/lib/exportToExcel';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FactoryRow {
  id: string;
  name: string;
  countryNameHebrew: string | null;
  total: number;
  cows: number;
  bulls: number;
  halak: number;
  muchshar: number;
  wasteTotal: number;
  waste1: number;
  waste2: number;
  waste3: number;
}

interface EnrichedRow extends FactoryRow {
  halakPct: number;
  muchsharPct: number;
  wastePct: number;
  totalWithoutWaste: number;
  halakPctWithoutWaste: number;
  muchsharPctWithoutWaste: number;
  cowsPct: number;
  bullsPct: number;
  waste1Pct: number;
  waste2Pct: number;
  waste3Pct: number;
}

// ─── Column Config ────────────────────────────────────────────────────────────

type ColGroup = 'total' | 'halak' | 'muchshar' | 'waste' | 'neutral';
type ColType = 'simple' | 'pct_only' | 'value_pct_total' | 'value_pct_waste';

interface ColDef {
  key: string;
  label: string;
  type: ColType;
  group: ColGroup;
}

const COLUMNS: ColDef[] = [
  { key: 'total',                   label: 'סה״כ שחיטות',        type: 'simple',          group: 'total'    },
  { key: 'halak',                   label: 'חלק',                type: 'simple',          group: 'halak'    },
  { key: 'halakPct',                label: '% חלק',              type: 'pct_only',        group: 'halak'    },
  { key: 'muchshar',                label: 'מוכשר',              type: 'simple',          group: 'muchshar' },
  { key: 'muchsharPct',             label: '% מוכשר',            type: 'pct_only',        group: 'muchshar' },
  { key: 'wasteTotal',              label: 'טרף',                type: 'simple',          group: 'waste'    },
  { key: 'wastePct',                label: '% טרף',              type: 'pct_only',        group: 'waste'    },
  { key: 'totalWithoutWaste',       label: 'סה״כ ללא טרף',      type: 'simple',          group: 'total'    },
  { key: 'halakPctWithoutWaste',    label: '% חלק ללא טרף',     type: 'pct_only',        group: 'halak'    },
  { key: 'muchsharPctWithoutWaste', label: '% מוכשר ללא טרף',   type: 'pct_only',        group: 'muchshar' },
  { key: 'waste1',                  label: 'טרף ריאות',          type: 'value_pct_waste', group: 'waste'    },
  { key: 'waste2',                  label: 'טרף כרסים',          type: 'value_pct_waste', group: 'waste'    },
  { key: 'waste3',                  label: 'טרף אחר',            type: 'value_pct_waste', group: 'waste'    },
  { key: 'cows',                    label: 'פרות',               type: 'value_pct_total', group: 'neutral'  },
  { key: 'bulls',                   label: 'שוורים',             type: 'value_pct_total', group: 'neutral'  },
];

// Default: first 10 data columns
const DEFAULT_VISIBLE = COLUMNS.slice(0, 10).map(c => c.key);

// ─── Color Map ────────────────────────────────────────────────────────────────

interface ColColors {
  val: string;
  pct: string;
  bg: string;
  border: string;
  dimVal: string;   // muted color for OFF state in column manager
  dimBorder: string;
}

const COL_COLORS: Record<ColGroup, ColColors> = {
  total:    { val: '#1e293b', pct: '#475569', bg: '#f1f5f9',              border: '#94a3b8', dimVal: '#c8d3df', dimBorder: '#dde5ef' },
  halak:    { val: '#cc2200', pct: '#cc2200', bg: 'rgba(204,34,0,0.07)', border: '#cc2200', dimVal: '#f0a090', dimBorder: '#f5bfb5' },
  muchshar: { val: '#15803d', pct: '#16a34a', bg: 'rgba(21,128,61,0.08)',border: '#15803d', dimVal: '#7ac49a', dimBorder: '#a3d4b8' },
  waste:    { val: '#475569', pct: '#64748b', bg: '#f1f5f9',              border: '#94a3b8', dimVal: '#c8d3df', dimBorder: '#dde5ef' },
  neutral:  { val: '#334155', pct: '#64748b', bg: '#f8fafc',              border: '#94a3b8', dimVal: '#c8d3df', dimBorder: '#dde5ef' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FactoryRow[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<Set<string>>(new Set());
  const [factoriesReady, setFactoriesReady] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [countriesReady, setCountriesReady] = useState(false);
  const [selectedSeasonName, setSelectedSeasonName] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load seasons → set default date range
  useEffect(() => {
    getSeasons().then(s => {
      setSeasons(s);
      const cur = s.find(x => x.is_current);
      if (cur) {
        setStartDate(new Date(cur.start_date + 'T12:00:00'));
        setEndDate(new Date(cur.end_date + 'T12:00:00'));
        setSelectedSeasonName(cur.name_hebrew);
      } else {
        const t = new Date();
        setStartDate(t);
        setEndDate(t);
      }
    });
  }, []);

  // Fetch data when dates change
  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    getFactoryPerformance(fmtDate(startDate), fmtDate(endDate))
      .then(res => {
        setData(res);
        if (!factoriesReady) {
          setSelectedFactoryIds(new Set(res.map((f: any) => f.id)));
          setFactoriesReady(true);
        }
        setCountriesReady(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  // Initialize country filter when data loads
  useEffect(() => {
    if (data.length && !countriesReady) {
      const cs = [...new Set(data.map(f => f.countryNameHebrew).filter(Boolean))] as string[];
      setSelectedCountries(new Set(cs));
      setCountriesReady(true);
    }
  }, [data, countriesReady]);

  // When country selection changes → sync factory selection to match
  const handleSetCountries = (next: Set<string>) => {
    setSelectedCountries(next);
    setSelectedFactoryIds(new Set(
      data
        .filter(f => !f.countryNameHebrew || next.has(f.countryNameHebrew))
        .map(f => f.id)
    ));
  };

  const uniqueCountries = useMemo(() =>
    [...new Set(data.map(f => f.countryNameHebrew).filter(Boolean))].sort() as string[],
  [data]);

  // Enrich raw data with derived percentage fields
  const enriched = useMemo((): EnrichedRow[] =>
    data.map(r => {
      const two = r.total - r.wasteTotal;
      return {
        ...r,
        halakPct:               r.total > 0      ? r.halak    / r.total    * 100 : 0,
        muchsharPct:            r.total > 0      ? r.muchshar / r.total    * 100 : 0,
        wastePct:               r.total > 0      ? r.wasteTotal / r.total  * 100 : 0,
        totalWithoutWaste:      two,
        halakPctWithoutWaste:   two > 0          ? r.halak    / two        * 100 : 0,
        muchsharPctWithoutWaste:two > 0          ? r.muchshar / two        * 100 : 0,
        cowsPct:                r.total > 0      ? r.cows     / r.total    * 100 : 0,
        bullsPct:               r.total > 0      ? r.bulls    / r.total    * 100 : 0,
        waste1Pct:              r.wasteTotal > 0 ? r.waste1   / r.wasteTotal * 100 : 0,
        waste2Pct:              r.wasteTotal > 0 ? r.waste2   / r.wasteTotal * 100 : 0,
        waste3Pct:              r.wasteTotal > 0 ? r.waste3   / r.wasteTotal * 100 : 0,
      };
    }),
  [data]);

  const filteredData = useMemo(() => {
    let f = enriched.filter(r => selectedFactoryIds.has(r.id));
    f = f.filter(r => !r.countryNameHebrew || selectedCountries.has(r.countryNameHebrew));
    return [...f].sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [enriched, selectedFactoryIds, selectedCountries, sortConfig]);

  const handleSort = (key: string) =>
    setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' }));

  const toggleColumn = (key: string) =>
    setVisibleColumns(prev => {
      if (prev.includes(key)) return prev.filter(c => c !== key);
      return [...prev, key].sort((a, b) =>
        COLUMNS.findIndex(c => c.key === a) - COLUMNS.findIndex(c => c.key === b)
      );
    });

  const dateLabel = startDate && endDate
    ? `${fmtHE(startDate)} — ${fmtHE(endDate)}`
    : 'בחירת תאריכים';

  const handleExport = () => {
    const cols = COLUMNS.filter(c => visibleColumns.includes(c.key));
    const summary = computeSummary(filteredData);

    const dataRows = filteredData.map(row => ({
      name: row.name,
      ...Object.fromEntries(cols.map(c => [c.key, (row as any)[c.key]])),
    }));

    // Summary row at the bottom
    const summaryRow = summary
      ? {
          name: `סה״כ (${filteredData.length} מפעלים)`,
          ...Object.fromEntries(
            cols.map(c => {
              const val = (summary as any)[c.key] as number;
              if (c.type === 'pct_only') return [c.key, `${val.toFixed(1)}%`];
              if (c.type === 'value_pct_total' || c.type === 'value_pct_waste') {
                const pct = ((summary as any)[c.key + 'Pct'] as number) ?? 0;
                return [c.key, `${val.toLocaleString()} (${pct.toFixed(1)}%)`];
              }
              return [c.key, val];
            })
          ),
        }
      : null;

    exportTableToExcel(
      [{ key: 'name', header: 'מפעל' }, ...cols.map(c => ({ key: c.key, header: c.label }))],
      summaryRow ? [...dataRows, { name: '---', ...Object.fromEntries(cols.map(c => [c.key, ''])) }, summaryRow] : dataRows,
      `ביצועי-מפעלים-${dateLabel}`
    );
  };

  const filterBarProps = {
    data, seasons,
    selectedFactoryIds, setSelectedFactoryIds,
    uniqueCountries, selectedCountries, setSelectedCountries: handleSetCountries,
    startDate, endDate, setStartDate, setEndDate,
    selectedSeasonName, setSelectedSeasonName,
  };

  const colManagerProps = { visibleColumns, setVisibleColumns, toggleColumn };

  const tableProps = {
    filteredData, visibleColumns, sortConfig,
    onSort: handleSort, onToggleColumn: toggleColumn,
  };

  const sectionContent = (
    <div className="space-y-4">
      <FilterBar {...filterBarProps} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-400 font-medium">מעבד נתוני שחיטה...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <AlertCircle className="text-slate-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-500">אין נתונים בטווח הנבחר</h3>
        </div>
      ) : (
        <>
          <ColumnManager {...colManagerProps} />
          <SummaryBar filteredData={filteredData} visibleColumns={visibleColumns} />
          <PerformanceTable {...tableProps} />
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-24 font-sans text-slate-800" dir="rtl">

      {/* ─── Title Row ─── */}
      <div className="relative flex items-center justify-center py-1">
        <h2 className="text-2xl font-black text-slate-800">ביצועי מפעלים</h2>
        <div className="absolute left-0 flex gap-2">
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Maximize2 size={14} />
            תצוגה מלאה
          </button>
          <button
            onClick={handleExport}
            disabled={loading || filteredData.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            ייצוא לאקסל
          </button>
        </div>
      </div>

      {/* ─── Normal View ─── */}
      {!isFullscreen && sectionContent}

      {/* ─── Fullscreen Overlay ─── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-auto" dir="rtl">
          <div className="p-6 max-w-[1900px] mx-auto space-y-4">
            <div className="relative flex items-center justify-center py-1">
              <h2 className="text-2xl font-black text-slate-800">ביצועי מפעלים</h2>
              <div className="absolute left-0 flex gap-2">
                <button
                  onClick={handleExport}
                  disabled={loading || filteredData.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm disabled:opacity-40"
                >
                  <Download size={14} /> ייצוא לאקסל
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 shadow-sm transition-colors"
                >
                  <Minimize2 size={14} /> סגור תצוגה מלאה
                </button>
              </div>
            </div>
            {sectionContent}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  data: FactoryRow[];
  seasons: Season[];
  selectedFactoryIds: Set<string>;
  setSelectedFactoryIds: (s: Set<string>) => void;
  uniqueCountries: string[];
  selectedCountries: Set<string>;
  setSelectedCountries: (s: Set<string>) => void;
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: (d: Date | null) => void;
  setEndDate: (d: Date | null) => void;
  selectedSeasonName: string | null;
  setSelectedSeasonName: (n: string | null) => void;
}

function FilterBar(props: FilterBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative z-30">
      <div className="flex flex-wrap items-start gap-4">

        <FactoryDropdown
          data={props.data}
          selectedFactoryIds={props.selectedFactoryIds}
          setSelectedFactoryIds={props.setSelectedFactoryIds}
        />

        {props.uniqueCountries.length > 1 && (
          <>
            <div className="w-px self-stretch bg-slate-200 mx-1" />
            <CountryDropdown
              uniqueCountries={props.uniqueCountries}
              selectedCountries={props.selectedCountries}
              setSelectedCountries={props.setSelectedCountries}
            />
          </>
        )}

        <div className="w-px self-stretch bg-slate-200 mx-1" />

        <DateRangePicker
          seasons={props.seasons}
          startDate={props.startDate}
          endDate={props.endDate}
          setStartDate={props.setStartDate}
          setEndDate={props.setEndDate}
          selectedSeasonName={props.selectedSeasonName}
          setSelectedSeasonName={props.setSelectedSeasonName}
        />

      </div>
    </div>
  );
}

// ─── Factory Dropdown ─────────────────────────────────────────────────────────

function FactoryDropdown({ data, selectedFactoryIds, setSelectedFactoryIds }: {
  data: FactoryRow[];
  selectedFactoryIds: Set<string>;
  setSelectedFactoryIds: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const allIds = data.map(f => f.id);
  const count = selectedFactoryIds.size;
  const allSelected = count === data.length && data.length > 0;

  const label = data.length === 0
    ? 'טוען...'
    : allSelected
    ? `כל המפעלים (${count})`
    : count === 0
    ? 'לא נבחרו מפעלים'
    : `${count} / ${data.length} מפעלים`;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">מפעלים</span>
        <button
          onClick={() => setSelectedFactoryIds(new Set(allIds))}
          className="text-[10px] font-bold text-blue-600 hover:underline"
        >בחר הכל</button>
        <span className="text-slate-300 text-xs">|</span>
        <button
          onClick={() => setSelectedFactoryIds(new Set())}
          className="text-[10px] font-bold text-slate-400 hover:underline"
        >נקה</button>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all min-w-[190px] justify-between ${
          open
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Building2 size={15} className={open ? 'text-blue-500' : 'text-slate-400'} />
          <span>{label}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 min-w-[230px] max-h-72 overflow-y-auto py-2">
          {data.map(f => {
            const checked = selectedFactoryIds.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => {
                  const next = new Set(selectedFactoryIds);
                  checked ? next.delete(f.id) : next.add(f.id);
                  setSelectedFactoryIds(next);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-right hover:bg-slate-50 transition-colors"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <div className="font-bold text-slate-700 text-sm truncate">{f.name}</div>
                  {f.countryNameHebrew && (
                    <div className="text-[11px] text-slate-400 font-medium">{f.countryNameHebrew}</div>
                  )}
                </div>
              </button>
            );
          })}
          {data.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400 text-center">טוען מפעלים...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Country Dropdown ─────────────────────────────────────────────────────────

function CountryDropdown({ uniqueCountries, selectedCountries, setSelectedCountries }: {
  uniqueCountries: string[];
  selectedCountries: Set<string>;
  setSelectedCountries: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const count = selectedCountries.size;
  const allSelected = count === uniqueCountries.length;
  const label = allSelected
    ? 'כל המדינות'
    : count === 0
    ? 'לא נבחרו מדינות'
    : `${count} / ${uniqueCountries.length} מדינות`;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">מדינה</span>
        <button
          onClick={() => setSelectedCountries(new Set(uniqueCountries))}
          className="text-[10px] font-bold text-blue-600 hover:underline"
        >בחר הכל</button>
        <span className="text-slate-300 text-xs">|</span>
        <button
          onClick={() => setSelectedCountries(new Set())}
          className="text-[10px] font-bold text-slate-400 hover:underline"
        >נקה</button>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all min-w-[160px] justify-between ${
          open
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span>{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 min-w-[180px] py-2">
          {uniqueCountries.map(c => {
            const checked = selectedCountries.has(c);
            return (
              <button
                key={c}
                onClick={() => {
                  const next = new Set(selectedCountries);
                  checked ? next.delete(c) : next.add(c);
                  setSelectedCountries(next);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-right hover:bg-slate-50 transition-colors"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
                <span className="font-bold text-slate-700 text-sm">{c}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function computeSummary(data: EnrichedRow[]) {
  if (data.length === 0) return null;
  const sumTotal        = data.reduce((a, r) => a + r.total, 0);
  const sumHalak        = data.reduce((a, r) => a + r.halak, 0);
  const sumMuchshar     = data.reduce((a, r) => a + r.muchshar, 0);
  const sumWasteTotal   = data.reduce((a, r) => a + r.wasteTotal, 0);
  const sumWaste1       = data.reduce((a, r) => a + r.waste1, 0);
  const sumWaste2       = data.reduce((a, r) => a + r.waste2, 0);
  const sumWaste3       = data.reduce((a, r) => a + r.waste3, 0);
  const sumCows         = data.reduce((a, r) => a + r.cows, 0);
  const sumBulls        = data.reduce((a, r) => a + r.bulls, 0);
  const sumTWW          = sumTotal - sumWasteTotal;
  return {
    total:                   sumTotal,
    halak:                   sumHalak,
    halakPct:                sumTotal > 0      ? sumHalak    / sumTotal    * 100 : 0,
    muchshar:                sumMuchshar,
    muchsharPct:             sumTotal > 0      ? sumMuchshar / sumTotal    * 100 : 0,
    wasteTotal:              sumWasteTotal,
    wastePct:                sumTotal > 0      ? sumWasteTotal / sumTotal  * 100 : 0,
    totalWithoutWaste:       sumTWW,
    halakPctWithoutWaste:    sumTWW > 0        ? sumHalak    / sumTWW      * 100 : 0,
    muchsharPctWithoutWaste: sumTWW > 0        ? sumMuchshar / sumTWW      * 100 : 0,
    waste1:                  sumWaste1,
    waste1Pct:               sumWasteTotal > 0 ? sumWaste1   / sumWasteTotal * 100 : 0,
    waste2:                  sumWaste2,
    waste2Pct:               sumWasteTotal > 0 ? sumWaste2   / sumWasteTotal * 100 : 0,
    waste3:                  sumWaste3,
    waste3Pct:               sumWasteTotal > 0 ? sumWaste3   / sumWasteTotal * 100 : 0,
    cows:                    sumCows,
    cowsPct:                 sumTotal > 0      ? sumCows     / sumTotal    * 100 : 0,
    bulls:                   sumBulls,
    bullsPct:                sumTotal > 0      ? sumBulls    / sumTotal    * 100 : 0,
  };
}

// Colors optimized for the dark (slate-800) summary bar background
const SUMMARY_COLORS: Record<ColGroup, { val: string; pct: string; label: string }> = {
  total:    { val: '#f1f5f9', pct: '#94a3b8', label: '#64748b' },
  halak:    { val: '#fca5a5', pct: '#fca5a5', label: '#f87171' },
  muchshar: { val: '#86efac', pct: '#86efac', label: '#4ade80' },
  waste:    { val: '#94a3b8', pct: '#94a3b8', label: '#64748b' },
  neutral:  { val: '#e2e8f0', pct: '#94a3b8', label: '#64748b' },
};

function SummaryBar({ filteredData, visibleColumns }: {
  filteredData: EnrichedRow[];
  visibleColumns: string[];
}) {
  const summary = computeSummary(filteredData);
  if (!summary || filteredData.length === 0) return null;

  const visCols = COLUMNS.filter(c => visibleColumns.includes(c.key));

  const renderValue = (col: ColDef) => {
    const sc = SUMMARY_COLORS[col.group];
    const val = (summary as any)[col.key] as number;

    if (col.type === 'pct_only') {
      return (
        <span className="text-base font-black" style={{ color: sc.pct }}>
          {val.toFixed(1)}%
        </span>
      );
    }
    if (col.type === 'simple') {
      return (
        <span className="text-base font-mono font-black" style={{ color: sc.val }}>
          {val.toLocaleString()}
        </span>
      );
    }
    // value_pct_total / value_pct_waste
    const pct = ((summary as any)[col.key + 'Pct'] as number) ?? 0;
    return (
      <div className="flex flex-col items-center">
        <span className="text-base font-mono font-black" style={{ color: sc.val }}>{val.toLocaleString()}</span>
        <span className="text-xs font-bold" style={{ color: sc.pct }}>{pct.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-xl px-6 py-4 flex flex-wrap justify-center gap-x-6 gap-y-3 items-center" style={{ maxHeight: '8rem', overflow: 'hidden' }}>
      {/* Label */}
      <div className="flex flex-col items-center shrink-0 border-l border-slate-600 pl-6 ml-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">סה״כ</span>
        <span className="text-sm font-bold text-slate-300">{filteredData.length}</span>
        <span className="text-[10px] text-slate-500">מפעלים</span>
      </div>
      {visCols.map(col => {
        const sc = SUMMARY_COLORS[col.group];
        return (
          <div key={col.key} className="flex flex-col items-center shrink-0 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: sc.label }}>
              {col.label}
            </span>
            {renderValue(col)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Column Manager ───────────────────────────────────────────────────────────

function ColumnManager({ visibleColumns, setVisibleColumns, toggleColumn }: {
  visibleColumns: string[];
  setVisibleColumns: (c: string[]) => void;
  toggleColumn: (key: string) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <Eye size={16} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">עמודות:</span>
        <button
          onClick={() => setVisibleColumns(COLUMNS.map(c => c.key))}
          className="text-[10px] font-bold text-blue-600 hover:underline"
        >בחר הכל</button>
        <span className="text-slate-300 text-xs">|</span>
        <button
          onClick={() => setVisibleColumns(['total'])}
          className="text-[10px] font-bold text-slate-400 hover:underline"
        >נקה</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLUMNS.map(col => {
          const on = visibleColumns.includes(col.key);
          const c = COL_COLORS[col.group];
          return (
            <button
              key={col.key}
              onClick={() => toggleColumn(col.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                on ? '' : 'opacity-60'
              }`}
              style={on
                ? {
                    backgroundColor: c.bg,
                    color: c.val,
                    borderColor: c.border,
                    borderWidth: '1.5px',
                    boxShadow: `0 0 0 1px ${c.border}25`,
                  }
                : {
                    backgroundColor: 'white',
                    color: c.dimVal,
                    borderColor: c.dimBorder,
                    borderStyle: 'dashed',
                  }
              }
            >
              {col.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Performance Table ────────────────────────────────────────────────────────

function PerformanceTable({ filteredData, visibleColumns, sortConfig, onSort, onToggleColumn }: {
  filteredData: EnrichedRow[];
  visibleColumns: string[];
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  onToggleColumn: (key: string) => void;
}) {
  const visCols = COLUMNS.filter(c => visibleColumns.includes(c.key));

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl">
        <AlertCircle className="text-slate-200 mb-3" size={36} />
        <p className="text-slate-400 font-medium text-sm">אין מפעלים לתצוגה עם הפילטרים הנוכחיים</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/*
        Scrollbar-on-top trick:
        The outer div is flipped vertically (scaleY -1) so the horizontal scrollbar
        appears at the top. The inner table is flipped back to normal orientation.
      */}
      <div style={{ transform: 'scaleY(-1)', overflowX: 'auto' }}>
        <table
          className="w-full text-right text-sm min-w-[900px]"
          style={{ transform: 'scaleY(-1)' }}
        >
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
            <tr>
              {/* Sticky factory name header */}
              <th className="px-5 py-4 sticky right-0 bg-slate-50 z-10 border-l border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] w-52 text-slate-400">
                <div className="flex items-center gap-2">
                  <Factory size={14} />
                  שם המפעל
                </div>
              </th>

              {visCols.map(col => {
                const isSorted = sortConfig.key === col.key;
                const c = COL_COLORS[col.group];
                return (
                  <th
                    key={col.key}
                    className="px-4 py-4 min-w-[110px] group"
                    style={{ color: c.val }}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer gap-1"
                      onClick={() => onSort(col.key)}
                    >
                      <span className="transition-opacity group-hover:opacity-70">{col.label}</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <ArrowUpDown
                          size={12}
                          className={`transition-opacity ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); onToggleColumn(col.key); }}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 hover:bg-slate-200 rounded transition-all"
                          title="הסתר עמודה"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredData.map(row => (
              <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">

                {/* Sticky factory name cell */}
                <td className="px-5 py-4 sticky right-0 bg-white group-hover:bg-blue-50/20 border-l border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.04)] transition-colors">
                  <span className="font-bold text-slate-800">{row.name}</span>
                  {row.countryNameHebrew && (
                    <span className="block text-[11px] text-slate-400 font-medium mt-0.5">{row.countryNameHebrew}</span>
                  )}
                </td>

                {visCols.map(col => <DataCell key={col.key} col={col} row={row} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Data Cell ────────────────────────────────────────────────────────────────

function DataCell({ col, row }: { col: ColDef; row: EnrichedRow }) {
  const c = COL_COLORS[col.group];
  const val = (row as any)[col.key] as number;

  if (col.type === 'pct_only') {
    return (
      <td className="px-4 py-4 text-center">
        <span
          className="inline-block text-sm font-black px-2.5 py-1 rounded-lg"
          style={{ color: c.pct, backgroundColor: c.bg }}
        >
          {val.toFixed(1)}%
        </span>
      </td>
    );
  }

  if (col.type === 'simple') {
    return (
      <td className="px-4 py-4">
        <span className="text-base font-mono font-bold" style={{ color: c.val }}>
          {val.toLocaleString()}
        </span>
      </td>
    );
  }

  // value_pct_total → % of total | value_pct_waste → % of wasteTotal
  const pctVal = ((row as any)[col.key + 'Pct'] as number) ?? 0;
  return (
    <td className="px-4 py-4">
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-base font-mono font-bold" style={{ color: c.val }}>
          {val.toLocaleString()}
        </span>
        <span
          className="text-xs font-black px-1.5 py-0.5 rounded"
          style={{ color: c.pct, backgroundColor: c.bg }}
        >
          {pctVal.toFixed(1)}%
        </span>
      </div>
    </td>
  );
}
