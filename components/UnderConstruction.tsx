'use client';

import { Construction, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function UnderConstruction({ title = "הדף בבנייה" }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 mx-4 mt-8">
      <div className="bg-blue-50 p-6 rounded-full mb-6 animate-pulse">
        <Construction size={64} className="text-blue-600" />
      </div>
      <h2 className="text-3xl font-black text-slate-800 mb-3">{title}</h2>
      <p className="text-slate-500 max-w-md mb-8 text-lg">
       העמוד בפיתוח <br />
      </p>
      
      <div className="flex gap-4">
        <Link 
          href="/production" 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          לדוח ייצור <ArrowRight size={18} />
        </Link>
        <Link 
          href="/performance" 
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
        >
          לביצועי מפעלים
        </Link>
      </div>
    </div>
  );
}