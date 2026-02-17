'use client';
import { AlertTriangle, ArrowUpRight, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [timeIL, setTimeIL] = useState('');
  const [timeBR, setTimeBR] = useState('');

  // שעון חי
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeIL(now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }));
      setTimeBR(now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      
      {/* 1. כותרת ברכה ושעונים */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">צהריים טובים, ישראל 👋</h1>
          <p className="text-slate-500 mt-1">{today}</p>
        </div>

        {/* שעונים */}
        <div className="flex gap-4">
          <TimeCard label="ישראל 🇮🇱" time={timeIL} />
          <TimeCard label="ברזיל 🇧🇷" time={timeBR} />
        </div>
      </div>

      {/* 2. אזור התראות אחרונות (בולט לעין) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* כרטיס התראות - תופס 2/3 מהרוחב */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              התראות אחרונות לטיפול
            </h3>
            <button className="text-xs text-blue-600 font-medium hover:underline">לכל ההתראות &larr;</button>
          </div>
          
          <div className="p-0">
            {/* התראה 1 */}
            <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-red-500 -shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">פער קריטי בנתוני שחיטה (Pulsa)</p>
                <p className="text-xs text-slate-500 mt-1">זוהה פער של 14 ראשים בין יומן השחיטה לכניסה לפירוק.</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">12:30</span>
            </div>

            {/* התראה 2 */}
            <div className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-orange-400 shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">נתוני ייצור ללא שיוך</p>
                <p className="text-xs text-slate-500 mt-1">נמצאו 45 קרטונים ללא מספר Work Order תקין.</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">10:15</span>
            </div>
          </div>
        </div>

        {/* כרטיס מדד כללי (דמו - ירוק חיובי) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">תפוקה יומית כוללת</p>
            <h3 className="text-3xl font-bold text-slate-900">24,892 <span className="text-lg font-normal text-slate-500">ק"ג</span></h3>
          </div>
          
          <div className="flex items-center gap-2 mt-4 text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
            <ArrowUpRight size={16} />
            <span className="text-xs font-bold">+12.5% מאתמול</span>
          </div>
        </div>

      </div>

      {/* 3. שורת נתונים נוספת (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* כאן נוסיף בהמשך עוד נתונים */}
         <div className="h-32 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
            נתון עתידי 1
         </div>
         <div className="h-32 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
            נתון עתידי 2
         </div>
         <div className="h-32 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
            נתון עתידי 3
         </div>
         <div className="h-32 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm">
            נתון עתידי 4
         </div>
      </div>

    </div>
  );
}

// קומפוננטה קטנה לשעון כדי לחסוך קוד
function TimeCard({ label, time }: { label: string, time: string }) {
  return (
    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
      <div className="bg-slate-100 p-1.5 rounded text-slate-500">
        <Clock size={16} />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-900 min-w-12.5">{time || '--:--'}</p>
      </div>
    </div>
  );
}