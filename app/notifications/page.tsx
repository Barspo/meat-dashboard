'use client';

import { AlertTriangle, AlertOctagon, FileX, Database, CheckCircle2, Clock } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* כותרת */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            מרכז התראות (Alert Center)
          </h1>
          <p className="text-slate-400 mt-2">ישנן 2 בעיות פתוחות הדורשות את תשומת לבך</p>
        </div>
        <button className="text-sm text-blue-400 hover:text-blue-300 underline">
          סמן הכל כנקרא
        </button>
      </div>

      <div className="space-y-4">

        {/* --- התראה 1: קריטית (אדום) --- */}
        <div className="bg-slate-900 border-r-4 border-r-red-500 rounded-lg p-6 shadow-lg flex gap-5 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-red-500/10 p-3 h-fit rounded-full">
            <AlertOctagon className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-white">חוסר התאמה בנתוני שקילה (Critical)</h3>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock size={12} /> לפני שעה
              </span>
            </div>
            <p className="text-slate-300 mb-4">
              התגלה פער של <strong className="text-white">1,240 ק"ג</strong> בין נתוני השחיטה לבין נתוני הקיצוב במפעל <strong>Minerva</strong> בתאריך 05/02.
              המערכת עצרה את הפקת הדוחות הסופיים עד לבירור הפער.
            </p>
            
            {/* כפתורי פעולה */}
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                צפה בדו"ח חריגים
              </button>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors">
                דווח למנהל המפעל
              </button>
            </div>
          </div>
        </div>

        {/* --- התראה 2: בינונית (כתום) --- */}
        <div className="bg-slate-900 border-r-4 border-r-orange-500 rounded-lg p-6 shadow-lg flex gap-5 animate-in slide-in-from-right-4 duration-700 delay-100">
          <div className="bg-orange-500/10 p-3 h-fit rounded-full">
            <FileX className="w-8 h-8 text-orange-500" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-white">קובץ ייצור חסר</h3>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock size={12} /> לפני 3 שעות
              </span>
            </div>
            <p className="text-slate-300 mb-4">
              המערכת לא קיבלה את קובץ ה-XML היומי ממפעל <strong>Black Bamboo</strong>.
              הנתונים המוצגים בדשבורד אינם מעודכנים להיום.
            </p>
            
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors border border-slate-700">
                נסה למשוך קובץ שוב
              </button>
            </div>
          </div>
        </div>

        {/* --- דוגמה להתראה ישנה שטופלה (אפור) - רק לאווירה --- */}
        <div className="bg-slate-900/50 border-r-4 border-r-green-500/50 rounded-lg p-6 flex gap-5 opacity-60">
          <div className="bg-green-500/10 p-3 h-fit rounded-full">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-400 line-through">עדכון גרסה למסופונים</h3>
            <p className="text-slate-500 text-sm">העדכון בוצע בהצלחה בכל המפעלים.</p>
          </div>
        </div>

      </div>
    </div>
  );
}