import { useState } from 'react';
import {
  Leaf,
  Zap,
  Globe,
  HelpCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { EnvironmentalImpactReport } from '../../types';

interface EnvironmentalImpactCardProps {
  report: EnvironmentalImpactReport | null;
  loading?: boolean;
}

export function EnvironmentalImpactCard({
  report,
  loading = false,
}: EnvironmentalImpactCardProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Environmental & Resource Transmission Efficiency
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
              IEA / ASLAN MODEL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Peer-reviewed lifecycle estimates derived from physical network interface counters.
          </p>
        </div>

        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded-xl transition-all self-start sm:self-auto flex items-center space-x-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{showMethodology ? 'Hide Assumptions' : 'View Assumptions & Sources'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-sans text-[11px] block">Observed Transfer Volume:</span>
          <p className="text-xl font-bold text-white mt-1">
            {report?.total_observed_gb?.toFixed(2) || '0.00'} GB
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">Device network counters</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-sans text-[11px] block">Est. Transmission Energy:</span>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {report?.energy_consumption_kwh?.toFixed(4) || '0.0000'} kWh
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">0.015 kWh / GB baseline</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-sans text-[11px] block">Indirect GHG Emissions:</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {report?.ghg_emissions_kg_co2e?.toFixed(4) || '0.0000'} kg CO₂e
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">475 g CO₂e/kWh global grid</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-sans text-[11px] block">Cacheable Avoidance:</span>
          <p className="text-xl font-bold text-cyan-400 mt-1">
            {report?.avoided_transfers_gb?.toFixed(2) || '0.00'} GB
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">~4% duplicate query margin</p>
        </div>
      </div>

      {/* Assumptions & Methodology Breakdown */}
      {showMethodology && (
        <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-3 animate-fadeIn">
          <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
            Lifecycle Calculation Methodology & Scientific Sources
          </h4>
          <p className="text-slate-300 leading-relaxed">
            {report?.methodology_source}
          </p>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1 text-slate-400 text-[11px]">
            <p>• <strong>Transmission Formula:</strong> Energy (kWh) = Data Transferred (GB) × 0.015 kWh/GB</p>
            <p>• <strong>Emissions Formula:</strong> GHG (kg CO₂e) = Energy (kWh) × 0.475 kg CO₂e/kWh</p>
            <p>• <strong>Uncertainty:</strong> {report?.uncertainty_range}</p>
          </div>
        </div>
      )}

      {/* Mandatory Transparency Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>{report?.transparency_disclaimer}</p>
      </div>
    </div>
  );
}
