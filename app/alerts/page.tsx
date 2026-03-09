'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, Info, ChevronDown, Loader2, Link2, BarChart3,
  Building2, Upload, ListFilter, Search,
} from 'lucide-react';
import { getAlerts, type AlertItem, type AlertType } from '@/app/actions/getAlerts';
import { getSeasons, type Season } from '@/app/actions/settingsActions';
import { DateRangePicker } from '@/components/DateRangePicker';

const TYPE_OPTIONS: { value: AlertType | 'all'; label: string; icon: typeof Link2 }[] = [
  { value: 'all',           label: 'כל הסוגים',    icon: ListFilter },
  { value: 'file_matching', label: 'שיוך קבצים',   icon: Link2 },
  { value: 'anomaly',       label: 'נתונים חריגים', icon: BarChart3 },
  { value: 'factory',       label: 'מפעלים',       icon: Building2 },
  { value: 'upload',        label: 'העלאות',        icon: Upload },
];

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertCircle; bg: string; text: string; border: string }> = {
  error:   { icon: AlertCircle,   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  info:    { icon: Info,          bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
};

const TYPE_COLORS: Record<string, string> = {
  file_matching: 'bg-purple-50 text-purple-700 border-purple-200',
  anomaly:       'bg-red-50 text-red-700 border-red-200',
  factory:       'bg-amber-50 text-amber-700 border-amber-200',
  upload:        'bg-blue-50 text-blue-700 border-blue-200',
};

export default function AlertsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | null>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(now);
  const [selectedSeasonName, setSelectedSeasonName] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');
  const [uploadStatus, setUploadStatus] = useState<'all' | 'success' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getSeasons().then(setSeasons); }, []);

  useEffect(() => {
    fetchAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedType, uploadStatus]);

  async function fetchAlerts() {
    setLoading(true);
    const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;
    const result = await getAlerts({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      type: selectedType,
      uploadStatus,
    });
    setAlerts(result);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return alerts;
    const term = searchTerm.trim().toLowerCase();
    return alerts.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.detail.toLowerCase().includes(term) ||
      a.type_label.toLowerCase().includes(term)
    );
  }, [alerts, searchTerm]);

  // Counts by type
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: alerts.length, file_matching: 0, anomaly: 0, factory: 0, upload: 0 };
    alerts.forEach(a => { c[a.type] = (c[a.type] || 0) + 1; });
    return c;
  }, [alerts]);

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">מרכז התראות</h1>
        <p className="text-sm text-slate-400 mt-1">מעקב אחר שיוך קבצים, נתונים חריגים, מפעלים והעלאות</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-start">
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

        {/* Type filter */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">סוג התראה</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedType(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedType === opt.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <opt.icon size={13} />
                {opt.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedType === opt.value ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}>{counts[opt.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload status filter (only when type = upload) */}
        {selectedType === 'upload' && (
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">סטטוס העלאה</span>
            <div className="flex items-center gap-1.5">
              {(['all', 'success', 'error'] as const).map(s => (
                <button key={s} onClick={() => setUploadStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    uploadStatus === s
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {s === 'all' ? 'הכל' : s === 'success' ? 'הצליח' : 'נכשל'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <span className="block text-[10px] font-bold text-transparent uppercase tracking-wider mb-1.5 select-none">.</span>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="חיפוש בהתראות..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={36} />
          <p className="text-slate-400 text-sm">טוען התראות...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
          <AlertCircle className="text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-500">{alerts.length === 0 ? 'לא נמצאו התראות בטווח הנבחר' : 'לא נמצאו התאמות לחיפוש'}</h3>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-5 py-3.5 w-8"></th>
                <th className="px-5 py-3.5">שם התראה</th>
                <th className="px-5 py-3.5">פירוט</th>
                <th className="px-5 py-3.5 w-32">סוג</th>
                <th className="px-5 py-3.5 w-28">תאריך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(alert => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                const SevIcon = sev.icon;
                const typeColor = TYPE_COLORS[alert.type] || 'bg-slate-50 text-slate-600 border-slate-200';
                return (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${sev.bg}`}>
                        <SevIcon size={14} className={sev.text} />
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-800 text-sm">{alert.name}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-md">{alert.detail}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${typeColor}`}>
                        {alert.type_label}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{alert.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-400 text-center">
            {filtered.length} התראות
          </div>
        </div>
      )}
    </div>
  );
}
