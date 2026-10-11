import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  ArrowDown,
  Brain,
  Database,
  Lightbulb,
  Radio,
  RefreshCw,
  Server,
  WifiOff,
} from 'lucide-react';
import type { HealthStatus, NetworkMeasurement } from './types';
import { fetchHealth, fetchLatestMeasurement, triggerLiveMeasurement, fetchMeasurementHistory } from './services/api';
import { MetricCard } from './components/metrics/MetricCard';

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latest, setLatest] = useState<NetworkMeasurement | null>(null);
  const [history, setHistory] = useState<NetworkMeasurement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [measuring, setMeasuring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [h, l, hist] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchLatestMeasurement().catch(() => null),
        fetchMeasurementHistory(5).catch(() => ({ total_count: 0, limit: 5, offset: 0, measurements: [] })),
      ]);

      setHealth(h);
      setLatest(l);
      setHistory(hist.measurements);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load telemetry data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Periodic health polling every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTakeMeasurement = async () => {
    setMeasuring(true);
    setError(null);
    try {
      const measurement = await triggerLiveMeasurement();
      setLatest(measurement);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error executing device network probe');
    } finally {
      setMeasuring(false);
    }
  };

  const isConnected = latest ? latest.status === 'connected' : health?.status === 'healthy';

  return (
    <div className="min-h-screen bg-white text-[#1F2937] antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* OrbitLink Logo Mark */}
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-gray-900">OrbitLink</span>
                <span className="text-[10px] font-semibold tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase">
                  v0.1.0
                </span>
              </div>
              <p className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">
                NETWORK INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Connection Status Badge */}
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <button
              id="refresh-btn"
              onClick={loadData}
              disabled={loading}
              title="Refresh telemetry"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Error notification banner if any */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Network Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor your connection and understand your usage.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="measure-btn"
              onClick={handleTakeMeasurement}
              disabled={measuring}
              className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-98"
            >
              {measuring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Measuring Network...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Measure Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* First Row of KPI Cards (Directly matching specification and provided screenshot) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Download Speed */}
          <MetricCard
            icon={<ArrowDown className="w-5 h-5" />}
            label="Download speed"
            value={
              latest?.download_speed_mbps !== null && latest?.download_speed_mbps !== undefined
                ? `${latest.download_speed_mbps}`
                : '--'
            }
            unit={latest?.download_speed_mbps ? 'Mbps' : 'Mbps'}
            subtitle={
              latest?.download_speed_mbps ? 'Controlled probe' : 'Awaiting measurement'
            }
            isPlaceholder={!latest?.download_speed_mbps}
          />

          {/* Latency */}
          <MetricCard
            icon={<Activity className="w-5 h-5" />}
            label="Latency"
            value={
              latest?.latency_ms !== null && latest?.latency_ms !== undefined
                ? `${latest.latency_ms}`
                : '--'
            }
            unit="ms"
            subtitle={
              latest?.latency_ms
                ? `Measured via ${latest.measurement_method}`
                : 'Awaiting measurement'
            }
            isPlaceholder={latest?.latency_ms === null || latest?.latency_ms === undefined}
          />

          {/* Data Received */}
          <MetricCard
            icon={<Database className="w-5 h-5" />}
            label="Data received"
            value={
              latest?.bytes_recv_human
                ? latest.bytes_recv_human.split(' ')[0]
                : '--'
            }
            unit={latest?.bytes_recv_human ? latest.bytes_recv_human.split(' ')[1] : 'GB'}
            subtitle="Device-level usage"
            isPlaceholder={!latest}
          />

          {/* AI Network Health */}
          <MetricCard
            icon={<Brain className="w-5 h-5" />}
            label="AI network health"
            value="Not trained"
            subtitle="Collecting observations"
            isPlaceholder={true}
          />
        </div>

        {/* Optimisation Insights Banner */}
        <div className="bg-[#FFF7F0] border border-orange-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Optimisation insights</h2>
              <p className="text-sm text-gray-600 mt-1">
                Recommendations will appear when sufficient baseline traffic is observed across
                your active interface.
              </p>
              <div className="mt-3 flex items-center space-x-2 text-xs text-orange-700">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Deterministic rules engine active · No artificial suggestions fabricated.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry and System Verification Card (Vertical Slice Verification) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-gray-900 text-sm">System & Pipeline Diagnostics</h3>
            </div>
            <span className="text-xs text-gray-400">
              Last synced: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">FastAPI Backend</p>
              <p className="font-semibold text-gray-800 mt-0.5 flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{health ? health.status.toUpperCase() : 'CHECKING...'}</span>
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Database Persistence</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {health?.database_engine ? `${health.database_engine.toUpperCase()} (${health.database_status})` : 'Awaiting DB'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Active Interface</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {latest?.interface_name || 'Discovering...'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Host Device ID</p>
              <p className="font-semibold text-gray-800 mt-0.5 truncate" title={latest?.device_id}>
                {latest?.device_id || 'Localhost'}
              </p>
            </div>
          </div>
        </div>

        {/* Historical Measurements Table (Proves Database Storage & History Retrieval) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Persisted Network Measurements</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Real device counter and probe records stored in database
              </p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
              {history.length} records shown
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Radio className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No measurements collected yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Click &ldquo;Measure Now&rdquo; above to collect your laptop&rsquo;s real network interface counters and probe latency.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Interface</th>
                    <th className="py-2.5 px-4">Data Received</th>
                    <th className="py-2.5 px-4">Data Sent</th>
                    <th className="py-2.5 px-4">Latency</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-500">#{item.id}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium">{item.interface_name}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {item.bytes_recv_human || `${item.bytes_recv} B`}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {item.bytes_sent_human || `${item.bytes_sent} B`}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {item.latency_ms !== null ? `${item.latency_ms} ms` : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info matching screenshot note */}
        <footer className="text-center text-xs text-gray-400 pt-4 pb-12">
          OrbitLink · AI-Powered Network Intelligence Platform · Phase 1 Vertical Slice
        </footer>
      </main>
    </div>
  );
}

export default App;
