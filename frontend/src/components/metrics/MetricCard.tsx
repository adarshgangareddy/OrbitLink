import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  subtitle: string;
  isPlaceholder?: boolean;
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  subtitle,
  isPlaceholder = false,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs transition-all hover:border-orange-200 hover:shadow-sm">
      <div className="flex items-center space-x-2 text-orange-500 mb-3">
        <span className="p-1 rounded-md bg-orange-50">{icon}</span>
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline space-x-1.5 my-1">
        <span
          className={`text-3xl font-bold tracking-tight ${
            isPlaceholder ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-xl font-semibold text-gray-700">{unit}</span>}
      </div>
      <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
    </div>
  );
}
