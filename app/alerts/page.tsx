'use client';

import { useState, useEffect } from 'react';
import { getAlerts, Alert, AlertSeverity, AlertCategory } from '@/app/actions/getAlerts';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Factory,
  Trash2,
  RefreshCw,
  Loader2,
  Scale,
  Package,
  Beef,
  Settings2,
} from 'lucide-react';

const severityConfig: Record<AlertSeverity, {
  bg: string; border: string; icon: React.ElementType; iconColor: string; label: string; badgeClass: string;
}> = {
  error: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: AlertCircle,
    iconColor: 'text-orange-500',
    label: 'קריטי',
    badgeClass: 'bg-orange-100 text-orange-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'אזהרה',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    label: 'מידע',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  success: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: CheckCircle2,
    iconColor: 'text-slate-400',
    label: 'תקין',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
};

const categoryConfig: Record<AlertCategory, { icon: React.ElementType; label: string; color: string }> = {
  waste: { icon: AlertTriangle, label: 'פחת', color: 'text-orange-500' },
  production: { icon: Package, label: 'ייצור', color: 'text-blue-500' },
  slaughter: { icon: Beef, label: 'שחיטה', color: 'text-amber-600' },
  system: { icon: Settings2, label: 'מערכת', color: 'text-slate-500' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<AlertSeverity | 'all'>('all');

  async function load() {
    setLoading(true);
    try {
      const data = await getAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visibleAlerts = alerts.filter(a =>
    !dismissed.has(a.id) &&
    (activeFilter === 'all' || a.severity === activeFilter)
  );

  const counts = {
    all: alerts.filter(a => !dismissed.has(a.id)).length,
    error: alerts.filter(a => !dismissed.has(a.id) && a.severity === 'error').length,
    warning: alerts.filter(a => !dismissed.has(a.id) && a.severity === 'warning').length,
    info: alerts.filter(a => !dismissed.has(a.id) && a.severity === 'info').length,
  };

  const dismissAlert = (id: string) => setDismissed(prev => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(visibleAlerts.map(a => a.id)));

  return (
    <div className="space-y-8 pb-24 font-sans text-slate-800" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">מרכז התראות</h1>
          <p className="text-sm text-slate-400 mt-1">התראות ואזהרות בזמן אמת על בסיס נתוני המערכת</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          רענן
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="סה״כ התראות"
          count={counts.all}
          icon={Bell}
          colorClass="text-slate-600 bg-slate-100"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <SummaryCard
          label="קריטי"
          count={counts.error}
          icon={AlertCircle}
          colorClass="text-orange-600 bg-orange-50"
          active={activeFilter === 'error'}
          onClick={() => setActiveFilter('error')}
        />
        <SummaryCard
          label="אזהרות"
          count={counts.warning}
          icon={AlertTriangle}
          colorClass="text-amber-600 bg-amber-50"
          active={activeFilter === 'warning'}
          onClick={() => setActiveFilter('warning')}
        />
        <SummaryCard
          label="מידע"
          count={counts.info}
          icon={Info}
          colorClass="text-blue-600 bg-blue-50"
          active={activeFilter === 'info'}
          onClick={() => setActiveFilter('info')}
        />
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {/* Top bar */}
        {visibleAlerts.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-500">
              מציג {visibleAlerts.length} התראות
            </span>
            <button
              onClick={dismissAll}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              נקה הכל
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={36} />
            <p className="text-slate-400 font-medium">בודק התראות...</p>
          </div>
        ) : visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <div className="bg-blue-50 p-5 rounded-full mb-4">
              <CheckCircle2 size={48} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-1">
              {activeFilter === 'all' ? 'אין התראות פעילות' : 'אין התראות בקטגוריה זו'}
            </h3>
            <p className="text-slate-400 text-sm">
              {activeFilter === 'all'
                ? 'כל המדדים בסדר — המערכת פועלת תקין'
                : 'נסה לשנות את הסינון לצפייה בהתראות אחרות'}
            </p>
          </div>
        ) : (
          visibleAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))
        )}
      </div>

      {/* Info footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-400 text-center">
        התראות מתבססות על נתוני 30 הימים האחרונים &middot; עדכון אחרון: {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function SummaryCard({
  label, count, icon: Icon, colorClass, active, onClick,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border-2 shadow-sm text-center cursor-pointer transition-all hover:shadow-md ${
        active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center mx-auto mb-2`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-black text-slate-800">{count}</div>
      <div className="text-xs font-bold text-slate-400 mt-0.5">{label}</div>
    </button>
  );
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const sev = severityConfig[alert.severity];
  const cat = categoryConfig[alert.category];
  const SevIcon = sev.icon;
  const CatIcon = cat.icon;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${sev.bg} ${sev.border} group`}>
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${sev.iconColor}`}>
        <SevIcon size={22} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-black text-slate-800 text-sm">{alert.title}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badgeClass}`}>
            {sev.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <CatIcon size={12} className={cat.color} />
            {cat.label}
          </span>
        </div>

        <p className="text-sm text-slate-600 mb-2">{alert.message}</p>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          {alert.factoryName && (
            <span className="flex items-center gap-1 font-medium">
              <Factory size={12} />
              {alert.factoryName}
            </span>
          )}
          {alert.value !== undefined && alert.threshold !== undefined && (
            <span className="flex items-center gap-1 font-bold">
              <Scale size={12} />
              {alert.value.toFixed(1)}% / סף: {alert.threshold}%
            </span>
          )}
          <span>{alert.date}</span>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
        title="סגור"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
