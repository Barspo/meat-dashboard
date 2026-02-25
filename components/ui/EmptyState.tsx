import { AlertCircle, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
}

export function EmptyState({ message, icon: Icon = AlertCircle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
      <Icon className="text-slate-300 mb-4" size={48} />
      <h3 className="text-xl font-bold text-slate-500">{message}</h3>
    </div>
  );
}
