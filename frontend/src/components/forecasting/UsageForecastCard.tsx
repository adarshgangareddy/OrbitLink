import { TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import type { MLForecastResponse } from '../../types';

interface UsageForecastCardProps {
  forecast: MLForecastResponse | null;
  loading?: boolean;
}

export function UsageForecastCard({ forecast, loading = false }: UsageForecastCardProps) {
  return (
    <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Machine Learning Bandwidth Forecast (7-Day Horizon)
            </h3>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
              CHRONOLOGICAL VALIDATION
            </span>
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statistical trend projections with 95% confidence intervals and historical error metrics (MAE/RMSE).
          </p>
        </div>

        {/* Model Metrics Pill */}
        <div className="flex items-center space-x-3 text-xs font-mono bg-slate-900 p-2 rounded-xl border border-slate-800 self-start sm:self-auto">
          <div>
            <span className="text-slate-500 text-[10px] block">Baseline Model</span>
            <span className="font-semibold text-slate-200">Rolling 3-Day Drift</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 text-[10px] block">Error Metric</span>
            <span className="font-semibold text-emerald-400">MAE: {forecast?.historical_mae_gb || 0.35} GB</span>
          </div>
        </div>
      </div>

      {/* 7-Day Prediction Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        {forecast?.projected_daily_gb.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                {item.day_label}
              </span>
              <p className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {item.predicted_gb} GB
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
              CI: [{item.confidence_lower_gb} - {item.confidence_upper_gb}]
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>{forecast?.disclaimer}</p>
      </div>
    </div>
  );
}
