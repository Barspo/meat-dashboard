'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProductionData, getFactories, getLastProductionDate } from '@/app/actions/getProductionData';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Scale, 
  Box, 
  Beef, 
  Loader2,
  AlertCircle,
  ArrowLeft,
  UtensilsCrossed,
  ArrowUpDown, 
  Search,
  CheckSquare,
  Square,
  ListFilter
} from 'lucide-react';

// --- Types Definitions ---
interface Product {
  id: string;
  name: string;
  weight: number;
  units: number;
  boxes: number;
  kosher: string;
  department: string;
  customer: string;
  breed: string;
  freshness: string;
  isX9: boolean;
  isSteak: boolean;
}

interface YieldsData {
  total: { in: number; out: number };
  halak: { in: number; out: number };
  muchshar: { in: number; out: number };
  x9: { total: number; halak: number; muchshar: number };
  steaks: { unitsHalak: number; unitsMuchshar: number; weight: number };
}

interface SummaryData {
  days: number;
  totalWeight: number;
  totalUnits: number;
  totalBoxes: number;
  quarters: { halak: number; muchshar: number; total: number };
}

interface ProductionData {
  summary: SummaryData;
  yields: YieldsData;
  tableData: Product[];
  hasData: boolean;
}

interface FilterState {
  kosher: string;
  department: string;
  customer: string;
  breed: string;
  isX9: string;
  isSteak: string;
  freshness: string;
}

export default function ProductionPage() {
  // --- State ---
  const [loading, setLoading] = useState(false);
  const [factories, setFactories] = useState<{id: string, name: string}[]>([]);
  const [selectedFactory, setSelectedFactory] = useState('0');
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  // Data State typed specifically
  const [data, setData] = useState<ProductionData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [filters, setFilters] = useState<FilterState>({ 
    kosher: 'all', 
    department: 'all', 
    customer: 'all', 
    breed: 'all', 
    isX9: 'all', 
    isSteak: 'all', 
    freshness: 'all' 
  });
  
  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product, direction: 'asc' | 'desc' }>({ key: 'weight', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // --- Init ---
  useEffect(() => {
    async function load() {
      const list = await getFactories();
      setFactories([{ id: '0', name: 'בחר מפעל...' }, ...list]);
    }
    load();
  }, []);

  // --- Fetch Data ---
  useEffect(() => {
    async function fetchData() {
      if (selectedFactory === '0') { setData(null); setErrorMsg('אנא בחר מפעל לצפייה בנתונים'); return; }
      if (!startDate || !endDate) { setData(null); setErrorMsg('אנא בחר טווח תאריכים'); return; }
      
      setLoading(true); setErrorMsg('');
      try {
        const formatDateLocal = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const result = await getProductionData(selectedFactory, formatDateLocal(startDate), formatDateLocal(endDate));
        if (result && result.hasData) setData(result);
        else { setData(null); setErrorMsg('אין נתונים בטווח הנבחר'); }
      } catch (e) { console.error(e); setErrorMsg('שגיאה בטעינת הנתונים'); } finally { setLoading(false); }
    }
    fetchData();
  }, [selectedFactory, startDate, endDate]);

  // --- Calendar Helpers ---
  const handleLastDay = async () => { if (selectedFactory === '0') return; const date = await getLastProductionDate(selectedFactory); if (date) { const d = new Date(date); setStartDate(d); setEndDate(d); setCurrentCalendarMonth(d); } };
  const handleCurrentWeek = () => { const today = new Date(); const day = today.getDay(); const start = new Date(today); start.setDate(today.getDate() - day); setStartDate(start); setEndDate(today); setCurrentCalendarMonth(today); };
  const handleCurrentMonth = () => { const today = new Date(); const start = new Date(today.getFullYear(), today.getMonth(), 1); setStartDate(start); setEndDate(today); setCurrentCalendarMonth(today); };
  const handleDayClick = (day: Date) => { if (!startDate || (startDate && endDate)) { setStartDate(day); setEndDate(null); } else if (startDate && !endDate && day >= startDate) { setEndDate(day); setIsCalendarOpen(false); } else { setStartDate(day); setEndDate(null); } };

  // --- Dynamic Options ---
  const dynamicOptions = useMemo(() => {
    if (!data?.tableData) return { departments: [], customers: [], breeds: [] };
    const deps = new Set<string>(), custs = new Set<string>(), breeds = new Set<string>();
    data.tableData.forEach((row) => { 
        if (row.department) deps.add(row.department); 
        if (row.customer) custs.add(row.customer); 
        if (row.breed) breeds.add(row.breed); 
    });
    return { 
        departments: Array.from(deps).sort(), 
        customers: Array.from(custs).sort(), 
        breeds: Array.from(breeds).sort() 
    };
  }, [data]);

  // --- Table Logic ---
  const availableProducts = useMemo(() => {
    if (!data?.tableData) return [];
    return data.tableData.filter((item) => {
      // Kosher Logic
      if (filters.kosher !== 'all') { 
         const isHalak = item.kosher.toLowerCase() === 'halak'; 
         if (filters.kosher === 'halak' && !isHalak) return false; 
         if (filters.kosher === 'muchshar' && isHalak) return false; 
      }
      // Standard Logic
      if (filters.department !== 'all' && item.department !== filters.department) return false;
      if (filters.customer !== 'all' && item.customer !== filters.customer) return false;
      if (filters.breed !== 'all' && item.breed !== filters.breed) return false;
      
      // Freshness Logic
      // השרת כבר מחזיר "Fresh" או "Frozen" מנורמל.
      if (filters.freshness !== 'all' && item.freshness !== filters.freshness) return false;

      // Boolean Logic
      if (filters.isX9 !== 'all') { 
          const isX9 = item.isX9 === true; 
          if (filters.isX9 === 'true' && !isX9) return false; 
          if (filters.isX9 === 'false' && isX9) return false; 
      }
      if (filters.isSteak !== 'all') { 
          const isSteak = item.isSteak === true; 
          if (filters.isSteak === 'true' && !isSteak) return false; 
          if (filters.isSteak === 'false' && isSteak) return false; 
      }
      return true;
    });
  }, [data, filters]);

  const filteredSortedData = useMemo(() => {
    let final = availableProducts.filter((p) => !hiddenProductIds.includes(p.id));
    return [...final].sort((a, b) => {
      // טיפול בערכים שיכולים להיות מחרוזת או מספר
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [availableProducts, hiddenProductIds, sortConfig]);

  const totalPages = Math.ceil(filteredSortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredSortedData.slice(start, start + ITEMS_PER_PAGE); }, [filteredSortedData, currentPage]);
  const tableTotals = useMemo(() => { return filteredSortedData.reduce((acc, curr) => ({ weight: acc.weight + curr.weight, units: acc.units + curr.units, boxes: acc.boxes + curr.boxes }), { weight: 0, units: 0, boxes: 0 }); }, [filteredSortedData]);

  useEffect(() => { setCurrentPage(1); }, [filters, hiddenProductIds]);
  const handleFilterChange = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setHiddenProductIds([]); };
  const toggleProductVisibility = (id: string) => { setHiddenProductIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]); };
  const handleSort = (key: keyof Product) => { setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' })); };

  // --- Calc Vars ---
  const dateLabel = startDate && endDate ? `${startDate.toLocaleDateString('he-IL')} - ${endDate.toLocaleDateString('he-IL')}` : 'בחירת טווח תאריכים';
  const workDays = data?.summary?.days || 1;
  const x9Weight = data?.yields?.x9?.total || 0;
  const steakWeight = data?.yields?.steaks?.weight || 0;
  const steakPercentage = x9Weight > 0 ? (steakWeight / x9Weight) * 100 : 0;
  const isSteakYieldGood = steakPercentage >= 10 && steakPercentage <= 13;

  return (
    <div className="space-y-8 pb-24 font-sans text-slate-800" dir="rtl">
      
      {/* Top Toolbar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3 relative z-30">
        <div className="relative min-w-[200px] h-[40px]">
           <select value={selectedFactory} onChange={(e) => setSelectedFactory(e.target.value)} className={`w-full h-full appearance-none pr-4 pl-10 rounded-xl border font-bold text-sm outline-none focus:ring-2 transition-all cursor-pointer ${selectedFactory === '0' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
             {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
           </select>
           <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
        <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
        <div className="relative">
          <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className={`h-[40px] flex items-center gap-2 px-4 rounded-xl border text-sm font-bold transition-all ${isCalendarOpen || (startDate && endDate) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <CalendarIcon size={18} />
            <span>{dateLabel}</span>
          </button>
          {isCalendarOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl p-5 z-50 w-[340px]">
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
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
           <ShortcutBtn label="יום ייצור אחרון" onClick={handleLastDay} />
           <ShortcutBtn label="השבוע הנוכחי" onClick={handleCurrentWeek} />
           <ShortcutBtn label="החודש הנוכחי" onClick={handleCurrentMonth} />
        </div>
      </div>

      {loading ? ( <div className="flex flex-col items-center justify-center py-32"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/><p className="text-slate-400">מעבד נתונים...</p></div> ) : !data ? ( <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl"><AlertCircle className="text-slate-300 mb-4" size={48} /><h3 className="text-xl font-bold text-slate-500">{errorMsg || 'אנא בצע סינון כדי לראות נתונים'}</h3></div> ) : (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            
            {/* PART 2: KPIs */}
            <section>
                <SectionHeader title="נתונים כלליים" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard icon={CalendarIcon} color="slate" title="ימי ייצור" value={data.summary.days} avgLabel="ימים בפועל" />
                    <StatCard icon={Scale} color="blue" title="משקל כולל" value={data.summary.totalWeight.toLocaleString()} unit='ק"ג' avgValue={(data.summary.totalWeight / workDays).toLocaleString(undefined, {maximumFractionDigits: 0})} avgUnit='ק"ג' />
                    <StatCard icon={Box} color="orange" title='סה"כ יחידות' value={data.summary.totalUnits.toLocaleString()} avgValue={(data.summary.totalUnits / workDays).toLocaleString(undefined, {maximumFractionDigits: 0})} avgUnit="יח'" />
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center justify-between min-h-[140px] hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600"><Beef size={18}/></div>
                            <span className="text-xs font-bold text-slate-500">כניסת רבעים</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 my-1">{data.summary.quarters.total.toLocaleString()}</div>
                        <div className="w-full mt-1">
                            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 mb-2">
                                <div className="bg-blue-500 h-full" style={{ width: `${(data.summary.quarters.halak / data.summary.quarters.total) * 100}%` }}></div>
                                <div className="bg-orange-500 h-full" style={{ width: `${(data.summary.quarters.muchshar / data.summary.quarters.total) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-center gap-3 text-[10px] font-bold">
                                <div className="flex items-center gap-1 text-blue-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>חלק: {data.summary.quarters.halak}</div>
                                <div className="flex items-center gap-1 text-orange-700"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>מוכשר: {data.summary.quarters.muchshar}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PART 3: Yields Analysis */}
            <section>
                <SectionHeader title="ניתוח תפוקות" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <YieldCard title="תפוקה כללית" inVal={data.yields.total.in} outVal={data.yields.total.out} variant="neutral" />
                    <YieldCard title="תפוקה - חלק" inVal={data.yields.halak.in} outVal={data.yields.halak.out} variant="blue" />
                    <YieldCard title="תפוקה - מוכשר" inVal={data.yields.muchshar.in} outVal={data.yields.muchshar.out} variant="orange" />
                    
                    <YieldCard title="תפוקת נתחי X9 כללית" inVal={data.yields.total.in} outVal={data.yields.x9.total} variant="neutral" isX9 />
                    <YieldCard title="תפוקת X9 חלק" inVal={data.yields.halak.in} outVal={data.yields.x9.halak} variant="blue" isX9 />
                    <YieldCard title="תפוקת X9 מוכשר" inVal={data.yields.muchshar.in} outVal={data.yields.x9.muchshar} variant="orange" isX9 />
                </div>
                
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 max-w-5xl mx-auto">
                     <div className="flex-1 bg-white p-3 px-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="bg-rose-50 p-3 rounded-full text-rose-500 border border-rose-100"><UtensilsCrossed size={24}/></div>
                           <div>
                              <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">יחידות סטייקים</span>
                              <span className="text-3xl font-black text-slate-800">{data.yields.steaks.unitsHalak + data.yields.steaks.unitsMuchshar}</span>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="text-center px-4 border-l border-slate-100">
                              <span className="block text-[10px] text-blue-500 font-bold uppercase mb-1">חלק</span>
                              <span className="text-xl font-bold text-slate-700">{data.yields.steaks.unitsHalak}</span>
                           </div>
                           <div className="text-center px-4">
                              <span className="block text-[10px] text-orange-500 font-bold uppercase mb-1">מוכשר</span>
                              <span className="text-xl font-bold text-slate-700">{data.yields.steaks.unitsMuchshar}</span>
                           </div>
                        </div>
                     </div>

                     <div className={`flex-1 p-3 px-6 rounded-xl border-2 shadow-sm flex items-center justify-between ${isSteakYieldGood ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div>
                           <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70 mb-1">אחוז סטייקים מ-X9</span>
                           <span className={`text-4xl font-black ${isSteakYieldGood ? 'text-emerald-600' : 'text-red-600'}`}>
                              {steakPercentage.toFixed(1)}%
                           </span>
                        </div>
                        <div className={`px-4 py-1.5 rounded-lg text-xs font-bold ${isSteakYieldGood ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                           {isSteakYieldGood ? 'תקין (10%-13%)' : 'חריגה מהיעד'}
                        </div>
                     </div>
                </div>
            </section>

            {/* PART 4: Detailed Report */}
            <section>
                <SectionHeader title="דוח ייצור מפורט" />

                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 mb-6 overflow-hidden">
                    <TableSummaryItem label='סה"כ פריטים' value={filteredSortedData.length.toLocaleString()} unit="שורות" icon={ListFilter} color="text-slate-600" />
                    <TableSummaryItem label='סה"כ משקל' value={tableTotals.weight.toLocaleString()} unit='ק"ג' icon={Scale} color="text-blue-600" />
                    <TableSummaryItem label='סה"כ יחידות' value={tableTotals.units.toLocaleString()} unit="יח'" icon={UtensilsCrossed} color="text-purple-600" />
                    <TableSummaryItem label='סה"כ קופסאות' value={tableTotals.boxes.toLocaleString()} unit="קרטונים" icon={Box} color="text-emerald-600" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 mb-4">
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                      
                      <div className="relative lg:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">סינון מוצרים</label>
                        <button onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)} className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm hover:bg-slate-100 h-[36px]">
                          <span className="truncate text-xs font-bold">{hiddenProductIds.length === 0 ? 'הכל מוצג' : 'מותאם אישית'}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {isProductDropdownOpen && (
                          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2">
                            <div className="relative mb-2">
                              <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-lg text-xs py-2 pr-8 pl-2 outline-none" placeholder="הקלד שם..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                              {availableProducts.filter(p => p.name.includes(productSearchTerm)).map(p => {
                                const isVisible = !hiddenProductIds.includes(p.id);
                                return (
                                  <div key={p.id} onClick={() => toggleProductVisibility(p.id)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer text-xs">
                                    <div className={`flex items-center justify-center`}>{isVisible ? <CheckSquare size={16} className="text-slate-900" /> : <Square size={16} className="text-slate-300" />}</div>
                                    <span className={`truncate ${isVisible ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}`}>{p.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {isProductDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProductDropdownOpen(false)}></div>}
                      </div>

                      <FilterDropdown label="כשרות" value={filters.kosher} onChange={(val: string) => handleFilterChange('kosher', val)}>
                         <option value="all">הכל</option>
                         <option value="halak">חלק (Halak)</option>
                         <option value="muchshar">מוכשר (Muchshar)</option>
                      </FilterDropdown>

                      <FilterDropdown label="מחלקה" value={filters.department} onChange={(val: string) => handleFilterChange('department', val)}>
                         <option value="all">הכל</option>
                         {dynamicOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </FilterDropdown>

                      <FilterDropdown label="טריות" value={filters.freshness} onChange={(val: string) => handleFilterChange('freshness', val)}>
                         <option value="all">הכל</option>
                         <option value="Fresh">טרי (Fresh)</option>
                         <option value="Frozen">קפוא (Frozen)</option>
                      </FilterDropdown>

                      <FilterDropdown label="X9" value={filters.isX9} onChange={(val: string) => handleFilterChange('isX9', val)}>
                         <option value="all">הכל</option>
                         <option value="true">כן</option>
                         <option value="false">לא</option>
                      </FilterDropdown>

                      <FilterDropdown label="סטייק" value={filters.isSteak} onChange={(val: string) => handleFilterChange('isSteak', val)}>
                         <option value="all">הכל</option>
                         <option value="true">כן</option>
                         <option value="false">לא</option>
                      </FilterDropdown>

                      <FilterDropdown label="זן" value={filters.breed} onChange={(val: string) => handleFilterChange('breed', val)}>
                         <option value="all">הכל</option>
                         {dynamicOptions.breeds.map(b => <option key={b} value={b}>{b}</option>)}
                      </FilterDropdown>

                      <FilterDropdown label="לקוח" value={filters.customer} onChange={(val: string) => handleFilterChange('customer', val)}>
                         <option value="all">הכל</option>
                         {dynamicOptions.customers.map(c => <option key={c} value={c}>{c}</option>)}
                      </FilterDropdown>

                   </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                   <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                         <tr>
                            <th className="px-6 py-4 w-1/4">שם מוצר</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('weight')}>
                               <div className="flex items-center gap-1">משקל (ק"ג)<ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100"/></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('units')}>
                               <div className="flex items-center gap-1">מס' יחידות<ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100"/></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('boxes')}>
                               <div className="flex items-center gap-1">מס' קופסאות<ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100"/></div>
                            </th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {paginatedData.length > 0 ? (
                            paginatedData.map((product) => (
                               <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-3 font-bold text-slate-800 text-xs md:text-sm">
                                     {product.name}
                                     <div className="flex gap-2 mt-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.kosher.toLowerCase() === 'halak' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{product.kosher}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{product.freshness}</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-3 font-mono text-slate-600 tabular-nums font-medium">{product.weight.toLocaleString()}</td>
                                  <td className="px-6 py-3 font-mono text-slate-600 tabular-nums">{product.units.toLocaleString()}</td>
                                  <td className="px-6 py-3 font-mono text-slate-600 tabular-nums">{product.boxes.toLocaleString()}</td>
                               </tr>
                            ))
                         ) : (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">לא נמצאו מוצרים תואמים לפילטור שנבחר</td></tr>
                         )}
                      </tbody>
                   </table>
                   
                   {/* Pagination */}
                   {totalPages > 1 && (
                     <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-center items-center gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
                        <span className="text-sm font-bold text-slate-600">עמוד {currentPage} מתוך {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all"><ChevronLeft size={20} /></button>
                     </div>
                   )}
                </div>
            </section>

         </div>
      )}
    </div>
  );
}

// --- Components ---
function ShortcutBtn({ label, onClick, disabled }: any) {
   return <button onClick={onClick} disabled={disabled} className="px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:shadow-md transition-all">{label}</button>;
}

function StatCard({ icon: Icon, color, title, value, unit, avgValue, avgUnit, avgLabel }: any) {
    const colors: any = { orange: 'text-orange-600 bg-orange-50', slate: 'text-slate-600 bg-slate-100', blue: 'text-blue-600 bg-blue-50' };
    return (
       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center justify-between min-h-[140px] hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon size={18}/></div>
              <span className="text-xs font-bold text-slate-500">{title}</span>
          </div>
          <div className="text-3xl font-black text-slate-900 my-1">{value} <span className="text-lg font-bold text-slate-400">{unit}</span></div>
          {avgValue ? <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[color]}`}>ממוצע יומי: {avgValue} {avgUnit}</div> : <div className="text-[10px] font-medium text-slate-400 mt-1">{avgLabel}</div>}
       </div>
    );
}

function YieldCard({ title, inVal, outVal, variant, isX9 }: any) {
   const pct = inVal > 0 ? (outVal / inVal) * 100 : 0;
   const styles: any = { neutral: { border: 'border-slate-200', bg: 'bg-white', text: 'text-slate-900' }, blue: { border: 'border-blue-200', bg: 'bg-blue-50/30', text: 'text-blue-800' }, orange: { border: 'border-orange-200', bg: 'bg-orange-50/30', text: 'text-orange-800' } };
   const style = styles[variant];
   return (
      <div className={`p-3 rounded-lg border shadow-sm flex flex-col ${style.bg} ${isX9 ? 'border-dashed border-opacity-70' : 'border-solid'}`}>
         <h4 className="text-[10px] font-bold text-slate-500 mb-2 text-center uppercase tracking-wide">{title}</h4>
         <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-center">
               <span className="block text-[9px] text-slate-400 mb-0.5">נכנס</span>
               <span className="text-sm font-bold text-slate-800">{inVal ? inVal.toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</span>
            </div>
            <ArrowLeft className="text-slate-300 opacity-50" size={14} />
            <div className="text-center">
               <span className="block text-[9px] text-slate-400 mb-0.5">יצא</span>
               <span className="text-sm font-bold text-slate-800">{outVal ? outVal.toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</span>
            </div>
         </div>
         <div className="mt-auto pt-1 border-t border-slate-200/50 text-center">
            <span className={`text-lg font-black ${style.text}`}>{pct > 0 ? pct.toFixed(1) + '%' : '---'}</span>
         </div>
      </div>
   );
}

function TableSummaryItem({ label, value, unit, icon: Icon, color }: any) {
    return (
       <div className="flex-1 p-3 flex items-center justify-between group hover:bg-slate-50 transition-colors">
          <div>
             <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
             <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800">{value}</span>
                <span className="text-[10px] font-bold text-slate-400">{unit}</span>
             </div>
          </div>
          <Icon className={`${color} opacity-80 group-hover:scale-110 transition-transform`} size={20} />
       </div>
    )
}

function FilterDropdown({ label, value, onChange, children }: any) {
   return (
      <div className="flex flex-col gap-1 lg:col-span-1">
         <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">{label}</label>
         <div className="relative">
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all h-[36px]">
               {children}
            </select>
         </div>
      </div>
   );
}

function SectionHeader({ title }: { title: string }) {
    return (
       <div className="relative flex items-center justify-center mb-6 mt-2">
          <div className="absolute left-0 right-0 h-px bg-slate-200 -z-10"></div>
          <h2 className="text-xl font-black text-slate-800 bg-slate-50 px-4">{title}</h2>
       </div>
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