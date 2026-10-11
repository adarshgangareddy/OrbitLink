import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { NetworkMeasurement } from '../../types';

interface ThroughputChartProps {
  measurements: NetworkMeasurement[];
}

export function ThroughputChart({ measurements }: ThroughputChartProps) {
  // Sort oldest to newest for chronological left-to-right display
  const chartData = [...measurements]
    .reverse()
    .map((m) => {
      const timeStr = new Date(m.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        time: timeStr,
        downloadSpeed: m.download_speed_mbps || 0,
        latency: m.latency_ms || 0,
        dataRecvMB: m.bytes_recv ? Math.round(m.bytes_recv / 1_000_000) : 0,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm font-medium">No historical measurements to plot</p>
        <p className="text-xs mt-1">Run a speed test or quick probe above to start charting.</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            unit=" Mb"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="downloadSpeed"
            name="Download (Mbps)"
            stroke="#F97316"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#speedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
