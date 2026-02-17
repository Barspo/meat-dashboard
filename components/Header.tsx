'use client';
import { Bell, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 z-10">
      
      {/* שם המסך הנוכחי */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">לוח בקרה</h2>
      </div>

      {/* צד שמאל - פרופיל והתראות */}
      <div className="flex items-center gap-4">
        
        {/* התראות */}
        <button className="relative p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors">
          <Bell size={20} />
          {/* נקודה אדומה להתראה */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* מפריד */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* פרופיל משתמש */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-slate-700">ישראל ישראלי</p>
            <p className="text-xs text-slate-400">מנהל תפעול</p>
          </div>
          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}