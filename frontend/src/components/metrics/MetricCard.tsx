import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  subtitle: string;
  isPlaceholder?: boolean;
  accentColor?: 'orange' | 'cyan' | 'emerald' | 'blue';
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  subtitle,
  isPlaceholder = false,
  accentColor = 'orange',
}: MetricCardProps) {
  const accentClasses = {
    orange: 'text-orange-400 bg-orange-950/40 border-orange-500/30',
    cyan: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    blue: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
  }[accentColor];

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800/80 rounded-2xl p-4.5 shadow-md backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-cyan-500/5 group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={`p-2 rounded-xl border ${accentClasses} transition-transform group-hover:scale-105`}>
            {icon}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            TELEMETRY
          </span>
        </div>
        <p className="text-xs font-medium text-slate-400 tracking-wide">{label}</p>
        <div className="flex items-baseline space-x-1.5 my-1.5">
          <span
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              isPlaceholder ? 'text-slate-600' : 'text-white'
            }`}
          >
            {value}
          </span>
          {unit && <span className="text-sm font-bold text-slate-400 font-mono">{unit}</span>}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-2 truncate" title={subtitle}>
        {subtitle}
      </p>
    </div>
  );
}

