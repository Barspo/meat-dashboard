import { LucideIcon } from 'lucide-react';

const colorMap: Record<string, string> = {
  orange: 'text-orange-600 bg-orange-50',
  slate: 'text-slate-600 bg-slate-100',
  blue: 'text-blue-600 bg-blue-50',
  emerald: 'text-emerald-600 bg-emerald-50',
  red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50',
  rose: 'text-rose-600 bg-rose-50',
};

interface StatCardProps {
  icon: LucideIcon;
  color: string;
  title: string;
  value: string | number;
  unit?: string;
  avgValue?: string;
  avgUnit?: string;
  avgLabel?: string;
}

export function StatCard({ icon: Icon, color, title, value, unit, avgValue, avgUnit, avgLabel }: StatCardProps) {
  const colorClass = colorMap[color] || colorMap.slate;
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center justify-between min-h-[140px] hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${colorClass}`}><Icon size={18} /></div>
        <span className="text-xs font-bold text-slate-500">{title}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 my-1">
        {value} {unit && <span className="text-lg font-bold text-slate-400">{unit}</span>}
      </div>
      {avgValue ? (
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colorClass}`}>
          ממוצע יומי: {avgValue} {avgUnit}
        </div>
      ) : avgLabel ? (
        <div className="text-[10px] font-medium text-slate-400 mt-1">{avgLabel}</div>
      ) : null}
    </div>
  );
}
