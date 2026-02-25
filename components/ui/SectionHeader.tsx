interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="relative flex items-center justify-center mb-6 mt-2">
      <div className="absolute left-0 right-0 h-px bg-slate-200 -z-10"></div>
      <h2 className="text-xl font-black text-slate-800 bg-slate-50 px-4">{title}</h2>
    </div>
  );
}
