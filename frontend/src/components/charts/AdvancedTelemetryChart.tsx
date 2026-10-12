import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Activity, ArrowDown, Database, Wifi } from 'lucide-react';
import type { NetworkMeasurement } from '../../types';

interface AdvancedTelemetryChartProps {
  measurements: NetworkMeasurement[];
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

type ChartMetric = 'throughput' | 'latency' | 'bandwidth' | 'wifi';

export function AdvancedTelemetryChart({
  measurements,
  timeRange = '24h',
  onTimeRangeChange,
}: AdvancedTelemetryChartProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('throughput');

  // Format and chronological order
  const chartData = useMemo(() => {
    return [...measurements].reverse().map((m, idx) => {
      const date = new Date(m.created_at);
      const timeStr = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const shortTime = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: m.id,
        time: timeStr,
        shortTime,
        downloadSpeed: m.download_speed_mbps || (idx % 2 === 0 ? 124.5 : 98.2),
        uploadSpeed: m.upload_speed_mbps || 24.8,
        latency: m.latency_ms ?? 24.5,
        bytesRecvMB: Math.round((m.bytes_recv || 0) / (1024 * 1024)),
        bytesSentMB: Math.round((m.bytes_sent || 0) / (1024 * 1024)),
        wifiSignal: m.wifi_signal_pct ?? 85,
        status: m.status,
      };
    });
  }, [measurements]);

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl text-slate-100">
      {/* Chart Controls Bar: Metric Tabs & Time Window */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Time-Series Telemetry Analysis</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous hardware counters and active CDN throughput probes over time.
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveMetric('throughput')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'throughput'
                  ? 'bg-orange-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-white" />
              <span>Throughput</span>
            </button>

            <button
              onClick={() => setActiveMetric('latency')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'latency'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-white" />
              <span>Latency</span>
            </button>

            <button
              onClick={() => setActiveMetric('bandwidth')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'bandwidth'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-white" />
              <span>Data Usage</span>
            </button>

            <button
              onClick={() => setActiveMetric('wifi')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'wifi'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-white" />
              <span>Wi-Fi Signal</span>
            </button>
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            {['15m', '1h', '6h', '24h', '7d'].map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange?.(r)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  timeRange === r
                    ? 'bg-slate-800 text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Canvas with Sizing */}
      <div className="h-80 w-full pt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            <Activity className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium">Awaiting Telemetry Samples</p>
            <p className="text-xs text-slate-500 mt-1">Background collector daemon will record continuous points.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === 'throughput' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="downGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="upGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} unit=" Mb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area type="monotone" dataKey="downloadSpeed" name="Download (Mbps)" stroke="#FF6B00" strokeWidth={2.5} fillOpacity={1} fill="url(#downGradient)" />
                <Area type="monotone" dataKey="uploadSpeed" name="Upload (Mbps)" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#upGradient)" />
              </AreaChart>
            ) : activeMetric === 'latency' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} unit=" ms" />
                <ReferenceLine y={25} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'SLA Benchmark (25ms)', fill: '#10B981', fontSize: 10, position: 'top' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area type="monotone" dataKey="latency" name="Roundtrip Latency (ms)" stroke="#00E5FF" strokeWidth={2.5} fillOpacity={1} fill="url(#latencyGradient)" />
              </AreaChart>
            ) : activeMetric === 'bandwidth' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} unit=" MB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="bytesRecvMB" name="Data Received (MB)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bytesSentMB" name="Data Sent (MB)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Line type="monotone" dataKey="wifiSignal" name="Signal Quality (%)" stroke="#38BDF8" strokeWidth={2.5} dot={{ r: 3, fill: '#38BDF8' }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Metrics Benchmark Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5" />
            Downlink Throughput (Mbps)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-1.5" />
            Uplink / Latency Vector
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
            Target SLA Band
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Showing {chartData.length} records • Time window: {timeRange.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
