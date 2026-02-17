'use client';

import { 
  LayoutDashboard, 
  Factory, 
  Database, 
  Bell, 
  Settings, 
  FileUp, 
  LogOut, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext'; // וודא שגם הקובץ הזה קיים ומלא!

const menuItems = [
  { name: 'לוח בקרה ראשי', icon: LayoutDashboard, href: '/' },
  { name: 'ביצועי מפעלים', icon: Factory, href: '/performance' },
  { name: 'נתוני ייצור', icon: Database, href: '/production' },
  { name: 'מרכז התראות', icon: Bell, href: '/alerts' },
  { name: 'העלאת קבצים', icon: FileUp, href: '/upload' },
  { name: 'הגדרות מערכת', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside 
      className={`bg-white border-l border-slate-200 h-full shadow-sm z-20 flex flex-col transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      
      {/* כפתור כיווץ/הרחבה */}
      <button 
        onClick={toggleSidebar}
        className="absolute -left-3 top-9 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 p-1 rounded-full shadow-sm z-30 transition-transform hover:scale-110"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* לוגו */}
      <div className={`h-16 flex items-center border-b border-slate-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="bg-slate-900 text-white p-2 rounded-lg transition-all duration-300">
          <Factory size={isCollapsed ? 24 : 20} />
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 mr-3'}`}>
          <h1 className="font-bold text-xl text-slate-800 whitespace-nowrap">MeatPro</h1>
        </div>
      </div>

      {/* תפריט */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              title={isCollapsed ? item.name : ''} 
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all group relative ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon size={20} className={`flex-shrink-0 transition-transform ${isCollapsed && !isActive ? 'group-hover:scale-110' : ''}`} />
              
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              }`}>
                {item.name}
              </span>

              {isCollapsed && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* כפתור יציאה */}
      <div className="p-4 border-t border-slate-100">
        <button className={`flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 w-full rounded-lg text-sm font-medium transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
          <LogOut size={20} />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}>
            התנתק
          </span>
        </button>
      </div>
    </aside>
  );
}