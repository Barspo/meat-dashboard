'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// הוספנו את Bell (פעמון)
import { LayoutDashboard, Factory, ChevronRight, Menu, BadgeDollarSign, Bell } from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true); 
  const pathname = usePathname();

  // הגדרת התפריט + מספר התראות (badge)
  const menuItems = [
    { name: 'לוח בקרה ראשי', path: '/', icon: LayoutDashboard },
    { name: 'ביצועי מפעל', path: '/performance', icon: Factory },
    { name: 'ניהול כספי', path: '/finance', icon: BadgeDollarSign },
    // כאן הוספנו את ההתראות עם מונה של 2 הודעות
    { name: 'מרכז התראות', path: '/notifications', icon: Bell, badge: 2 }, 
  ];

  return (
    <aside 
      className={`
        bg-slate-900 border-l border-slate-800 h-screen transition-all duration-300 ease-in-out
        sticky top-0 flex flex-col z-50
        ${isOpen ? 'w-64' : 'w-20'}
      `}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {isOpen && <span className="font-bold text-xl text-blue-500 truncate">MeatPRO</span>}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
        >
          {isOpen ? <ChevronRight /> : <Menu />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`
                flex items-center gap-4 p-3 rounded-xl transition-all relative group
                ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              {/* האייקון + הבועה האדומה */}
              <div className="relative">
                <item.icon size={24} />
                {/* לוגיקה לבועה האדומה - מופיעה רק אם יש badge > 0 */}
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="flex-1 flex justify-between items-center">
                  <span className="font-medium whitespace-nowrap">{item.name}</span>
                  {/* גם כשהתפריט פתוח, נראה את המספר בצד */}
                  {item.badge && (
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      +{item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
            U
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white">User Admin</p>
              <p className="text-xs text-slate-500">Manager</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}