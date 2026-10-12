import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Brain,
  CheckCircle2,
  Database,
  Gauge,
  Lightbulb,
  Radio,
  RefreshCw,
  Server,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { HealthStatus, NetworkMeasurement, NetworkSession, CollectorStatus } from './types';
import {
  fetchHealth,
  fetchLatestMeasurement,
  triggerLiveMeasurement,
  runSpeedTest,
  fetchMeasurementHistory,
  fetchCollectorStatus,
  startCollector,
  stopCollector,
  configureCollector,
  fetchActiveSession,
  startSession,
  stopSession,
  fetchSessions,
} from './services/api';
import { MetricCard } from './components/metrics/MetricCard';
import { AppSidebar } from './components/layout/AppSidebar';
import type { NavSection } from './components/layout/AppSidebar';
import { ThroughputChart } from './components/charts/ThroughputChart';
import { SessionTrackerCard } from './components/sessions/SessionTrackerCard';
import { SessionHistoryTable } from './components/sessions/SessionHistoryTable';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latest, setLatest] = useState<NetworkMeasurement | null>(null);
  const [history, setHistory] = useState<NetworkMeasurement[]>([]);
  const [collector, setCollector] = useState<CollectorStatus | null>(null);
  const [activeSession, setActiveSession] = useState<NetworkSession | null>(null);
  const [sessionList, setSessionList] = useState<NetworkSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [measuring, setMeasuring] = useState<boolean>(false);
  const [runningSpeedTest, setRunningSpeedTest] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = useCallback(async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [h, l, hist, col, actSess, sessList] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchLatestMeasurement().catch(() => null),
        fetchMeasurementHistory(20).catch(() => ({ total_count: 0, limit: 20, offset: 0, measurements: [] })),
        fetchCollectorStatus().catch(() => null),
        fetchActiveSession().catch(() => null),
        fetchSessions(10).catch(() => ({ total_count: 0, active_session: null, sessions: [] })),
      ]);

      setHealth(h);
      setLatest(l);
      setHistory(hist.measurements);
      setCollector(col);
      setActiveSession(actSess || sessList.active_session);
      setSessionList(sessList.sessions);
      setLastRefreshed(new Date());
    } catch (err: any) {
      showToast(err?.message || 'Failed to update telemetry', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Quick latency and hardware counter probe
  const handleQuickProbe = async () => {
    setMeasuring(true);
    try {
      const measurement = await triggerLiveMeasurement(false);
      setLatest(measurement);
      await loadData(true);
      showToast(
        `✓ Latency & counters sampled: ${measurement.latency_ms ?? '--'} ms on ${measurement.interface_name}`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to capture network probe', 'error');
    } finally {
      setMeasuring(false);
    }
  };

  // Controlled throughput download speed test
  const handleRunSpeedTest = async () => {
    setRunningSpeedTest(true);
    try {
      showToast('Testing download throughput against Cloudflare CDN...', 'info');
      const measurement = await runSpeedTest();
      setLatest(measurement);
      await loadData(true);
      showToast(
        `✓ Speed test complete: ${measurement.download_speed_mbps} Mbps download, ${measurement.latency_ms} ms latency!`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Speed test failed', 'error');
    } finally {
      setRunningSpeedTest(false);
    }
  };

  // Session tracking actions
  const handleStartSession = async (notes?: string) => {
    try {
      const sess = await startSession(notes);
      setActiveSession(sess);
      await loadData(true);
      showToast(`Started network session: ${sess.session_id}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to start session', 'error');
    }
  };

  const handleStopSession = async (sessionId?: string) => {
    try {
      const sess = await stopSession(sessionId);
      setActiveSession(null);
      await loadData(true);
      showToast(
        `Session ended: ${sess.total_bytes_combined_human || '0 B'} transferred in ${sess.duration_seconds}s (Avg Latency: ${sess.avg_latency_ms ?? '--'} ms)`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to stop session', 'error');
    }
  };

  // Collector Daemon actions
  const handleToggleCollector = async () => {
    try {
      if (collector?.is_running) {
        const updated = await stopCollector();
        setCollector(updated);
        showToast('Background collector daemon paused', 'info');
      } else {
        const updated = await startCollector();
        setCollector(updated);
        showToast(`Background collector daemon started (polling every ${updated.interval_seconds}s)`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle collector daemon', 'error');
    }
  };

  const handleChangeCollectorInterval = async (seconds: number) => {
    try {
      const updated = await configureCollector(seconds);
      setCollector(updated);
      showToast(`Collector polling interval updated to ${seconds}s`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update interval', 'error');
    }
  };

  const handleTriggerSampleNow = async () => {
    try {
      await fetch('/api/v1/collector/collect-now', { method: 'POST' });
      await loadData(true);
      showToast('Instant background probe captured & persisted', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to trigger sample', 'error');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FBFBFA] flex flex-row text-[#1F2937] antialiased">
      {/* Toast Notification Box */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 transition-all transform animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center space-x-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : 'bg-gray-900 text-white border-gray-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <WifiOff className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Persistent Left Sidebar Navigation (Master Spec Section 4) */}
      <AppSidebar
        currentSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
        health={health}
        latest={latest}
        lastUpdated={lastRefreshed}
      />

      {/* Main Full-Width Application Area */}
      <div className="flex-1 min-w-0 ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 capitalize">
                {currentSection === 'overview' && 'Network Overview'}
                {currentSection === 'monitor' && 'Hardware & Network Monitor'}
                {currentSection === 'usage' && 'Data Usage & Cost Analytics'}
                {currentSection === 'performance' && 'Performance & Stability Analysis'}
                {currentSection === 'recommendations' && 'AI Optimisation Recommendations'}
                {currentSection === 'satellite' && 'Satellite Connectivity Simulator'}
                {currentSection === 'assistant' && 'AI Assistant & Troubleshooting'}
                {currentSection === 'history' && 'Test & Telemetry History'}
                {currentSection === 'settings' && 'Platform Settings & Environment'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentSection === 'overview' && 'Monitor connectivity, understand usage, and optimise performance.'}
                {currentSection === 'monitor' && 'Real-time interface counters, packet metrics, and Wi-Fi signals.'}
                {currentSection === 'usage' && 'Device-level consumption and user-defined internet billing estimates.'}
                {currentSection === 'performance' && 'Latency distribution, jitter, and connection quality trends.'}
                {currentSection === 'recommendations' && 'Traceable deterministic rules engine backed by measured data.'}
                {currentSection === 'satellite' && 'Hypothetical orbital LEO link delay and capacity modeling.'}
                {currentSection === 'assistant' && 'Ask technical networking questions and diagnostic help.'}
                {currentSection === 'history' && 'Historical measurement database records.'}
                {currentSection === 'settings' && 'Manage PostgreSQL configuration, probes, and API keys.'}
              </p>
            </div>
          </div>

          {/* Action Controls & Speed Test Triggers */}
          <div className="flex items-center space-x-3">
            {/* Time-Range Selector Buttons */}
            <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium border border-gray-200">
              {['1h', '6h', '24h', '7d'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setTimeRange(r);
                    showToast(`Time window set to ${r.toUpperCase()}`, 'info');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === r
                      ? 'bg-white text-gray-900 font-semibold shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quick Probe Button */}
            <button
              onClick={handleQuickProbe}
              disabled={measuring || runningSpeedTest}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="Fast latency and interface counter snapshot"
            >
              <Zap className={`w-3.5 h-3.5 text-orange-500 ${measuring ? 'animate-bounce' : ''}`} />
              <span>{measuring ? 'Sampling...' : 'Quick Probe'}</span>
            </button>

            {/* Controlled Throughput Speed Test Button (Primary Vivid Orange) */}
            <button
              onClick={handleRunSpeedTest}
              disabled={measuring || runningSpeedTest}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50"
            >
              <Gauge className={`w-4 h-4 ${runningSpeedTest ? 'animate-spin' : ''}`} />
              <span>{runningSpeedTest ? 'Testing Speed...' : 'Run Speed Test'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadData();
                showToast('Refreshed telemetry data', 'info');
              }}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Body Content based on active sidebar tab */}
        <main className="p-8 space-y-8 flex-1">
          {currentSection === 'overview' && (
            <>
              {/* Primary KPI Metrics Grid (Section 5 Spec) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Download Speed */}
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
                    latest?.download_speed_mbps
                      ? 'Measured via Cloudflare CDN'
                      : 'Click "Run Speed Test"'
                  }
                  isPlaceholder={!latest?.download_speed_mbps}
                />

                {/* 2. Upload Speed */}
                <MetricCard
                  icon={<ArrowUp className="w-5 h-5" />}
                  label="Upload speed"
                  value={
                    latest?.upload_speed_mbps !== null && latest?.upload_speed_mbps !== undefined
                      ? `${latest.upload_speed_mbps}`
                      : '--'
                  }
                  unit="Mbps"
                  subtitle="Rate-limited test"
                  isPlaceholder={true}
                />

                {/* 3. Latency */}
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
                      ? `Via ${latest.measurement_method}`
                      : 'Awaiting probe'
                  }
                  isPlaceholder={latest?.latency_ms === null || latest?.latency_ms === undefined}
                />

                {/* 4. Data Received Today */}
                <MetricCard
                  icon={<Database className="w-5 h-5" />}
                  label="Data received"
                  value={
                    latest?.bytes_recv_human
                      ? latest.bytes_recv_human.split(' ')[0]
                      : '--'
                  }
                  unit={latest?.bytes_recv_human ? latest.bytes_recv_human.split(' ')[1] : 'GB'}
                  subtitle="Device interface counter"
                  isPlaceholder={!latest}
                />

                {/* 5. Data Sent Today */}
                <MetricCard
                  icon={<Radio className="w-5 h-5" />}
                  label="Data sent"
                  value={
                    latest?.bytes_sent_human
                      ? latest.bytes_sent_human.split(' ')[0]
                      : '--'
                  }
                  unit={latest?.bytes_sent_human ? latest.bytes_sent_human.split(' ')[1] : 'MB'}
                  subtitle="Device interface counter"
                  isPlaceholder={!latest}
                />

                {/* 6. AI Network Quality Health */}
                <MetricCard
                  icon={<Brain className="w-5 h-5" />}
                  label="AI network health"
                  value="Not trained"
                  subtitle="Collecting baseline observations"
                  isPlaceholder={true}
                />
              </div>

              {/* Phase 2: Session Network Tracker & Background Collector Daemon */}
              <SessionTrackerCard
                activeSession={activeSession}
                collector={collector}
                onStartSession={handleStartSession}
                onStopSession={handleStopSession}
                onToggleCollector={handleToggleCollector}
                onChangeCollectorInterval={handleChangeCollectorInterval}
                onTriggerSampleNow={handleTriggerSampleNow}
                loading={loading}
              />

              {/* Real-time Throughput Chart Card (Recharts) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Network Throughput Over Time</h2>
                    <p className="text-xs text-gray-500">
                      Chronological measured download speed (Mbps) across recorded tests
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="font-medium text-gray-600">Download Throughput (Mbps)</span>
                  </div>
                </div>

                <ThroughputChart measurements={history} />
              </div>

              {/* Optimisation Insights Banner */}
              <div className="bg-[#FFF7F0] border border-orange-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-orange-100 text-orange-600 shrink-0">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-gray-900">Optimisation Insights & Recommendations</h2>
                      <span className="text-[11px] font-semibold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                        Deterministic Rules Engine
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {latest?.latency_ms && latest.latency_ms < 30
                        ? `Excellent local roundtrip latency (${latest.latency_ms} ms). Your connection is highly responsive for low-latency interactive sessions.`
                        : latest?.latency_ms && latest.latency_ms > 100
                        ? `Elevated roundtrip latency observed (${latest.latency_ms} ms). If experiencing stutter, check for local background updates or high Wi-Fi contention.`
                        : 'Recommendations will calibrate once more continuous observation samples are recorded.'}
                    </p>
                    <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                      <span>• Evidence: Real hardware interface counters</span>
                      <span>• Wi-Fi Signal: {latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}%` : 'N/A'}</span>
                      <span>• Verification: No arbitrary speed-up claims without infrastructure</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Diagnostics & Telemetry Pipeline Grid */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-orange-500" />
                    <h3 className="font-bold text-gray-900 text-sm">System & Pipeline Diagnostics</h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    Host: {latest?.device_id || 'ADARSH'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">FastAPI Backend Status</p>
                    <p className="font-bold text-gray-900 mt-1 flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>{health ? health.status.toUpperCase() : 'CHECKING...'}</span>
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Database Persistence</p>
                    <p className="font-bold text-gray-900 mt-1">
                      {health?.database_engine ? `${health.database_engine.toUpperCase()} (${health.database_status})` : 'Awaiting DB'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Collector Daemon</p>
                    <p className="font-bold text-gray-900 mt-1 flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          collector?.is_running ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      <span>
                        {collector?.is_running ? `RUNNING (${collector.interval_seconds}s)` : 'PAUSED'}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{collector?.run_count ?? 0} cycles recorded</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Active Wi-Fi Network</p>
                    <p className="font-bold text-gray-900 mt-1 truncate" title={latest?.wifi_ssid || 'Direct Interface'}>
                      {latest?.wifi_ssid ? `${latest.wifi_ssid} (${latest.wifi_signal_pct}%)` : latest?.interface_name || 'Wi-Fi'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Total Stored Records</p>
                    <p className="font-bold text-gray-900 mt-1">
                      {history.length} Measurements
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sessionList.length} Network Sessions</p>
                  </div>
                </div>
              </div>

              {/* Historical Measurements Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Persisted Network Measurements</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Verifiable device counter and probe records stored in PostgreSQL / SQLite
                    </p>
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md font-semibold">
                    {history.length} records in database
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Radio className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">No measurements collected yet</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Click &ldquo;Run Speed Test&rdquo; or &ldquo;Quick Probe&rdquo; above to record real network metrics.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Interface</th>
                          <th className="py-3 px-4">Throughput (Mbps)</th>
                          <th className="py-3 px-4">Latency</th>
                          <th className="py-3 px-4">Bytes Received</th>
                          <th className="py-3 px-4">Bytes Sent</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {history.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-gray-500">#{item.id}</td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-900">{item.interface_name}</td>
                            <td className="py-3 px-4">
                              {item.download_speed_mbps !== null ? (
                                <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                  {item.download_speed_mbps} Mbps
                                </span>
                              ) : (
                                <span className="text-gray-400">--</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium">
                              {item.latency_ms !== null ? `${item.latency_ms} ms` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {item.bytes_recv_human || `${item.bytes_recv} B`}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {item.bytes_sent_human || `${item.bytes_sent} B`}
                            </td>
                            <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={item.measurement_method}>
                              {item.measurement_method}
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
            </>
          )}

          {/* Section: Network Monitor */}
          {currentSection === 'monitor' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Live Interface Hardware Inspection</h2>
                <p className="text-xs text-gray-500 mb-6">
                  Detailed inspection of local network interfaces using psutil and platform APIs.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">Active Adapter</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{latest?.interface_name || 'Wi-Fi'}</p>
                    <p className="text-xs text-gray-400 mt-1">Host: {latest?.device_id}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">Wi-Fi SSID & Signal</p>
                    <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                      {latest?.wifi_ssid || 'No SSID reported'}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1 font-semibold">
                      Signal: {latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}%` : 'N/A'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">Last Latency Probe</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{latest?.latency_ms ?? '--'} ms</p>
                    <p className="text-xs text-gray-400 mt-1">{latest?.measurement_method}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Data Usage */}
          {currentSection === 'usage' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Data Usage & Internet Plan Analytics</h2>
                <p className="text-xs text-gray-500 mb-6">
                  Configure your internet plan to estimate monthly consumption and avoid unexpected overages.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 border border-orange-200 bg-[#FFF7F0]/40 rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-gray-900">Configured Internet Plan (Editable)</h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-gray-500 font-medium">Monthly Data Allowance (GB)</label>
                        <input
                          type="number"
                          defaultValue={100}
                          className="mt-1 w-full bg-white border border-gray-300 rounded-lg p-2 font-semibold text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 font-medium">Monthly Plan Cost (₹ / $)</label>
                        <input
                          type="number"
                          defaultValue={799}
                          className="mt-1 w-full bg-white border border-gray-300 rounded-lg p-2 font-semibold text-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border border-gray-200 bg-white rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-gray-900">Streaming Video Estimation Calculator</h3>
                    <p className="text-xs text-gray-500">
                      Estimated data consumption based on standard video bitrate models:
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="font-medium text-gray-700">480p (Standard Definition):</span>
                        <span className="font-mono text-gray-900 font-semibold">~0.7 GB / hour</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="font-medium text-gray-700">1080p (Full HD):</span>
                        <span className="font-mono text-gray-900 font-semibold">~2.5 GB / hour</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-medium text-gray-700">4K (Ultra HD):</span>
                        <span className="font-mono text-gray-900 font-semibold">~7.0 GB / hour</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session-Level Consumption History */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Session-Level Data Tracking & History</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Discrete application and workflow sessions with accumulated usage and average latency
                    </p>
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-md font-semibold">
                    {sessionList.length} Sessions Logged
                  </span>
                </div>
                <div className="p-4">
                  <SessionHistoryTable sessions={sessionList} />
                </div>
              </div>
            </div>
          )}

          {/* Section: Test & Telemetry History */}
          {currentSection === 'history' && (
            <div className="space-y-6">
              {/* Completed Sessions Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Completed Network Sessions</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Logged monitoring periods with duration, total bandwidth consumed, and latency benchmarks
                    </p>
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-md font-semibold">
                    {sessionList.length} Sessions
                  </span>
                </div>
                <div className="p-4">
                  <SessionHistoryTable sessions={sessionList} />
                </div>
              </div>

              {/* Persisted Measurements Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Persisted Device Measurements</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Verifiable device counter and probe records stored in database
                    </p>
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md font-semibold">
                    {history.length} records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Session ID</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Interface</th>
                        <th className="py-3 px-4">Throughput (Mbps)</th>
                        <th className="py-3 px-4">Latency</th>
                        <th className="py-3 px-4">Bytes Received</th>
                        <th className="py-3 px-4">Bytes Sent</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-gray-500">#{item.id}</td>
                          <td className="py-3 px-4 font-mono text-gray-400 truncate max-w-[120px]">{item.notes?.includes('sess_') ? 'Linked' : '--'}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{item.interface_name}</td>
                          <td className="py-3 px-4">
                            {item.download_speed_mbps !== null ? (
                              <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                {item.download_speed_mbps} Mbps
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">
                            {item.latency_ms !== null ? `${item.latency_ms} ms` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {item.bytes_recv_human || `${item.bytes_recv} B`}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {item.bytes_sent_human || `${item.bytes_sent} B`}
                          </td>
                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={item.measurement_method}>
                            {item.measurement_method}
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
              </div>
            </div>
          )}

          {/* Section: Satellite Simulator */}
          {currentSection === 'satellite' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded uppercase">
                    SIMULATED
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">Satellite-to-Ground Link Simulator</h2>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                  Hypothetical geometric link budget and propagation delay model (Independent of real Wi-Fi monitoring).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">Orbital Altitude (LEO)</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">550 km</p>
                    <p className="text-[11px] text-gray-400 mt-1">Low Earth Orbit constellation</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">One-way Light Travel Time</p>
                    <p className="text-xl font-bold text-orange-600 mt-1 font-mono">~3.67 ms</p>
                    <p className="text-[11px] text-gray-400 mt-1">Propagation speed: 300,000 km/s</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500">Estimated Roundtrip Propagation</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">~14.7 ms</p>
                    <p className="text-[11px] text-gray-400 mt-1">Excludes terrestrial routing overhead</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Settings */}
          {currentSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Environment & Configuration Settings</h2>
                <p className="text-xs text-gray-500 mb-6">
                  Here is what you can configure in your backend <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">.env</code> file.
                </p>

                <div className="space-y-4 text-xs font-mono bg-gray-900 text-gray-100 p-5 rounded-xl overflow-x-auto">
                  <p className="text-gray-400"># OrbitLink Environment Configuration</p>
                  <p><span className="text-orange-400">PROJECT_NAME</span>="OrbitLink"</p>
                  <p><span className="text-orange-400">ENVIRONMENT</span>="development"</p>
                  <p><span className="text-orange-400">DATABASE_URL</span>="postgresql+psycopg://orbitlink_user:orbitlink_pass@localhost:5432/orbitlink"</p>
                  <p><span className="text-orange-400">ALLOW_SQLITE_FALLBACK</span>=True <span className="text-gray-500"># Enables automatic zero-config SQLite development</span></p>
                  <p><span className="text-orange-400">DEFAULT_PING_TARGET</span>="1.1.1.1"</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
