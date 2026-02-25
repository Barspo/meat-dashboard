'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFactoryPerformance } from '@/app/actions/getFactoryPerformance';
import { getSeasons, type Season } from '@/app/actions/settingsActions';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown, 
  X, 
  Eye, 
  Factory, 
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';

// --- Types ---
interface FactoryData {
  id: string;
  name: string;
  total: number;
  cows: number;
  bulls: number;
  halak: number;
  muchshar: number;
  wasteTotal: number;
  waste1: number;
  waste2: number;
  waste3: number;
}

// הגדרת העמודות
const COLUMNS_CONFIG = [
  { key: 'total', label: 'סה״כ שחיטות', type: 'simple' },
  { key: 'cows', label: 'פרות', type: 'percent_total' },     
  { key: 'bulls', label: 'שוורים', type: 'percent_total' },   
  { key: 'halak', label: 'חלק', type: 'percent_total' },      
  { key: 'muchshar', label: 'מוכשר', type: 'percent_total' }, 
  { key: 'wasteTotal', label: 'סה״כ פחת', type: 'percent_total', isNegative: true }, 
  { key: 'waste1', label: 'פחת ריאות', type: 'percent_waste', isNegative: true }, 
  { key: 'waste2', label: 'פחת כרס', type: 'percent_waste', isNegative: true }, 
  { key: 'waste3', label: 'פחת כללי', type: 'percent_waste', isNegative: true }, 
];

export default function PerformancePage() {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FactoryData[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30))); // חודש אחורה דיפולט
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // UI State
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS_CONFIG.map(c => c.key));
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });

  // Load seasons once
  useEffect(() => {
    getSeasons().then(setSeasons);
  }, []);

  // --- Fetch Data ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const formatDateLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const res = await getFactoryPerformance(formatDateLocal(startDate), formatDateLocal(endDate));
        setData(res);

        if (selectedFactoryIds.length === 0 && res.length > 0) {
            setSelectedFactoryIds(res.map((f: any) => f.id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate]);

  // --- Logic ---
  const filteredData = useMemo(() => {
    let filtered = data.filter(f => selectedFactoryIds.includes(f.id));

    return filtered.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, selectedFactoryIds, sortConfig]);

  // --- Handlers ---
  const toggleFactory = (id: string) => {
    if (selectedFactoryIds.includes(id)) {
      if (selectedFactoryIds.length === 1) return; 
      setSelectedFactoryIds(prev => prev.filter(fid => fid !== id));
    } else {
      setSelectedFactoryIds(prev => [...prev, id]);
    }
  };

  const toggleColumnVisibility = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(prev => prev.filter(c => c !== key));
    } else {
      const newVisible = [...visibleColumns, key];
      newVisible.sort((a, b) => COLUMNS_CONFIG.findIndex(c => c.key === a) - COLUMNS_CONFIG.findIndex(c => c.key === b));
      setVisibleColumns(newVisible);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(curr => ({
      key,
      direction: curr.key === key && curr.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Calendar Logic
  const handleDayClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null as any);
    } else if (startDate && !endDate && day >= startDate) {
      setEndDate(day);
      setIsCalendarOpen(false);
    } else {
      setStartDate(day);
      setEndDate(null as any);
    }
  };
  
  // Select All / Deselect All for Factories
  const allFactoryIds = data.map(f => f.id);
  const handleSelectAllFactories = () => setSelectedFactoryIds(allFactoryIds);
  const handleDeselectAllFactories = () => {
    if (allFactoryIds.length > 0) setSelectedFactoryIds([allFactoryIds[0]]);
  };

  // Select All / Deselect All for Columns
  const handleSelectAllColumns = () => setVisibleColumns(COLUMNS_CONFIG.map(c => c.key));
  const handleDeselectAllColumns = () => {
    // Keep at least 'total' visible
    setVisibleColumns(['total']);
  };

  // Quick Filters Handlers
  const handleToday = () => {
     const today = new Date();
     setStartDate(today);
     setEndDate(today);
  };

  const handleYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setStartDate(yesterday);
    setEndDate(yesterday);
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    setStartDate(start);
    setEndDate(today);
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(start);
    setEndDate(today);
  };

  const dateLabel = startDate && endDate ? `${startDate.toLocaleDateString('he-IL')} - ${endDate.toLocaleDateString('he-IL')}` : 'בחירת תאריכים';

  return (
    <div className="space-y-8 pb-24 font-sans text-slate-800" dir="rtl">

      {/* Top Toolbar (Filters) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative z-30">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          
          {/* Factory Selector */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">סינון מפעלים</label>
              <button onClick={handleSelectAllFactories} className="text-[10px] font-bold text-blue-600 hover:underline">בחר הכל</button>
              <span className="text-slate-300">|</span>
              <button onClick={handleDeselectAllFactories} className="text-[10px] font-bold text-slate-400 hover:underline">בטל בחירה</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.map(factory => {
                const isSelected = selectedFactoryIds.includes(factory.id);
                return (
                  <button
                    key={factory.id}
                    onClick={() => toggleFactory(factory.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    } ${isSelected && selectedFactoryIds.length === 1 ? 'opacity-80 cursor-not-allowed' : ''}`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                    {factory.name}
                  </button>
                )
              })}
              {data.length === 0 && !loading && <span className="text-sm text-slate-400">טוען רשימת מפעלים...</span>}
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-slate-200"></div>

          {/* Date Picker */}
          <div>
             <label className="text-[11px] font-bold text-slate-400 mb-2 block uppercase tracking-wide">טווח זמן</label>
             <div className="flex gap-2">
                <div className="relative">
                    <button 
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all w-64 justify-between ${
                        isCalendarOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={18} />
                            <span>{dateLabel}</span>
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {isCalendarOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl p-5 z-50 w-[340px]">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                                <span className="font-bold text-lg">{currentCalendarMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-medium">{['א','ב','ג','ד','ה','ו','ש'].map(d => <div key={d}>{d}</div>)}</div>
                            <div className="grid grid-cols-7 gap-1">
                                {generateCalendarDays(currentCalendarMonth).map((day, i) => {
                                    if (!day) return <div key={i} />;
                                    const isStart = startDate && day.getTime() === startDate.getTime();
                                    const isEnd = endDate && day.getTime() === endDate.getTime();
                                    const inRange = startDate && endDate && day > startDate && day < endDate;
                                    return (<button key={i} onClick={() => handleDayClick(day)} className={`h-9 rounded-lg text-sm font-medium transition-all ${isStart || isEnd ? 'bg-blue-600 text-white' : inRange ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'}`}>{day.getDate()}</button>);
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* קיצורי דרך */}
                <div className="flex gap-1 flex-wrap">
                    <ShortcutBtn onClick={handleToday} label="היום" />
                    <ShortcutBtn onClick={handleYesterday} label="אתמול" />
                    <ShortcutBtn onClick={handleCurrentWeek} label="שבוע נוכחי" />
                    <ShortcutBtn onClick={handleCurrentMonth} label="חודש נוכחי" />
                    {seasons.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setIsSeasonOpen(v => !v)}
                          className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                        >
                          עונה <ChevronDown size={12} />
                        </button>
                        {isSeasonOpen && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 min-w-[160px] py-1">
                            {seasons.map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setStartDate(new Date(s.start_date + 'T12:00:00'));
                                  setEndDate(new Date(s.end_date + 'T12:00:00'));
                                  setIsSeasonOpen(false);
                                }}
                                className="w-full text-right px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between gap-2"
                              >
                                <span>{s.name}</span>
                                {s.is_active && <span className="text-[10px] text-blue-600 font-bold">פעיל</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {isSeasonOpen && <div className="fixed inset-0 z-40" onClick={() => setIsSeasonOpen(false)} />}
                      </div>
                    )}
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      {loading ? (
         <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
            <p className="text-slate-400 font-medium">מעבד נתוני שחיטה...</p>
         </div>
      ) : data.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 mx-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <AlertCircle className="text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-500">אין נתונים בטווח הנבחר</h3>
         </div>
      ) : (
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <SectionHeader title="דוח ביצועי שחיטה השוואתי" />

        {/* Column Manager */}
        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-2 text-slate-500 shrink-0">
              <Eye size={18} />
              <span className="text-xs font-bold uppercase">ניהול עמודות:</span>
              <button onClick={handleSelectAllColumns} className="text-[10px] font-bold text-blue-600 hover:underline">הכל</button>
              <span className="text-slate-300">|</span>
              <button onClick={handleDeselectAllColumns} className="text-[10px] font-bold text-slate-400 hover:underline">נקה</button>
           </div>
           <div className="flex flex-wrap gap-2">
              {COLUMNS_CONFIG.map(col => {
                 const isVisible = visibleColumns.includes(col.key);
                 return (
                    <button
                       key={col.key}
                       onClick={() => toggleColumnVisibility(col.key)}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          isVisible
                             ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200'
                             : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 decoration-dashed'
                       }`}
                    >
                       {col.label}
                    </button>
                 );
              })}
           </div>
        </div>

        {/* The Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[1000px]">
            
            {/* Headers */}
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wide text-xs">
              <tr>
                <th className="px-6 py-4 w-56 sticky right-0 bg-slate-50 z-10 border-l border-slate-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <Factory size={16} className="text-slate-400"/>
                    שם המפעל
                  </div>
                </th>

                {COLUMNS_CONFIG.filter(c => visibleColumns.includes(c.key)).map(col => (
                  <th key={col.key} className="px-6 py-4 group min-w-[140px]">
                    <div className="flex items-center justify-between cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort(col.key)}>
                        <span>{col.label}</span>
                        <div className="flex items-center gap-1">
                           <ArrowUpDown size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortConfig.key === col.key ? 'opacity-100 text-blue-600' : ''}`} />
                           <button
                              onClick={(e) => { e.stopPropagation(); toggleColumnVisibility(col.key); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 hover:text-slate-600 rounded transition-all"
                              title="הסתר עמודה"
                           >
                              <X size={12} />
                           </button>
                        </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                  
                  {/* Factory Name (Sticky) */}
                  <td className="px-6 py-5 font-bold text-slate-800 sticky right-0 bg-white group-hover:bg-blue-50/30 border-l border-slate-100 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] transition-colors text-base">
                    {row.name}
                  </td>

                  {/* Dynamic Cells */}
                  {COLUMNS_CONFIG.filter(c => visibleColumns.includes(c.key)).map(col => {
                    const value = (row as any)[col.key];
                    let percentage = 0;
                    
                    if (col.type === 'percent_total') {
                       percentage = row.total > 0 ? (value / row.total) * 100 : 0;
                    } else if (col.type === 'percent_waste') {
                       // חישוב אחוז פחת מתוך סך הפחת
                       percentage = row.wasteTotal > 0 ? (value / row.wasteTotal) * 100 : 0;
                    }

                    const isNegative = col.isNegative; // For red colors (waste)

                    const colorClass = isNegative
                      ? 'text-orange-600'
                      : col.key === 'halak'
                        ? 'text-red-700'
                        : col.key === 'muchshar'
                          ? 'text-emerald-800'
                          : 'text-slate-700';

                    const pctColorClass = isNegative
                      ? 'text-orange-500 bg-orange-50'
                      : col.key === 'halak'
                        ? 'text-red-600 bg-red-50'
                        : col.key === 'muchshar'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-500 bg-slate-50';

                    return (
                      <td key={`${row.id}-${col.key}`} className="px-6 py-5">
                        <div className="flex flex-col">
                           <span className={`text-lg font-mono font-bold tracking-tight ${colorClass}`}>
                              {value.toLocaleString()}
                           </span>

                           {col.type !== 'simple' && (
                              <span className={`text-sm font-black mt-0.5 px-2 py-0.5 rounded w-fit ${pctColorClass}`}>
                                 {percentage.toFixed(1)}%
                              </span>
                           )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}

// Helpers
function SectionHeader({ title }: { title: string }) {
   return (
      <div className="relative flex items-center justify-center mb-8 mt-4">
         <div className="absolute left-0 right-0 h-[3px] bg-slate-100 -z-10 rounded-full"></div>
         <h2 className="text-2xl font-black text-slate-800 bg-white px-8 py-2 rounded-2xl shadow-sm border border-slate-100">{title}</h2>
      </div>
   );
}

function ShortcutBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 whitespace-nowrap"
    >
      {label}
    </button>
  );
}

function generateCalendarDays(currentDate: Date) {
   const year = currentDate.getFullYear();
   const month = currentDate.getMonth();
   const daysInMonth = new Date(year, month + 1, 0).getDate();
   const startingDayOfWeek = new Date(year, month, 1).getDay();
   const days: (Date | null)[] = [];
   for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
   for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
   return days;
}