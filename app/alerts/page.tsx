'use client';

import { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  FileX, 
  Activity, 
  ServerCrash,
  Database,
  ArrowLeft
} from 'lucide-react';

// --- סוגי נתונים ---
type Severity = 'critical' | 'warning' | 'info';
type AlertType = 'automation' | 'mismatch' | 'anomaly' | 'system';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  type: AlertType;
  timestamp: string;
  factoryName?: string; // הוספתי הקשר למפעל
  isValidating?: boolean;
  validationError?: string;
}

// --- נתוני דמו חכמים (מותאמים לפרויקט) ---
const INITIAL_ALERTS: Alert[] = [
  {
    id: 'a1',
    title: 'חוסר התאמה: שחיטה מול ייצור',
    description: 'במפעל PULSA (Work ID 1) נרשמו 1,250 ק"ג נכנס, אך בפירוק נספרו רק 1,100 ק"ג. חסר: 150 ק"ג.',
    severity: 'critical',
    type: 'mismatch',
    timestamp: 'לפני 15 דקות',
    factoryName: 'PULSA'
  },
  {
    id: 'a2',
    title: 'חריגת תשואה ב-X9',
    description: 'אחוז סטייקים מתוך X9 במפעל FRIGOMERC ירד ל-8.2% (היעד: 10%-13%).',
    severity: 'warning',
    type: 'anomaly',
    timestamp: 'היום, 09:30',
    factoryName: 'FRIGOMERC'
  },
  {
    id: 'a3',
    title: 'בעיית זיהוי כשרות',
    description: 'נמצאו 5 מוצרים עם סיווג כשרות "Unknown" בקובץ הייצור האחרון. המערכת סיווגה אותם כברירת מחדל ל"מוכשר".',
    severity: 'warning',
    type: 'automation',
    timestamp: 'אתמול, 16:45'
  },
  {
    id: 'a4',
    title: 'סנכרון נתונים הושלם',
    description: 'תהליך טעינת נתונים יומי (ETL) הסתיים בהצלחה. נטענו 75 רשומות חדשות.',
    severity: 'info',
    type: 'system',
    timestamp: 'לפני שעתיים'
  }
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  // סימולציית בדיקה ותיקון מול השרת
  const handleResolve = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isValidating: true, validationError: undefined } : a));

    setTimeout(() => {
      const isFixed = Math.random() > 0.3; // 70% סיכוי להצלחה

      if (isFixed) {
        // הצלחה - הסרת ההתראה
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        // כישלון - הודעת שגיאה
        setAlerts(prev => prev.map(a => a.id === id ? { 
          ...a, 
          isValidating: false, 
          validationError: 'הנתונים ב-DB עדיין לא תואמים. אנא בדוק את קבצי המקור ידנית.' 
        } : a));
      }
    }, 2000);
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  const counts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-800" dir="rtl">
      
      {/* כותרת ראשית */}
      <SectionHeader title="מרכז התראות ובקרה" />

      <div className="max-w-5xl mx-auto px-4">
        
        {/* --- חלק 1: סיכום סטטוס --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatusCard label="התראות פעילות" count={counts.total} color="slate" icon={Bell} />
            <StatusCard label="תקלות קריטיות" count={counts.critical} color="red" icon={AlertCircle} />
            <StatusCard label="אזהרות לטיפול" count={counts.warning} color="orange" icon={AlertTriangle} />
        </div>

        {/* --- חלק 2: פילטרים --- */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex gap-2 overflow-x-auto justify-start md:justify-center">
            <FilterButton label="הכל" active={filter === 'all'} onClick={() => setFilter('all')} count={counts.total} />
            <div className="w-px bg-slate-200 my-2"></div>
            <FilterButton label="קריטי" active={filter === 'critical'} onClick={() => setFilter('critical')} count={counts.critical} color="red" />
            <FilterButton label="אזהרות" active={filter === 'warning'} onClick={() => setFilter('warning')} count={counts.warning} color="orange" />
        </div>

        {/* --- חלק 3: רשימת ההתראות --- */}
        <div className="space-y-4">
            {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
                <AlertItem 
                key={alert.id} 
                alert={alert} 
                onResolve={() => handleResolve(alert.id)} 
                />
            ))
            ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="bg-emerald-50 p-4 rounded-full mb-4">
                    <CheckCircle2 size={48} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-slate-700">המערכת נקייה!</h3>
                <p className="text-slate-400 font-medium">אין התראות חדשות לטיפול כרגע.</p>
            </div>
            )}
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// --- קומפוננטות עזר ---
// ============================================================================

function SectionHeader({ title }: { title: string }) {
   return (
      <div className="relative flex items-center justify-center mb-10 mt-8">
         <div className="absolute left-0 right-0 h-[3px] bg-slate-200 -z-10 rounded-full"></div>
         <h2 className="text-3xl font-black text-slate-800 bg-white px-8 py-3 rounded-2xl shadow-sm border border-slate-100">{title}</h2>
      </div>
   );
}

function StatusCard({ label, count, color, icon: Icon }: any) {
  const styles: any = {
    slate: 'bg-white border-slate-200 text-slate-600',
    red: 'bg-red-50 border-red-100 text-red-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  };

  return (
    <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between transition-all hover:shadow-md ${styles[color]}`}>
      <div>
        <p className="text-xs font-bold uppercase opacity-70 mb-1 tracking-wider">{label}</p>
        <p className="text-5xl font-black">{count}</p>
      </div>
      <div className={`p-4 rounded-full bg-white/50 backdrop-blur-sm`}>
         <Icon size={32} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick, count, color = 'slate' }: any) {
  const styles: any = {
      slate: active ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50',
      red: active ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 hover:bg-red-50',
      orange: active ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-600 hover:bg-orange-50',
  };

  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${styles[color]}`}
    >
      {label}
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
    </button>
  );
}

// --- כרטיס התראה בודד ---
function AlertItem({ alert, onResolve }: { alert: Alert, onResolve: () => void }) {
  const styles = {
    critical: { border: 'border-l-[6px] border-l-red-500', icon: AlertCircle, iconColor: 'text-red-500', bgIcon: 'bg-red-50', title: 'text-red-700' },
    warning: { border: 'border-l-[6px] border-l-orange-500', icon: AlertTriangle, iconColor: 'text-orange-500', bgIcon: 'bg-orange-50', title: 'text-orange-800' },
    info: { border: 'border-l-[6px] border-l-blue-500', icon: Info, iconColor: 'text-blue-500', bgIcon: 'bg-blue-50', title: 'text-blue-800' },
  };

  const style = styles[alert.severity];
  const Icon = style.icon;

  // אייקון לפי סוג
  const TypeIcon = 
    alert.type === 'automation' ? Database : 
    alert.type === 'mismatch' ? FileX : 
    alert.type === 'system' ? ServerCrash : Activity;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md ${style.border}`}>
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        
        {/* תוכן ההתראה */}
        <div className="flex gap-5 w-full">
          <div className={`p-3.5 rounded-2xl flex-shrink-0 ${style.bgIcon} ${style.iconColor}`}>
            <Icon size={28} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h4 className={`text-lg font-black ${style.title}`}>{alert.title}</h4>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5">
                    <TypeIcon size={12} />
                    {alert.timestamp}
                  </span>
                  {alert.factoryName && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-white flex items-center gap-1.5">
                        <Activity size={12} />
                        {alert.factoryName}
                      </span>
                  )}
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-3xl">
              {alert.description}
            </p>
            
            {/* הודעת שגיאה בבדיקה */}
            {alert.validationError && (
              <div className="mt-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
                <X size={16} /> {alert.validationError}
              </div>
            )}
          </div>
        </div>

        {/* כפתור פעולה */}
        <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0 self-center">
          <button 
            onClick={onResolve}
            disabled={alert.isValidating}
            className={`w-full md:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              alert.isValidating 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm'
            }`}
          >
            {alert.isValidating ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> מאמת נתונים...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> סמן כטופל
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}