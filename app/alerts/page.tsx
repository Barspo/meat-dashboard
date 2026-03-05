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
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
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
  upload: { icon: Upload, label: 'העלאות', color: 'text-violet-500' },
};

type FilterType = AlertSeverity | 'all' | 'upload';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  const uploadAlerts = alerts.filter(a => !dismissed.has(a.id) && a.category === 'upload');
  const nonUploadAlerts = alerts.filter(a => !dismissed.has(a.id) && a.category !== 'upload');

  const visibleAlerts = activeFilter === 'upload'
    ? uploadAlerts
    : nonUploadAlerts.filter(a =>
        activeFilter === 'all' || a.severity === activeFilter
      );

  const counts = {
    all: nonUploadAlerts.length,
    error: nonUploadAlerts.filter(a => a.severity === 'error').length,
    warning: nonUploadAlerts.filter(a => a.severity === 'warning').length,
    info: nonUploadAlerts.filter(a => a.severity === 'info').length,
    upload: uploadAlerts.length,
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <SummaryCard
          label="העלאות"
          count={counts.upload}
          icon={Upload}
          colorClass="text-violet-600 bg-violet-50"
          active={activeFilter === 'upload'}
          onClick={() => setActiveFilter('upload')}
        />
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {/* Top bar */}
        {visibleAlerts.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-500">
              מציג {visibleAlerts.length} {activeFilter === 'upload' ? 'רשומות' : 'התראות'}
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
              {activeFilter === 'all' ? 'אין התראות פעילות' : 'אין פריטים בקטגוריה זו'}
            </h3>
            <p className="text-slate-400 text-sm">
              {activeFilter === 'all'
                ? 'כל המדדים בסדר — המערכת פועלת תקין'
                : 'נסה לשנות את הסינון לצפייה בהתראות אחרות'}
            </p>
          </div>
        ) : (
          visibleAlerts.map(alert =>
            alert.category === 'upload'
              ? <UploadAlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
              : <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          )
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

const uploadStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  success: { label: 'הצליח', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  error:   { label: 'שגיאה', bg: 'bg-red-100',     text: 'text-red-700' },
  partial: { label: 'חלקי',  bg: 'bg-amber-100',   text: 'text-amber-700' },
};

const uploadMethodConfig: Record<string, { label: string; bg: string; text: string }> = {
  manual: { label: 'ידני',     bg: 'bg-slate-100',   text: 'text-slate-600' },
  auto:   { label: 'אוטומטי', bg: 'bg-violet-100',  text: 'text-violet-700' },
  api:    { label: 'API',      bg: 'bg-indigo-100',  text: 'text-indigo-700' },
};

function UploadAlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusCfg = uploadStatusConfig[alert.status || ''] ?? { label: alert.status || '—', bg: 'bg-slate-100', text: 'text-slate-600' };
  const methodCfg = uploadMethodConfig[alert.uploadMethod || ''] ?? { label: alert.uploadMethod || '—', bg: 'bg-slate-100', text: 'text-slate-600' };
  const typeLabel = alert.uploadType === 'slaughter' ? 'שחיטה' : alert.uploadType === 'production' ? 'ייצור' : alert.uploadType || '—';

  const borderColor = alert.status === 'error' ? 'border-red-200' : alert.status === 'partial' ? 'border-amber-200' : 'border-slate-200';
  const bgColor = alert.status === 'error' ? 'bg-red-50' : alert.status === 'partial' ? 'bg-amber-50' : 'bg-white';

  return (
    <div className={`rounded-xl border ${bgColor} ${borderColor} group overflow-hidden`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        {/* File icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
          <FileText size={18} className="text-violet-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top: filename + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-slate-800 text-sm truncate max-w-[200px]" title={alert.fileName}>
              {alert.fileName || '—'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${methodCfg.bg} ${methodCfg.text}`}>
              {methodCfg.label}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {typeLabel}
            </span>
          </div>
          {/* Bottom: factory + rows + date */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            {alert.factoryName && alert.factoryName !== '-' && (
              <span className="flex items-center gap-1 font-medium">
                <Factory size={11} />
                {alert.factoryName}
              </span>
            )}
            <span>{alert.date}</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {alert.errorDetails && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              פרטי שגיאה
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-all"
            title="סגור"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded error details */}
      {expanded && alert.errorDetails && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-bold text-red-600 mb-1">פרטי שגיאה:</p>
          <pre className="text-[11px] text-red-700 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {alert.errorDetails}
          </pre>
        </div>
      )}
    </div>
  );
}
