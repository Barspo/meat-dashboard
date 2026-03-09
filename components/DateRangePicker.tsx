'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import type { Season } from '@/app/actions/settingsActions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const fmtHE = (d: Date | null) => d?.toLocaleDateString('he-IL') ?? '';

export function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function calDays(d: Date): (Date | null)[] {
  const y = d.getFullYear(), mo = d.getMonth();
  const dim = new Date(y, mo + 1, 0).getDate();
  const startDay = new Date(y, mo, 1).getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= dim; i++) days.push(new Date(y, mo, i));
  return days;
}

export function parseHEDate(str: string): Date | null {
  const m = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

// ─── QuickBtn ─────────────────────────────────────────────────────────────────

export function QuickBtn({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-colors ${
        active
          ? 'bg-blue-50 border-blue-300 text-blue-700'
          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

// ─── DateRangePicker ─────────────────────────────────────────────────────────

export function DateRangePicker({
  seasons,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  selectedSeasonName,
  setSelectedSeasonName,
  hideShortcuts,
}: {
  seasons: Season[];
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: (d: Date | null) => void;
  setEndDate: (d: Date | null) => void;
  selectedSeasonName: string | null;
  setSelectedSeasonName: (n: string | null) => void;
  hideShortcuts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => startDate ?? new Date());
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [activeQuick, setActiveQuick] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startDate) setCalMonth(startDate);
  }, [startDate]);

  useEffect(() => {
    setFromInput(startDate ? startDate.toLocaleDateString('he-IL') : '');
    setToInput(endDate ? endDate.toLocaleDateString('he-IL') : '');
  }, [startDate, endDate]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSeasonOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const setQuick = (s: Date, e: Date, label: string) => {
    setStartDate(s);
    setEndDate(e);
    setSelectedSeasonName(null);
    setActiveQuick(label);
    setOpen(false);
  };

  const handleDayClick = (day: Date) => {
    setSelectedSeasonName(null);
    setActiveQuick(null);
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (day >= startDate) {
      setEndDate(day);
      setOpen(false);
    } else {
      setStartDate(day);
      setEndDate(null);
    }
  };

  const handleFromInput = (val: string) => {
    setFromInput(val);
    const d = parseHEDate(val);
    if (d) { setStartDate(d); setCalMonth(d); setSelectedSeasonName(null); setActiveQuick(null); }
  };

  const handleToInput = (val: string) => {
    setToInput(val);
    const d = parseHEDate(val);
    if (d && startDate && d >= startDate) {
      setEndDate(d);
      setSelectedSeasonName(null);
      setActiveQuick(null);
      setOpen(false);
    }
  };

  const today = new Date();
  const calLabel = startDate && endDate
    ? `${fmtHE(startDate)} — ${fmtHE(endDate)}`
    : 'בחירת תאריכים';

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div className="flex items-start gap-3 flex-wrap">

        {/* Calendar trigger */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">טווח זמן</span>
          <button
            onClick={() => setOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all min-w-[240px] justify-between ${
              open
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={15} className={open ? 'text-blue-500' : 'text-slate-400'} />
              <span>{calLabel}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Quick shortcuts */}
        {(!hideShortcuts || seasons.length > 0) && (
        <div>
          <span className="block text-[10px] font-bold text-transparent uppercase tracking-wider mb-1.5 select-none">.</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {!hideShortcuts && (<>
            <QuickBtn label="היום" active={activeQuick === 'היום'} onClick={() => setQuick(today, today, 'היום')} />
            <QuickBtn label="אתמול" active={activeQuick === 'אתמול'} onClick={() => {
              const y = new Date(today); y.setDate(y.getDate() - 1); setQuick(y, y, 'אתמול');
            }} />
            <QuickBtn label="שבוע נוכחי" active={activeQuick === 'שבוע נוכחי'} onClick={() => {
              const s = new Date(today); s.setDate(s.getDate() - s.getDay()); setQuick(s, today, 'שבוע נוכחי');
            }} />
            <QuickBtn label="חודש נוכחי" active={activeQuick === 'חודש נוכחי'} onClick={() =>
              setQuick(new Date(today.getFullYear(), today.getMonth(), 1), today, 'חודש נוכחי')
            } />
            </>)}

            {seasons.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setSeasonOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    selectedSeasonName
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{selectedSeasonName ?? 'עונה'}</span>
                  <ChevronDown size={11} className={`transition-transform ${seasonOpen ? 'rotate-180' : ''}`} />
                </button>
                {seasonOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 min-w-[175px] py-1">
                    {seasons.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setStartDate(new Date(s.start_date + 'T12:00:00'));
                          setEndDate(new Date(s.end_date + 'T12:00:00'));
                          setSelectedSeasonName(s.name_hebrew);
                          setActiveQuick(null);
                          setSeasonOpen(false);
                          setOpen(false);
                        }}
                        className="w-full text-right px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex justify-between items-center transition-colors"
                      >
                        <span>{s.name_hebrew}</span>
                        {s.is_current && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">נוכחי</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Calendar Panel */}
      {open && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 p-5 w-[360px]">

          {/* Manual text inputs */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">מתאריך</div>
              <input
                type="text"
                value={fromInput}
                onChange={e => handleFromInput(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">עד תאריך</div>
              <input
                type="text"
                value={toInput}
                onChange={e => handleToInput(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Month / Year navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCalMonth(m => new Date(m.getFullYear() - 1, m.getMonth(), 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title="שנה קודמת"
            ><ChevronsRight size={15} /></button>
            <button
              onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            ><ChevronRight size={15} /></button>
            <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">
              {calMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            ><ChevronLeft size={15} /></button>
            <button
              onClick={() => setCalMonth(m => new Date(m.getFullYear() + 1, m.getMonth(), 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title="שנה הבאה"
            ><ChevronsLeft size={15} /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays(calMonth).map((day, i) => {
              if (!day) return <div key={i} />;
              const isStart = sameDay(day, startDate);
              const isEnd = sameDay(day, endDate);
              const inRange = startDate && endDate && day > startDate && day < endDate;
              const isToday = sameDay(day, new Date());
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`h-9 w-full rounded-lg text-sm font-medium transition-all relative ${
                    isStart || isEnd
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : inRange
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {day.getDate()}
                  {isToday && !isStart && !isEnd && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Status hint */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
            {!startDate
              ? 'לחץ לבחירת תאריך התחלה'
              : !endDate
              ? 'לחץ לבחירת תאריך סיום'
              : '✓ טווח נבחר'}
          </div>
        </div>
      )}
    </div>
  );
}
