'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area
} from 'recharts';
import { Calendar, Filter, ChevronDown, Activity, Box, Scale, TrendingUp } from 'lucide-react';

export default function PerformanceClient({ factories }: { factories: any[] }) {
  // --- ניהול מצב (State) ---
  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- פונקציות עזר לתאריכים ---
  const setQuickDate = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    const end = new Date();
    const start = new Date();
    
    if (type === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (type === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (type === 'month') {
      start.setMonth(start.getMonth() - 1);
    }
    
    // המרה לפורמט YYYY-MM-DD
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  // --- שליפת נתונים מהשרת ---
  useEffect(() => {
    if (!selectedFactory || !dateRange.start || !dateRange.end) return;

    const fetchData = async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const params = new URLSearchParams({
          factoryId: selectedFactory,
          startDate: dateRange.start,
          endDate: dateRange.end
        });
        const res = await fetch(`/api/performance?${params}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFactory, dateRange]);

  // --- תצוגת KPI Card ---
  const KpiCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* --- סרגל פילטור עליון --- */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex flex-wrap gap-4 items-end">
        
        {/* בחירת מפעל */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-slate-400 mb-1 block">בחר מפעל</label>
          <div className="relative">
            <select 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
            >
              <option value="" disabled>-- בחר מהרשימה --</option>
              {factories.map((f) => (
                <option key={f.factory_id} value={f.factory_id}>{f.name} ({f.country})</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-3.5 text-slate-500 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {/* בחירת תאריכים */}
        <div className="flex gap-2">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">מתאריך</label>
            <input 
              type="date" 
              className="bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">עד תאריך</label>
            <input 
              type="date" 
              className="bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
        </div>

        {/* כפתורים מהירים */}
        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            { label: 'היום', val: 'today' },
            { label: 'אתמול', val: 'yesterday' },
            { label: 'השבוע', val: 'week' },
            { label: 'החודש', val: 'month' }
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => setQuickDate(btn.val as any)}
              className="px-3 py-1.5 text-sm rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- מצב 1: לא נבחר כלום --- */}
      {!selectedFactory && (
        <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
          <Filter className="w-16 h-16 mb-4 opacity-50" />
          <h3 className="text-xl font-medium">אנא בחר מפעל כדי להתחיל</h3>
          <p>בחר מפעל וטווח תאריכים כדי לראות נתונים</p>
        </div>
      )}

      {/* --- מצב 2: טעינה --- */}
      {loading && (
        <div className="h-[400px] flex items-center justify-center text-blue-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      )}

      {/* --- מצב 3: אין נתונים --- */}
      {!loading && hasSearched && data && (!data.kpi || !data.kpi.total_weight) && (
        <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl">
          <Calendar className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg">לא נמצאו נתונים לתקופה זו</p>
          <button onClick={() => setQuickDate('month')} className="mt-2 text-blue-400 hover:underline">
             נסה חודש אחרון
          </button>
        </div>
      )}

      {/* --- מצב 4: הצגת הדשבורד! --- */}
      {!loading && data && data.kpi && data.kpi.total_weight && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          {/* שורת ה-KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard title="סה״כ משקל (ק״ג)" value={Number(data.kpi.total_weight).toLocaleString()} icon={Scale} color="text-blue-500" />
            <KpiCard title="ארגזים" value={Number(data.kpi.total_boxes).toLocaleString()} icon={Box} color="text-purple-500" />
            <KpiCard title="ימי ייצור" value={data.kpi.work_days} icon={Calendar} color="text-orange-500" />
            <KpiCard title="תשואה (Yield)" value={`${data.kpi.yield}%`} icon={TrendingUp} color="text-green-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* גרף ראשי */}
            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                ייצור יומי בתקופה שנבחרה
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="weight" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{r:4}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* טופ מוצרים */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold mb-4 text-white">מוצרים מובילים (Top 5)</h3>
              <div className="space-y-4">
                {data.products.map((p: any, i: number) => (
                  <div key={i} className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{p.name}</span>
                      <span className="text-white font-medium">{p.weight.toLocaleString()} kg</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${(p.weight / data.products[0].weight) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}