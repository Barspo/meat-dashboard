import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'מעבד נתונים...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-slate-400">{message}</p>
    </div>
  );
}
