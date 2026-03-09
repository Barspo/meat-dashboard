'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { calDays, sameDay, fmtHE, parseHEDate } from '@/components/DateRangePicker';

// ─── SingleDatePicker ─────────────────────────────────────────────────────────
// Props use YYYY-MM-DD strings to match existing form/action patterns.

export function SingleDatePicker({
  value,
  onChange,
  label,
  placeholder = 'בחר תאריך',
}: {
  value: string;             // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  // Convert string ↔ Date internally
  function strToDate(s: string): Date | null {
    if (!s) return null;
    const d = new Date(s + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  function dateToStr(d: Date | null): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const selected = strToDate(value);

  const [open, setOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => selected ?? new Date());
  const [textInput, setTextInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setCalMonth(selected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    setTextInput(selected ? fmtHE(selected) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleDayClick(day: Date) {
    onChange(dateToStr(day));
    setOpen(false);
  }

  function handleTextInput(val: string) {
    setTextInput(val);
    const d = parseHEDate(val);
    if (d) { onChange(dateToStr(d)); setCalMonth(d); }
  }

  const today = new Date();
  const calLabel = selected ? fmtHE(selected) : placeholder;

  return (
    <div ref={ref} className="relative">
      {label && (
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all min-w-[200px] justify-between ${
          open
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : selected
            ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={15} className={open ? 'text-blue-500' : 'text-slate-400'} />
          <span>{calLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 p-5 w-[320px]">

          {/* Manual text input */}
          <div className="mb-5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">תאריך</div>
            <input
              type="text"
              value={textInput}
              onChange={e => handleTextInput(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
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
            <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center">
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
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`h-9 w-full rounded-lg text-sm font-medium transition-all relative ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {day.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
