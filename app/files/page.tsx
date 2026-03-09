'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trash2, Link2, Unlink, ChevronDown, AlertTriangle, Loader2, Pencil, X, Building2,
} from 'lucide-react';
import { getFilesData, SlaughterBatchRow, ProductionDataRow, FactoryOption } from '../actions/getFilesData';
import { deleteSlaughterBatch, deleteProductionData } from '../actions/deleteFileActions';
import {
  updateSlaughterBatch, updateProductionData, setSlaughterProductionLink,
  getAvailableProductionData, AvailableProductionOption,
} from '../actions/editFileActions';
import { getSeasons, Season } from '../actions/settingsActions';
import { getAvailableSlaughterBatches, SlaughterBatchOption } from '../actions/uploadProductionAction';
import { DateRangePicker } from '@/components/DateRangePicker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad2(n: number) { return String(n).padStart(2, '0'); }

function dateToStr(d: Date | null): string {
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type DeleteTarget =
  | { type: 'slaughter'; row: SlaughterBatchRow }
  | { type: 'production'; row: ProductionDataRow };

type EditTarget =
  | { type: 'slaughter'; row: SlaughterBatchRow }
  | { type: 'production'; row: ProductionDataRow };

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FilesPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | null>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(now);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonName, setSelectedSeasonName] = useState<string | null>(null);

  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<Set<number>>(new Set());
  const [factoryDDLOpen, setFactoryDDLOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'slaughter' | 'production'>('slaughter');
  const [slaughterData, setSlaughterData] = useState<SlaughterBatchRow[]>([]);
  const [productionData, setProductionData] = useState<ProductionDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const factoriesInitialized = useRef(false);
  const factoryDDLRef = useRef<HTMLDivElement>(null);

  // ── Fetch seasons on mount ─────────────────────────────────────────────────

  useEffect(() => {
    getSeasons().then(setSeasons);
  }, []);

  // ── Fetch data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (startDate && endDate) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  async function fetchData() {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getFilesData(dateToStr(startDate), dateToStr(endDate));
      setFactories(result.factories);
      setSlaughterData(result.slaughterBatches);
      setProductionData(result.productionData);
      if (!factoriesInitialized.current) {
        setSelectedFactoryIds(new Set(result.factories.map(f => f.id)));
        factoriesInitialized.current = true;
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }

  // ── Click-outside to close DDLs ────────────────────────────────────────────

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (factoryDDLRef.current && !factoryDDLRef.current.contains(e.target as Node))
        setFactoryDDLOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ── Factory DDL helpers ────────────────────────────────────────────────────

  const allSelected = factories.length > 0 && factories.every(f => selectedFactoryIds.has(f.id));

  function toggleAll() {
    setSelectedFactoryIds(allSelected ? new Set() : new Set(factories.map(f => f.id)));
  }

  function toggleFactory(id: number) {
    setSelectedFactoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const factoryLabel =
    selectedFactoryIds.size === 0 ? 'אין מפעלים'
    : selectedFactoryIds.size === factories.length ? 'כל המפעלים'
    : `${selectedFactoryIds.size} מפעלים`;

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredSlaughter = useMemo(
    () => slaughterData.filter(r => selectedFactoryIds.has(r.factory_id)),
    [slaughterData, selectedFactoryIds]
  );

  const filteredProduction = useMemo(
    () => productionData.filter(r => r.factory_id == null || selectedFactoryIds.has(r.factory_id!)),
    [productionData, selectedFactoryIds]
  );

  // ── Delete handler ─────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result =
        deleteTarget.type === 'slaughter'
          ? await deleteSlaughterBatch(deleteTarget.row.id)
          : await deleteProductionData(deleteTarget.row.id);
      if (result.success) {
        setDeleteTarget(null);
        await fetchData();
      } else {
        alert(`שגיאה במחיקה: ${result.error}`);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ניהול קבצים</h1>
        <p className="text-slate-500 text-sm mt-1">צפה, סנן, ערוך ומחק נתוני שחיטה וייצור</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-start">
        {/* Date Range Picker */}
        <DateRangePicker
          seasons={seasons}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          selectedSeasonName={selectedSeasonName}
          setSelectedSeasonName={setSelectedSeasonName}
          hideShortcuts
        />

        {/* Factory DDL */}
        <div ref={factoryDDLRef} className="relative flex-shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">מפעלים</span>
            <button onClick={() => setSelectedFactoryIds(new Set(factories.map(f => f.id)))} className="text-[10px] font-bold text-blue-600 hover:underline">בחר הכל</button>
            <span className="text-slate-300 text-[10px]">|</span>
            <button onClick={() => setSelectedFactoryIds(new Set())} className="text-[10px] font-bold text-slate-400 hover:underline">נקה</button>
          </div>
          <button
            onClick={() => setFactoryDDLOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all min-w-[200px] justify-between ${
              factoryDDLOpen
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={15} className={factoryDDLOpen ? 'text-blue-500' : 'text-slate-400'} />
              <span>{factoryLabel}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${factoryDDLOpen ? 'rotate-180' : ''}`} />
          </button>
          {factoryDDLOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 py-2 min-w-[250px] max-h-72 overflow-y-auto">
              {factories.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFactory(f.id)}
                  className="w-full text-right px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedFactoryIds.has(f.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                  }`}>
                    {selectedFactoryIds.has(f.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-bold ${selectedFactoryIds.has(f.id) ? 'text-slate-800' : 'text-slate-500'}`}>{f.name}</span>
                    {f.country_name && <span className="text-[10px] text-slate-400">{f.country_name}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('slaughter')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'slaughter'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          קבצי שחיטה
          {!loading && (
            <span className="mr-2 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {filteredSlaughter.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'production'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          קבצי ייצור
          {!loading && (
            <span className="mr-2 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {filteredProduction.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>טוען...</span>
        </div>
      ) : activeTab === 'slaughter' ? (
        <SlaughterTable
          rows={filteredSlaughter}
          onDelete={row => setDeleteTarget({ type: 'slaughter', row })}
          onEdit={row => setEditTarget({ type: 'slaughter', row })}
        />
      ) : (
        <ProductionTable
          rows={filteredProduction}
          onDelete={row => setDeleteTarget({ type: 'production', row })}
          onEdit={row => setEditTarget({ type: 'production', row })}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Edit Modals */}
      {editTarget?.type === 'slaughter' && (
        <EditSlaughterModal
          row={editTarget.row}
          factories={factories}
          onSave={() => { setEditTarget(null); fetchData(); }}
          onCancel={() => setEditTarget(null)}
        />
      )}
      {editTarget?.type === 'production' && (
        <EditProductionModal
          row={editTarget.row}
          factories={factories}
          onSave={() => { setEditTarget(null); fetchData(); }}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

// ─── SlaughterTable ──────────────────────────────────────────────────────────

function SlaughterTable({
  rows,
  onDelete,
  onEdit,
}: {
  rows: SlaughterBatchRow[];
  onDelete: (row: SlaughterBatchRow) => void;
  onEdit: (row: SlaughterBatchRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
        אין נתוני שחיטה בטווח התאריכים שנבחר
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm min-w-[1020px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-right text-slate-600 font-semibold">מפעל</th>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold whitespace-nowrap">תאריך</th>
              <th className="px-4 py-3 text-center text-slate-700 font-semibold whitespace-nowrap">סה״כ ראשים</th>
              <th className="px-4 py-3 text-center text-slate-500 font-semibold">פרות</th>
              <th className="px-4 py-3 text-center text-slate-500 font-semibold">שוורים</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: '#cc2200' }}>חלק</th>
              <th className="px-4 py-3 text-center font-semibold text-xs" style={{ color: '#cc2200' }}>% חלק</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: '#15803d' }}>מוכשר</th>
              <th className="px-4 py-3 text-center font-semibold text-xs" style={{ color: '#15803d' }}>% מוכשר</th>
              <th className="px-4 py-3 text-center text-slate-500 font-semibold">טרף</th>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold whitespace-nowrap">ייצור מקושר</th>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const halakPct = row.total_slaughtered > 0 ? (row.halak_count / row.total_slaughtered) * 100 : 0;
              const muchsharPct = row.total_slaughtered > 0 ? (row.muchshar_count / row.total_slaughtered) * 100 : 0;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/40' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{row.factory_name}</td>
                  <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800">
                    {row.total_slaughtered.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.cows_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.bulls_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center font-medium" style={{ color: '#cc2200' }}>
                    {row.halak_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: '#cc2200' }}>
                    {halakPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center font-medium" style={{ color: '#15803d' }}>
                    {row.muchshar_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: '#15803d' }}>
                    {muchsharPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.waste_total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {row.linked_production_id ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                        <Link2 size={10} />
                        {row.linked_production_date}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">
                        <Unlink size={10} />
                        לא מקושר
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ערוך שורה"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק שורה"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ProductionTable ──────────────────────────────────────────────────────────

function ProductionTable({
  rows,
  onDelete,
  onEdit,
}: {
  rows: ProductionDataRow[];
  onDelete: (row: ProductionDataRow) => void;
  onEdit: (row: ProductionDataRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
        אין נתוני ייצור בטווח התאריכים שנבחר
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm min-w-[820px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold whitespace-nowrap">תאריך</th>
              <th className="px-4 py-3 text-right text-slate-600 font-semibold">מפעל</th>
              <th className="px-4 py-3 text-center font-semibold whitespace-nowrap" style={{ color: '#cc2200' }}>רבעים חלק</th>
              <th className="px-4 py-3 text-center font-semibold whitespace-nowrap" style={{ color: '#15803d' }}>רבעים מוכשר</th>
              <th className="px-4 py-3 text-center font-semibold whitespace-nowrap" style={{ color: '#cc2200' }}>משקל חלק (ק״ג)</th>
              <th className="px-4 py-3 text-center font-semibold whitespace-nowrap" style={{ color: '#15803d' }}>משקל מוכשר (ק״ג)</th>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold whitespace-nowrap">שחיטה מקושרת</th>
              <th className="px-4 py-3 text-center text-slate-600 font-semibold">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  i % 2 === 1 ? 'bg-slate-50/40' : ''
                }`}
              >
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{row.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                  {row.factory_name ?? <span className="text-slate-400 text-xs italic">לא ידוע</span>}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: '#cc2200' }}>
                  {row.halak_quarters?.toLocaleString() ?? '—'}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: '#15803d' }}>
                  {row.kosher_quarters?.toLocaleString() ?? '—'}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: '#cc2200' }}>
                  {row.halak_weight_kg != null
                    ? Number(row.halak_weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: '#15803d' }}>
                  {row.kosher_weight_kg != null
                    ? Number(row.kosher_weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.linked_slaughter_id ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                      <Link2 size={10} />
                      {row.linked_slaughter_date}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">
                      <Unlink size={10} />
                      לא מקושר
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ערוך שורה"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(row)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחק שורה"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DeleteModal ─────────────────────────────────────────────────────────────

function DeleteModal({
  target,
  loading,
  onConfirm,
  onCancel,
}: {
  target: DeleteTarget;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isSlaughter = target.type === 'slaughter';
  const row = target.row;
  const hasLink = isSlaughter
    ? (row as SlaughterBatchRow).linked_production_id != null
    : (row as ProductionDataRow).linked_slaughter_id != null;
  const linkedDate = isSlaughter
    ? (row as SlaughterBatchRow).linked_production_date
    : (row as ProductionDataRow).linked_slaughter_date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-red-50 rounded-lg mt-0.5 flex-shrink-0">
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {isSlaughter ? 'מחיקת נתוני שחיטה' : 'מחיקת נתוני ייצור'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isSlaughter
                ? `${(row as SlaughterBatchRow).factory_name} — ${row.date}`
                : `תאריך ייצור: ${row.date}`}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm space-y-3">
          <p className="text-slate-700">
            {isSlaughter
              ? 'פעולה זו תמחק את כל נתוני השחיטה לתאריך ולמפעל זה ולא ניתן לבטלה.'
              : 'פעולה זו תמחק את נתוני הייצור כולל כל רשומות המוצרים המקושרות ולא ניתן לבטלה.'}
          </p>
          {hasLink && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <p>
                {isSlaughter
                  ? `רשומה זו מקושרת לנתוני ייצור מתאריך ${linkedDate}. קישור הייצור יוסר אך נתוני הייצור לא יימחקו.`
                  : `רשומה זו מקושרת לנתוני שחיטה מתאריך ${linkedDate}. הקישור יוסר ונתוני השחיטה יישארו במערכת.`}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            מחק
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditSlaughterModal ───────────────────────────────────────────────────────

function EditSlaughterModal({
  row,
  factories,
  onSave,
  onCancel,
}: {
  row: SlaughterBatchRow;
  factories: FactoryOption[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(row.date);
  const [factoryId, setFactoryId] = useState(row.factory_id);
  const [totalSlaughtered, setTotalSlaughtered] = useState(String(row.total_slaughtered));
  const [cowsCount, setCowsCount] = useState(String(row.cows_count));
  const [bullsCount, setBullsCount] = useState(String(row.bulls_count));
  const [halakCount, setHalakCount] = useState(String(row.halak_count));
  const [muchsharCount, setMuchsharCount] = useState(String(row.muchshar_count));
  const [wasteLungs, setWasteLungs] = useState(String(row.waste_lungs));
  const [wasteInner, setWasteInner] = useState(String(row.waste_inner));
  const [wasteOuter, setWasteOuter] = useState(String(row.waste_outer));

  // Link management
  const [linkAction, setLinkAction] = useState<'keep' | 'unlink' | 'change'>('keep');
  const [availableProduction, setAvailableProduction] = useState<AvailableProductionOption[]>([]);
  const [selectedProductionId, setSelectedProductionId] = useState<number | null>(null);
  const [loadingProduction, setLoadingProduction] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleChangeLink() {
    setLinkAction('change');
    setLoadingProduction(true);
    const list = await getAvailableProductionData(row.id);
    setAvailableProduction(list);
    setLoadingProduction(false);
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await updateSlaughterBatch(row.id, {
        date,
        factory_id: factoryId,
        total_slaughtered: Number(totalSlaughtered),
        cows_count: Number(cowsCount),
        bulls_count: Number(bullsCount),
        halak_count: Number(halakCount),
        muchshar_count: Number(muchsharCount),
        waste_lungs: Number(wasteLungs),
        waste_inner: Number(wasteInner),
        waste_outer: Number(wasteOuter),
      });
      if (!res.success) { setErrorMsg(res.error ?? 'שגיאה'); return; }

      if (linkAction === 'unlink') {
        const lr = await setSlaughterProductionLink(row.id, null);
        if (!lr.success) { setErrorMsg(lr.error ?? 'שגיאה בקישור'); return; }
      } else if (linkAction === 'change' && selectedProductionId != null) {
        const lr = await setSlaughterProductionLink(row.id, selectedProductionId);
        if (!lr.success) { setErrorMsg(lr.error ?? 'שגיאה בקישור'); return; }
      }

      onSave();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400';
  const labelCls = 'text-xs font-medium text-slate-500 mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">עריכת נתוני שחיטה</h2>
            <p className="text-xs text-slate-400 mt-0.5">{row.factory_name} — {row.date}</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Row 1: date + factory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>תאריך</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>מפעל</label>
              <select value={factoryId} onChange={e => setFactoryId(Number(e.target.value))} className={inputCls}>
                {factories.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: head counts */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>סה״כ ראשים</label>
              <input type="number" min={0} value={totalSlaughtered} onChange={e => setTotalSlaughtered(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>פרות</label>
              <input type="number" min={0} value={cowsCount} onChange={e => setCowsCount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>שוורים</label>
              <input type="number" min={0} value={bullsCount} onChange={e => setBullsCount(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Row 3: kosher counts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: '#cc2200' }}>חלק</label>
              <input type="number" min={0} value={halakCount} onChange={e => setHalakCount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#15803d' }}>מוכשר</label>
              <input type="number" min={0} value={muchsharCount} onChange={e => setMuchsharCount(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Row 4: waste */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">טרף (פירוט)</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>ריאות</label>
                <input type="number" min={0} value={wasteLungs} onChange={e => setWasteLungs(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>פנימי</label>
                <input type="number" min={0} value={wasteInner} onChange={e => setWasteInner(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>חיצוני</label>
                <input type="number" min={0} value={wasteOuter} onChange={e => setWasteOuter(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Link section */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600">ייצור מקושר</p>
            {linkAction === 'keep' && (
              <div className="flex items-center justify-between">
                {row.linked_production_id ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                    <Link2 size={12} />
                    ייצור מתאריך {row.linked_production_date}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 bg-slate-100 rounded-full px-3 py-1">
                    <Unlink size={12} />
                    לא מקושר
                  </span>
                )}
                <div className="flex gap-2">
                  {row.linked_production_id && (
                    <button
                      onClick={() => setLinkAction('unlink')}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      נתק
                    </button>
                  )}
                  <button
                    onClick={handleChangeLink}
                    className="text-xs px-3 py-1.5 border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    {row.linked_production_id ? 'החלף' : 'קשר לייצור'}
                  </button>
                </div>
              </div>
            )}

            {linkAction === 'unlink' && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  הקישור לייצור יוסר בשמירה
                </span>
                <button onClick={() => setLinkAction('keep')} className="text-xs text-slate-500 hover:text-slate-700">
                  ביטול
                </button>
              </div>
            )}

            {linkAction === 'change' && (
              <div className="space-y-2">
                {loadingProduction ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                    <Loader2 size={13} className="animate-spin" />
                    טוען רשומות ייצור פנויות...
                  </div>
                ) : availableProduction.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">אין רשומות ייצור פנויות לקישור</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                    {availableProduction.map(p => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                          selectedProductionId === p.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="prod-link"
                          value={p.id}
                          checked={selectedProductionId === p.id}
                          onChange={() => setSelectedProductionId(p.id)}
                          className="pointer-events-none"
                        />
                        <span className="font-medium">{p.date}</span>
                        {p.halak_quarters != null && (
                          <span className="text-slate-400">
                            חלק: {p.halak_quarters.toLocaleString()} | מוכשר: {p.kosher_quarters?.toLocaleString() ?? '—'}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setLinkAction('keep'); setSelectedProductionId(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-slate-800 rounded-lg hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditProductionModal ──────────────────────────────────────────────────────

function EditProductionModal({
  row,
  factories,
  onSave,
  onCancel,
}: {
  row: ProductionDataRow;
  factories: FactoryOption[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(row.date);
  const [halakQuarters, setHalakQuarters] = useState(String(row.halak_quarters ?? ''));
  const [kosherQuarters, setKosherQuarters] = useState(String(row.kosher_quarters ?? ''));
  const [halakWeight, setHalakWeight] = useState(String(row.halak_weight_kg ?? ''));
  const [kosherWeight, setKosherWeight] = useState(String(row.kosher_weight_kg ?? ''));

  // Link management
  const [linkAction, setLinkAction] = useState<'keep' | 'unlink' | 'change'>('keep');
  const [linkFactoryId, setLinkFactoryId] = useState<number | null>(row.factory_id);
  const [availableSlaughter, setAvailableSlaughter] = useState<SlaughterBatchOption[]>([]);
  const [selectedSlaughterId, setSelectedSlaughterId] = useState<number | null>(null);
  const [loadingSlaughter, setLoadingSlaughter] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLoadSlaughter(fid: number) {
    setLinkFactoryId(fid);
    setLoadingSlaughter(true);
    setSelectedSlaughterId(null);
    const list = await getAvailableSlaughterBatches(fid);
    setAvailableSlaughter(list);
    setLoadingSlaughter(false);
  }

  async function handleChangeLink() {
    setLinkAction('change');
    if (linkFactoryId) {
      await handleLoadSlaughter(linkFactoryId);
    }
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await updateProductionData(row.id, {
        date,
        halak_quarters: Number(halakQuarters),
        kosher_quarters: Number(kosherQuarters),
        halak_weight_kg: Number(halakWeight),
        kosher_weight_kg: Number(kosherWeight),
      });
      if (!res.success) { setErrorMsg(res.error ?? 'שגיאה'); return; }

      if (linkAction === 'unlink' && row.linked_slaughter_id != null) {
        const lr = await setSlaughterProductionLink(row.linked_slaughter_id, null);
        if (!lr.success) { setErrorMsg(lr.error ?? 'שגיאה בקישור'); return; }
      } else if (linkAction === 'change' && selectedSlaughterId != null) {
        const lr = await setSlaughterProductionLink(selectedSlaughterId, row.id);
        if (!lr.success) { setErrorMsg(lr.error ?? 'שגיאה בקישור'); return; }
      }

      onSave();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400';
  const labelCls = 'text-xs font-medium text-slate-500 mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">עריכת נתוני ייצור</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {row.factory_name ? `${row.factory_name} — ` : ''}{row.date}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Date */}
          <div>
            <label className={labelCls}>תאריך</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>

          {/* Quarters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: '#cc2200' }}>רבעים חלק</label>
              <input type="number" min={0} value={halakQuarters} onChange={e => setHalakQuarters(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#15803d' }}>רבעים מוכשר</label>
              <input type="number" min={0} value={kosherQuarters} onChange={e => setKosherQuarters(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Weights */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: '#cc2200' }}>משקל חלק (ק״ג)</label>
              <input type="number" min={0} step="0.1" value={halakWeight} onChange={e => setHalakWeight(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#15803d' }}>משקל מוכשר (ק״ג)</label>
              <input type="number" min={0} step="0.1" value={kosherWeight} onChange={e => setKosherWeight(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Link section */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600">שחיטה מקושרת</p>
            {linkAction === 'keep' && (
              <div className="flex items-center justify-between">
                {row.linked_slaughter_id ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                    <Link2 size={12} />
                    שחיטה מתאריך {row.linked_slaughter_date}
                    {row.factory_name && ` — ${row.factory_name}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 bg-slate-100 rounded-full px-3 py-1">
                    <Unlink size={12} />
                    לא מקושר
                  </span>
                )}
                <div className="flex gap-2">
                  {row.linked_slaughter_id && (
                    <button
                      onClick={() => setLinkAction('unlink')}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      נתק
                    </button>
                  )}
                  <button
                    onClick={handleChangeLink}
                    className="text-xs px-3 py-1.5 border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    {row.linked_slaughter_id ? 'החלף' : 'קשר לשחיטה'}
                  </button>
                </div>
              </div>
            )}

            {linkAction === 'unlink' && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  הקישור לשחיטה יוסר בשמירה
                </span>
                <button onClick={() => setLinkAction('keep')} className="text-xs text-slate-500 hover:text-slate-700">
                  ביטול
                </button>
              </div>
            )}

            {linkAction === 'change' && (
              <div className="space-y-3">
                {/* Factory selector */}
                <div>
                  <label className={labelCls}>בחר מפעל לחיפוש שחיטה פנויה</label>
                  <select
                    value={linkFactoryId ?? ''}
                    onChange={e => handleLoadSlaughter(Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="">-- בחר מפעל --</option>
                    {factories.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {loadingSlaughter ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                    <Loader2 size={13} className="animate-spin" />
                    טוען שחיטות פנויות...
                  </div>
                ) : linkFactoryId && availableSlaughter.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">אין שחיטות פנויות למפעל זה</p>
                ) : availableSlaughter.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                    {availableSlaughter.map(s => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                          selectedSlaughterId === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="slaughter-link"
                          value={s.id}
                          checked={selectedSlaughterId === s.id}
                          onChange={() => setSelectedSlaughterId(s.id)}
                          className="pointer-events-none"
                        />
                        <span className="font-medium">{s.date}</span>
                        <span className="text-slate-400">
                          סה״כ: {s.total_heads.toLocaleString()} | חלק: {s.halak_count.toLocaleString()} | מוכשר: {s.muchshar_count.toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}

                <button
                  onClick={() => { setLinkAction('keep'); setSelectedSlaughterId(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-slate-800 rounded-lg hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
