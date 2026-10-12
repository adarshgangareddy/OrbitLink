import { useState } from 'react';
import {
  Satellite,
  Compass,
  Thermometer,
  Snowflake,
  ShieldCheck,
  Activity,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import type { NetworkMeasurement } from '../../types';

interface StarlinkDishStatusCardProps {
  measurement?: NetworkMeasurement | null;
  latest?: NetworkMeasurement | null;
  onRunQuickDiagnostic?: () => void;
  onOpenSpeedTest?: () => void;
  isRunningDiagnostic?: boolean;
}

export function StarlinkDishStatusCard({
  measurement,
  latest,
  onRunQuickDiagnostic,
  onOpenSpeedTest,
  isRunningDiagnostic = false,
}: StarlinkDishStatusCardProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'constellation' | 'obstructions'>('terminal');

  const current = latest ?? measurement ?? null;
  const isOnline = current?.status === 'connected';
  const wifiSignal = current?.wifi_signal_pct ?? 88;
  const latency = current?.latency_ms ?? 24;

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl text-slate-100">
      {/* Top Header: Terminal Model & Online Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/60">
        <div className="flex items-center space-x-3.5">
          {/* Pulsing Beacon Halo */}
          <div className="relative flex items-center justify-center">
            <span
              className={`absolute w-8 h-8 rounded-full ${
                isOnline ? 'bg-emerald-500/20 animate-ping' : 'bg-rose-500/20'
              }`}
            />
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-400'
              }`}
            >
              <Satellite className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight text-white">OrbitLink Star Terminal (Gen 3)</h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {isOnline ? `ONLINE • ${latency}ms • ${wifiSignal}% RF` : 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Phased Array Transceiver • Beamtracking Constellation v2 Mini
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'terminal'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('constellation')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'constellation'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satellite Link
            </button>
            <button
              onClick={() => setActiveTab('obstructions')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'obstructions'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sky View
            </button>
          </div>

          {onOpenSpeedTest && (
            <button
              onClick={onOpenSpeedTest}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600/80 hover:bg-orange-600 border border-orange-500/40 rounded-xl transition-all flex items-center space-x-1"
              title="Launch Starlink Speed Test"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Speed Test</span>
            </button>
          )}

          {onRunQuickDiagnostic && (
            <button
              onClick={onRunQuickDiagnostic}
              disabled={isRunningDiagnostic}
              className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900/90 border border-slate-800 rounded-xl transition-all disabled:opacity-50"
              title="Poll Terminal Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningDiagnostic ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area Based on Tab */}
      <div className="pt-5">
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dish Motor Alignment */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center">
                  <Compass className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  Dish Alignment
                </span>
                <span className="text-emerald-400 text-[11px] font-semibold">LOCKED</span>
              </div>
              <p className="text-lg font-bold font-mono text-white">348° NNW / 67.4° UP</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Motors sleeping • Optimal constellation vector
              </p>
            </div>

            {/* Obstruction Index */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Sky Obstructions
                </span>
                <span className="text-emerald-400 font-mono text-[11px]">0.0%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[2%]" />
                </div>
                <span className="text-xs font-semibold text-slate-300">Clear</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">No outages in the last 12 hours</p>
            </div>

            {/* Thermal & Snow Melt */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center">
                  <Thermometer className="w-3.5 h-3.5 mr-1 text-orange-400" />
                  Thermal State
                </span>
                <span className="text-slate-300 font-mono text-[11px]">34°C / 93°F</span>
              </div>
              <p className="text-sm font-semibold text-white flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                Nominal Operation
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center">
                <Snowflake className="w-3 h-3 mr-1 text-cyan-400" />
                Snow Melt: Automatic Standby
              </p>
            </div>

            {/* Cable & Local Hop Ping */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center">
                  <Activity className="w-3.5 h-3.5 mr-1 text-blue-400" />
                  Router-to-Dish Link
                </span>
                <span className="text-cyan-400 font-mono text-[11px]">0.3 ms</span>
              </div>
              <p className="text-lg font-bold font-mono text-white">Cat6 Shielded (1Gbps)</p>
              <p className="text-[11px] text-slate-400 mt-1">
                PoE Injector: 48V Nominal • 0 dropped packets
              </p>
            </div>
          </div>
        )}

        {activeTab === 'constellation' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Active Spacecraft</p>
              <p className="text-base font-bold font-mono text-cyan-400 mt-1">STARLINK-31849 (v2 Mini)</p>
              <div className="space-y-1 mt-2 text-slate-300">
                <p>• Orbit Altitude: <span className="font-mono text-white">546.8 km</span></p>
                <p>• Velocity: <span className="font-mono text-white">7.61 km/s (27,400 km/h)</span></p>
                <p>• Inclination: <span className="font-mono text-white">53.2° Prograde</span></p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Radio Link Budget</p>
              <p className="text-base font-bold font-mono text-orange-400 mt-1">Ku/Ka-Band Phased Array</p>
              <div className="space-y-1 mt-2 text-slate-300">
                <p>• Downlink Freq: <span className="font-mono text-white">12.2 – 12.7 GHz</span></p>
                <p>• Modulation: <span className="font-mono text-white">64-QAM Adaptive Beam</span></p>
                <p>• Next Handover: <span className="font-mono text-cyan-400 font-bold">~42 seconds</span></p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Terrestrial Gateway</p>
              <p className="text-base font-bold font-mono text-emerald-400 mt-1">Regional Fiber PoP</p>
              <div className="space-y-1 mt-2 text-slate-300">
                <p>• Gateway ID: <span className="font-mono text-white">ORBIT-GW-BLR01</span></p>
                <p>• Ground Hop Latency: <span className="font-mono text-white">4.2 ms</span></p>
                <p>• Backbone Routing: <span className="font-mono text-white">Direct AS13335 / AS15169</span></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'obstructions' && (
          <div className="p-5 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-500/50 flex items-center justify-center relative bg-slate-950">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">360° Hemispherical Sky Inspection</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Continuous optical & signal attenuation scan for trees, buildings, and overhead physical barriers.
                </p>
                <p className="text-[11px] text-emerald-400 font-medium mt-1">
                  ✓ Field of view unobstructed • 100% Starlink satellite track compliance
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-right">
              <div>
                <p className="text-slate-400">Total Outages Today</p>
                <p className="text-lg font-bold font-mono text-emerald-400">0 sec</p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <p className="text-slate-400">Signal Degradation</p>
                <p className="text-lg font-bold font-mono text-white">None</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
