'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getClockInfo(timezone: string) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const dayShort = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(now);
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayShort);
  const dayNameHe = DAYS_HE[dayIndex] ?? '';
  const dateStr = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(now);
  return { time, dayNameHe, dateStr };
}

export function Header() {
  const [israel, setIsrael] = useState(() => getClockInfo('Asia/Jerusalem'));
  const [brazil, setBrazil] = useState(() => getClockInfo('America/Sao_Paulo'));

  useEffect(() => {
    const id = setInterval(() => {
      setIsrael(getClockInfo('Asia/Jerusalem'));
      setBrazil(getClockInfo('America/Sao_Paulo'));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 z-10 px-6 md:px-8 py-3">
      <div className="flex items-center gap-4">

        {/* 3-column grid — takes all available space */}
        {/* In RTL: col-1 = rightmost, col-2 = center, col-3 = leftmost */}
        <div className="grid grid-cols-3 items-center flex-1">

          {/* Col 1 — Israel (right side in RTL) */}
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none select-none">🇮🇱</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-0.5">ישראל</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums leading-none">{israel.time}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug whitespace-nowrap">
                יום {israel.dayNameHe}, {israel.dateStr}
              </p>
            </div>
          </div>

          {/* Col 2 — Centered title */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-0.5">מערכת ניהול</p>
            <h1 className="text-xl font-black text-slate-800 tracking-wide leading-none">ORCAD FOODS</h1>
          </div>

          {/* Col 3 — Brazil (left side in RTL) */}
          <div className="flex items-center gap-3 justify-end">
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-400 mb-0.5">ברזיל</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums leading-none">{brazil.time}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug whitespace-nowrap">
                יום {brazil.dayNameHe}, {brazil.dateStr}
              </p>
            </div>
            <span className="text-2xl leading-none select-none">🇧🇷</span>
          </div>
        </div>

        {/* Bell — far end (leftmost in RTL) */}
        <div className="border-r border-slate-200 pr-4 mr-0 shrink-0">
          <Link
            href="/alerts"
            className="flex items-center justify-center p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors"
            title="מרכז התראות"
          >
            <Bell size={22} />
          </Link>
        </div>

      </div>
    </header>
  );
}
