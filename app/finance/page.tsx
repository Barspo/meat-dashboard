'use client';

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import { Lock } from 'lucide-react';

// נתונים מזויפים לגרף הרקע
const mockData = [
  { name: 'ינו', value: 4000 }, { name: 'פבר', value: 3000 }, { name: 'מרץ', value: 6000 },
  { name: 'אפר', value: 2780 }, { name: 'מאי', value: 1890 }, { name: 'יוני', value: 2390 },
  { name: 'יולי', value: 3490 }, { name: 'אוג', value: 4200 }, { name: 'ספט', value: 7100 },
  { name: 'אוק', value: 5900 }, { name: 'נוב', value: 8500 }, { name: 'דצמ', value: 9800 },
];

export default function FinancePage() {
  return (
    // מיכל ראשי התופס את כל הגובה
    <div className="h-full p-6">
      
      {/* המסגרת הראשית */}
      <div className="h-full bg-slate-900/50 border border-slate-800 rounded-3xl relative overflow-hidden shadow-2xl flex items-center justify-center">
        
        {/* --- שכבה 1: הגרף ברקע (מטושטש) --- */}
        <div className="absolute inset-0 opacity-30 blur-sm scale-110 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.1} />
              {/* הסתרתי את הצירים כדי שיהיה ממש נקי */}
              <XAxis dataKey="name" hide={true} />
              <YAxis hide={true} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* --- שכבה 2: הכיתוב במרכז --- */}
        <div className="relative z-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* אייקון מנעול עדין */}
          <Lock className="w-16 h-16 text-emerald-400 mb-6 opacity-80" />
          
          {/* הטקסט הראשי */}
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight">
            בקרוב...
          </h1>
        </div>

      </div>
    </div>
  );
}