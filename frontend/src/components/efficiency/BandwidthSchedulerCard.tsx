import { useState } from 'react';
import {
  Clock,
  Download,
  ShieldCheck,
  Info,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { BandwidthScheduleRecommendation } from '../../types';

interface BandwidthSchedulerCardProps {
  schedule: BandwidthScheduleRecommendation | null;
  onFileSizeChange: (sizeGb: number) => Promise<void>;
  loading?: boolean;
}

export function BandwidthSchedulerCard({
  schedule,
  onFileSizeChange,
  loading = false,
}: BandwidthSchedulerCardProps) {
  const [fileSizeInput, setFileSizeInput] = useState<number>(schedule?.file_size_gb ?? 15);

  const handleApply = (size: number) => {
    setFileSizeInput(size);
    onFileSizeChange(size);
  };

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Smart Bandwidth Efficiency & Download Scheduler
            </h3>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
              OFF-PEAK INTELLIGENCE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recommends optimal non-peak windows to transfer large files without degrading interactive household traffic.
          </p>
        </div>

        {/* Quick File Preset Buttons */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[5, 15, 30, 60].map((size) => (
            <button
              key={size}
              onClick={() => handleApply(size)}
              className={`px-2.5 py-1 rounded-lg transition-all font-mono text-[11px] ${
                fileSizeInput === size
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {size} GB
            </button>
          ))}
        </div>
      </div>

      {/* Recommended Schedule Hero Card */}
      {schedule && (
        <div className="p-5 bg-gradient-to-r from-cyan-950/30 via-slate-900/80 to-slate-900/80 rounded-2xl border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
              RECOMMENDED LOW-DEMAND WINDOW
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-black font-mono text-white">
                {schedule.recommended_window}
              </span>
              <span className="text-xs bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-semibold">
                Lowest Network Contention
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {schedule.reasoning}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs shrink-0 font-mono">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase block">Est. Duration</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                ~{schedule.estimated_duration_minutes} min
              </span>
              <span className="text-[10px] text-slate-400">for {schedule.file_size_gb} GB file</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase block">Safe Throughput</span>
              <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                {schedule.safe_speed_mbps} Mbps
              </span>
              <span className="text-[10px] text-emerald-400">30% safety headroom</span>
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Diurnal Demand Profile Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-slate-300">24-Hour Network Activity Heat-Profile:</span>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> Low (Off-Peak)
            </span>
            <span className="flex items-center text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500 mr-1" /> Medium
            </span>
            <span className="flex items-center text-slate-400">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" /> High (Peak)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 p-2 bg-slate-950 rounded-xl border border-slate-800">
          {schedule?.hourly_demand_profile.map((h, idx) => {
            const isLow = h.demand_level === 'low';
            const isHigh = h.demand_level === 'high';

            return (
              <div
                key={idx}
                title={`${h.label}: ~${h.avg_transfer_mb} MB/hr, ${h.avg_latency_ms} ms ping (${h.demand_level} demand)`}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div
                  className={`w-full h-10 rounded-sm transition-all group-hover:scale-105 ${
                    isLow
                      ? 'bg-emerald-500/60 hover:bg-emerald-400'
                      : isHigh
                      ? 'bg-orange-500/70 hover:bg-orange-400'
                      : 'bg-cyan-500/50 hover:bg-cyan-400'
                  }`}
                />
                <span className="text-[8px] font-mono text-slate-500 mt-1">{h.hour}h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparency Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>{schedule?.disclaimer}</p>
      </div>
    </div>
  );
}
