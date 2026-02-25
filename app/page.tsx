'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHomeData, type HomeData } from '@/app/actions/getHomeData';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  Factory, Bell, Upload, Beef, Scale, ArrowLeft,
} from 'lucide-react';

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  if (hour >= 17 && hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatTime(date: Date, tz: string) {
  return date.toLocaleTimeString('he-IL', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDateHe(date: Date, tz: string) {
  return date.toLocaleDateString('he-IL', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDayShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getIsraelHour(date: Date): number {
  const h = parseInt(date.toLocaleTimeString('en-US', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }));
  return isNaN(h) ? date.getHours() : h;
}

export default function DashboardPage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useClock();

  useEffect(() => {
    getHomeData().then(d => { setData(d); setLoading(false); });
  }, []);

  const greeting = getGreeting(getIsraelHour(now));
  const totalAlerts = data ? data.alertCounts.error + data.alertCounts.warning + data.alertCounts.info : 0;
  const hasErrors = (data?.alertCounts.error ?? 0) > 0;
  const hasWarnings = (data?.alertCounts.warning ?? 0) > 0;

  if (loading) return <LoadingState message="טוען לוח בקרה..." />;

  return (
    <div className="space-y-6 pb-24 font-sans text-slate-800" dir="rtl">

      {/* Greeting Banner */}
      <div className="bg-gradient-to-l from-blue-700 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black mb-1">{greeting} 👋</h1>
            <p className="text-blue-100 text-sm">{formatDateHe(now, 'Asia/Jerusalem')}</p>
          </div>
          <div className="flex gap-8">
            <ClockWidget label="ישראל 🇮🇱" time={formatTime(now, 'Asia/Jerusalem')} />
            <div className="w-px bg-blue-500" />
            <ClockWidget label="ברזיל 🇧🇷" time={formatTime(now, 'America/Sao_Paulo')} />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/settings" className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><Factory size={18} /></div>
            <span className="text-xs font-bold text-slate-500">מפעלים פעילים</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{data?.activeFactories ?? 0}</div>
        </Link>

        <Link href="/performance" className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><Beef size={18} /></div>
            <span className="text-xs font-bold text-slate-500">שחיטה אחרונה</span>
          </div>
          <div className="text-lg font-black text-slate-900">
            {data?.recentSlaughterDays[0] ? formatDayShort(data.recentSlaughterDays[0].date) : '—'}
          </div>
          {data?.recentSlaughterDays[0] && (
            <p className="text-xs text-slate-400 mt-1">{data.recentSlaughterDays[0].totalHeads.toLocaleString()} ראשים</p>
          )}
        </Link>

        <Link href="/production" className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><Scale size={18} /></div>
            <span className="text-xs font-bold text-slate-500">ייצור אחרון</span>
          </div>
          <div className="text-lg font-black text-slate-900">
            {data?.recentProductionDays[0] ? formatDayShort(data.recentProductionDays[0].date) : '—'}
          </div>
          {data?.recentProductionDays[0] && (
            <p className="text-xs text-slate-400 mt-1">{Math.round(data.recentProductionDays[0].totalWeightKg).toLocaleString()} ק"ג</p>
          )}
        </Link>

        <Link href="/alerts" className={`rounded-xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${
          hasErrors ? 'bg-orange-50 border-orange-200' :
          hasWarnings ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${hasErrors ? 'bg-orange-100 text-orange-600' : hasWarnings ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <Bell size={18} />
            </div>
            <span className="text-xs font-bold text-slate-500">התראות</span>
          </div>
          <div className={`text-3xl font-black ${hasErrors ? 'text-orange-600' : hasWarnings ? 'text-amber-600' : 'text-slate-400'}`}>{totalAlerts}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {data && data.alertCounts.error > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">{data.alertCounts.error} קריטי</span>}
            {data && data.alertCounts.warning > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">{data.alertCounts.warning} אזהרה</span>}
            {totalAlerts === 0 && <span className="text-[10px] text-slate-400">הכל תקין ✓</span>}
          </div>
        </Link>
      </div>

      {/* Last Activity: Slaughter + Production */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Last Slaughter Days */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-1.5 rounded-lg"><Beef size={16} className="text-amber-600" /></div>
              <h3 className="font-black text-slate-800 text-sm">3 ימי שחיטה אחרונים</h3>
            </div>
            <Link href="/performance" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              לביצועים <ArrowLeft size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data && data.recentSlaughterDays.length > 0 ? data.recentSlaughterDays.map((d, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{formatDayShort(d.date)}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{d.factories.join(', ')}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black text-slate-800">{d.totalHeads.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 text-left">ראשים</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">אין נתוני שחיטה אחרונים</div>
            )}
          </div>
        </div>

        {/* Last Production Days */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-lg"><Scale size={16} className="text-blue-600" /></div>
              <h3 className="font-black text-slate-800 text-sm">3 ימי ייצור אחרונים</h3>
            </div>
            <Link href="/production" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              לייצור <ArrowLeft size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data && data.recentProductionDays.length > 0 ? data.recentProductionDays.map((d, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{formatDayShort(d.date)}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{d.factories.join(', ')}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black text-slate-800">{Math.round(d.totalWeightKg).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 text-left">ק"ג</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">אין נתוני ייצור אחרונים</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-1.5 rounded-lg"><Upload size={16} className="text-blue-600" /></div>
            <h3 className="font-black text-slate-800 text-sm">העלאות אחרונות</h3>
          </div>
          <Link href="/upload" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
            להעלאה <ArrowLeft size={12} />
          </Link>
        </div>
        {data && data.recentUploads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-bold">
                <tr>
                  <th className="px-5 py-3">קובץ</th>
                  <th className="px-5 py-3">סוג</th>
                  <th className="px-5 py-3">מפעל</th>
                  <th className="px-5 py-3">שורות</th>
                  <th className="px-5 py-3">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentUploads.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-xs font-mono text-slate-600 max-w-[180px] truncate">{u.fileName}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.uploadType === 'slaughter' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {u.uploadType === 'slaughter' ? 'שחיטה' : 'ייצור'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{u.factoryName}</td>
                    <td className="px-5 py-3 text-xs font-mono tabular-nums text-slate-700">{u.rowsImported}</td>
                    <td className="px-5 py-3"><UploadStatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">לא בוצעו העלאות עדיין</div>
        )}
      </div>

    </div>
  );
}

function ClockWidget({ label, time }: { label: string; time: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums tracking-tight">{time}</p>
    </div>
  );
}

function UploadStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: 'הצלחה', cls: 'bg-blue-50 text-blue-700' },
    partial: { label: 'חלקי', cls: 'bg-amber-50 text-amber-700' },
    error: { label: 'שגיאה', cls: 'bg-orange-50 text-orange-700' },
    processing: { label: 'בעיבוד', cls: 'bg-blue-50 text-blue-700' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
