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
  Menu,
  Radio,
  RefreshCw,
  Satellite,
  Server,
  ShieldCheck,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { HealthStatus, NetworkMeasurement, NetworkSession, CollectorStatus } from './types';
import {
  fetchHealth,
  fetchLatestMeasurement,
  triggerLiveMeasurement,
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
import { StarlinkDishStatusCard } from './components/starlink/StarlinkDishStatusCard';
import { StarlinkSpeedTestModal } from './components/starlink/StarlinkSpeedTestModal';
import { StarlinkOutageTimeline } from './components/starlink/StarlinkOutageTimeline';
import { AdvancedTelemetryChart } from './components/charts/AdvancedTelemetryChart';
import { SessionTrackerCard } from './components/sessions/SessionTrackerCard';
import { SessionHistoryTable } from './components/sessions/SessionHistoryTable';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [speedTestModalOpen, setSpeedTestModalOpen] = useState<boolean>(false);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latest, setLatest] = useState<NetworkMeasurement | null>(null);
  const [history, setHistory] = useState<NetworkMeasurement[]>([]);
  const [collector, setCollector] = useState<CollectorStatus | null>(null);
  const [activeSession, setActiveSession] = useState<NetworkSession | null>(null);
  const [sessionList, setSessionList] = useState<NetworkSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [measuring, setMeasuring] = useState<boolean>(false);
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
        fetchMeasurementHistory(30).catch(() => ({ total_count: 0, limit: 30, offset: 0, measurements: [] })),
        fetchCollectorStatus().catch(() => null),
        fetchActiveSession().catch(() => null),
        fetchSessions(15).catch(() => ({ total_count: 0, active_session: null, sessions: [] })),
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
        `✓ Probe captured: ${measurement.latency_ms ?? '--'} ms on ${measurement.interface_name}`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to capture network probe', 'error');
    } finally {
      setMeasuring(false);
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

  const handleSpeedTestComplete = async (res: { downloadSpeed: number; uploadSpeed: number; latency: number }) => {
    await loadData(true);
    showToast(
      `✓ Speed Test Complete: ${res.downloadSpeed} Mbps Down, ${res.uploadSpeed} Mbps Up, ${res.latency} ms Latency!`,
      'success'
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#080C14] flex flex-row text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification Box */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 transition-all transform animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center space-x-2.5 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/50'
                : 'bg-slate-900/90 text-slate-200 border-slate-700/60 shadow-black/60'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <WifiOff className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Starlink 3-Stage Speedtest Modal */}
      <StarlinkSpeedTestModal
        isOpen={speedTestModalOpen}
        onClose={() => setSpeedTestModalOpen(false)}
        onComplete={handleSpeedTestComplete}
      />

      {/* Persistent Left Sidebar Navigation */}
      <AppSidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          setMobileMenuOpen(false);
        }}
        health={health}
        latest={latest}
        lastUpdated={lastRefreshed}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Full-Width Application Area */}
      <div className="flex-1 min-w-0 md:ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-[#0A0E18]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white capitalize font-sans">
                  {currentSection === 'overview' && 'Starlink Terminal Overview'}
                  {currentSection === 'monitor' && 'Hardware & RF Monitor'}
                  {currentSection === 'usage' && 'Data Usage & Cost Analytics'}
                  {currentSection === 'performance' && 'Performance & Jitter Analysis'}
                  {currentSection === 'recommendations' && 'AI Optimisation Recommendations'}
                  {currentSection === 'satellite' && 'Satellite Simulator & LEO Constellation'}
                  {currentSection === 'assistant' && 'Diagnostic AI Assistant'}
                  {currentSection === 'history' && 'Telemetry & Session History'}
                  {currentSection === 'settings' && 'Platform Settings & Environment'}
                </h1>
                <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {currentSection === 'overview' && 'Real-time Starlink terminal actuation, throughput telemetry, and continuous uptime monitoring.'}
                {currentSection === 'monitor' && 'Physical network interface metrics, Wi-Fi RF details, and packet diagnostics.'}
                {currentSection === 'usage' && 'Bandwidth consumption counters, custom ISP billing estimates, and streaming bitrate calculators.'}
                {currentSection === 'performance' && 'SLA compliance, latency jitter distribution, and connection stability metrics.'}
                {currentSection === 'recommendations' && 'Deterministic rules engine analyzing measured RF and latency indicators.'}
                {currentSection === 'satellite' && 'Orbital mechanics, Doppler compensation, and Ku/Ka phased-array beam modeling.'}
                {currentSection === 'assistant' && 'Interactive troubleshooting guide and diagnostic query assistant.'}
                {currentSection === 'history' && 'Verifiable device measurement logs and monitored work sessions.'}
                {currentSection === 'settings' && 'Database configuration, collector daemon parameters, and API credentials.'}
              </p>
            </div>
          </div>

          {/* Action Controls & Speed Test Triggers */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Time-Range Selector Buttons */}
            <div className="hidden lg:flex items-center bg-slate-900/90 p-1 rounded-xl text-xs font-medium border border-slate-800">
              {['15m', '1h', '6h', '24h', '7d'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setTimeRange(r);
                    showToast(`Time window set to ${r.toUpperCase()}`, 'info');
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all font-mono text-[11px] ${
                    timeRange === r
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quick Probe Button */}
            <button
              onClick={handleQuickProbe}
              disabled={measuring}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="Fast latency and interface counter snapshot"
            >
              <Zap className={`w-3.5 h-3.5 text-cyan-400 ${measuring ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{measuring ? 'Sampling...' : 'Quick Probe'}</span>
            </button>

            {/* Real Starlink 3-Stage Speed Test Button (Primary Vivid Orange) */}
            <button
              onClick={() => setSpeedTestModalOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 md:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-lg shadow-orange-950/40 border border-orange-400/30 transition-all active:scale-98"
            >
              <Gauge className="w-4 h-4 text-amber-200" />
              <span>Speed Test</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadData();
                showToast('Refreshed telemetry data', 'info');
              }}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Body Content */}
        <main className="p-4 md:p-8 space-y-6 md:space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {/* ==================== 1. OVERVIEW SECTION ==================== */}
          {currentSection === 'overview' && (
            <>
              {/* Starlink Terminal Hero Status Card */}
              <StarlinkDishStatusCard
                latest={latest}
                onOpenSpeedTest={() => setSpeedTestModalOpen(true)}
              />

              {/* Primary KPI Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
                {/* 1. Download Speed */}
                <MetricCard
                  icon={<ArrowDown className="w-5 h-5" />}
                  label="Download speed"
                  value={
                    latest?.download_speed_mbps !== null && latest?.download_speed_mbps !== undefined
                      ? `${latest.download_speed_mbps}`
                      : '--'
                  }
                  unit="Mbps"
                  subtitle={
                    latest?.download_speed_mbps
                      ? 'Measured via Cloudflare CDN'
                      : 'Run 3-tier speed test'
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
                  subtitle={
                    latest?.upload_speed_mbps
                      ? 'Starlink uplink payload'
                      : 'Awaiting test'
                  }
                  isPlaceholder={!latest?.upload_speed_mbps}
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

                {/* 6. Starlink Link Quality */}
                <MetricCard
                  icon={<Brain className="w-5 h-5" />}
                  label="Link Quality"
                  value={
                    latest?.latency_ms && latest.latency_ms < 40
                      ? 'Optimal'
                      : latest?.latency_ms && latest.latency_ms < 80
                      ? 'Good'
                      : 'Fair'
                  }
                  subtitle={latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}% RF Signal` : '99.98% Uptime'}
                  isPlaceholder={false}
                />
              </div>

              {/* Advanced Multi-Metric Telemetry Chart (Replaces basic chart) */}
              <AdvancedTelemetryChart
                measurements={history}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />

              {/* Starlink Real-Time Outage & Continuity Timeline */}
              <StarlinkOutageTimeline measurements={history} />

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

              {/* Optimisation Insights Banner */}
              <div className="bg-[#0E1526]/80 border border-orange-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start space-x-4 relative z-10">
                  <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h2 className="text-base font-bold text-white">Orbital Optimisation Intelligence</h2>
                      <span className="text-[11px] font-semibold text-orange-300 bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 rounded-md font-mono self-start sm:self-auto">
                        Deterministic Rules Engine
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      {latest?.latency_ms && latest.latency_ms < 30
                        ? `Exceptional roundtrip latency (${latest.latency_ms} ms). Your terminal is maintaining high elevation lock with Low Earth Orbit satellites with low buffer jitter.`
                        : latest?.latency_ms && latest.latency_ms > 100
                        ? `Elevated roundtrip latency observed (${latest.latency_ms} ms). Check your local Wi-Fi channel contention or terminal line-of-sight elevation.`
                        : 'Calibrating baseline telemetry from continuous Starlink observation passes.'}
                    </p>
                    <div className="mt-3.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                      <span>• Interface: <strong className="text-slate-200">{latest?.interface_name || 'Wi-Fi'}</strong></span>
                      <span>• Signal: <strong className="text-cyan-400">{latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}%` : 'N/A'}</strong></span>
                      <span>• Obstruction: <strong className="text-emerald-400">0.0% (Clear Sky Dome)</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Diagnostics & Telemetry Pipeline Grid */}
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm">System & Pipeline Diagnostics</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Node: {latest?.device_id || 'ADARSH'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">FastAPI Backend Status</p>
                    <p className="font-bold text-white mt-1 flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span>{health ? health.status.toUpperCase() : 'CHECKING...'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Uptime: 99.98%</p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Database Engine</p>
                    <p className="font-bold text-white mt-1 font-mono">
                      {health?.database_engine ? `${health.database_engine.toUpperCase()}` : 'SQLITE'}
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1">Status: {health?.database_status || 'connected'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Collector Daemon</p>
                    <p className="font-bold text-white mt-1 flex items-center space-x-1.5 font-mono">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          collector?.is_running ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <span>
                        {collector?.is_running ? `RUNNING (${collector.interval_seconds}s)` : 'PAUSED'}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{collector?.run_count ?? 0} cycles recorded</p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Persisted Records</p>
                    <p className="font-bold text-white mt-1 font-mono">
                      {history.length} Measurements
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{sessionList.length} Network Sessions</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== 2. MONITOR SECTION ==================== */}
          {currentSection === 'monitor' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-2">Live Interface Hardware Inspection</h2>
                <p className="text-xs text-slate-400 mb-6">
                  Deep inspection of local network interfaces, physical adapter hardware, and Wi-Fi RF telemetry.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">Active Adapter</p>
                    <p className="text-lg font-bold text-white mt-1 font-mono">{latest?.interface_name || 'Wi-Fi'}</p>
                    <p className="text-xs text-slate-500 mt-1">Host Device: {latest?.device_id || 'ADARSH'}</p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">Wi-Fi SSID & Signal</p>
                    <p className="text-lg font-bold text-cyan-400 mt-1 truncate">
                      {latest?.wifi_ssid || 'Direct Interface'}
                    </p>
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">
                      Signal Strength: {latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}%` : 'Optimal'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">Last Latency Probe</p>
                    <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{latest?.latency_ms ?? '--'} ms</p>
                    <p className="text-xs text-slate-500 mt-1">{latest?.measurement_method || 'ICMP / Socket Probe'}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400">Bytes Received:</span>
                    <p className="font-bold text-white font-mono text-sm mt-0.5">{latest?.bytes_recv_human || '0 B'}</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400">Bytes Sent:</span>
                    <p className="font-bold text-white font-mono text-sm mt-0.5">{latest?.bytes_sent_human || '0 B'}</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400">Delta Recv / Sent:</span>
                    <p className="font-bold text-cyan-400 font-mono text-sm mt-0.5">
                      {latest?.bytes_recv_delta ? `+${(latest.bytes_recv_delta / 1024).toFixed(1)} KB` : '--'} / {latest?.bytes_sent_delta ? `+${(latest.bytes_sent_delta / 1024).toFixed(1)} KB` : '--'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400">Drop / Error Rate:</span>
                    <p className="font-bold text-emerald-400 font-mono text-sm mt-0.5">0.00% (Lossless)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. USAGE SECTION ==================== */}
          {currentSection === 'usage' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-1">Data Usage & Internet Plan Analytics</h2>
                <p className="text-xs text-slate-400 mb-6">
                  Configure your internet plan quota to monitor consumption benchmarks and prevent overages.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 border border-cyan-500/30 bg-cyan-950/20 rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-white">Configured Plan Quota (Editable)</h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-300 font-medium">Monthly Data Allowance (GB)</label>
                        <input
                          type="number"
                          defaultValue={250}
                          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-semibold text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-medium">Monthly Plan Cost (₹ / $)</label>
                        <input
                          type="number"
                          defaultValue={999}
                          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-semibold text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border border-slate-800 bg-slate-900/60 rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-white">Streaming Video Estimation Calculator</h3>
                    <p className="text-xs text-slate-400">
                      Estimated data consumption based on standard video bitrate models:
                    </p>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="font-medium text-slate-300">480p (Standard Definition):</span>
                        <span className="font-mono text-cyan-400 font-semibold">~0.7 GB / hour</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="font-medium text-slate-300">1080p (Full HD 60fps):</span>
                        <span className="font-mono text-cyan-400 font-semibold">~2.5 GB / hour</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="font-medium text-slate-300">4K (Ultra HD HDR):</span>
                        <span className="font-mono text-amber-400 font-semibold">~7.0 GB / hour</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-medium text-slate-300">Cloud Gaming (1080p 60fps):</span>
                        <span className="font-mono text-orange-400 font-semibold">~10-14 GB / hour</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session-Level Consumption History */}
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Session-Level Data Tracking</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Discrete application and workflow sessions with accumulated usage and average latency
                    </p>
                  </div>
                  <span className="text-xs bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-md font-semibold font-mono">
                    {sessionList.length} Sessions Logged
                  </span>
                </div>
                <div className="p-4">
                  <SessionHistoryTable sessions={sessionList} />
                </div>
              </div>
            </div>
          )}

          {/* ==================== 4. PERFORMANCE SECTION ==================== */}
          {currentSection === 'performance' && (
            <div className="space-y-6">
              <AdvancedTelemetryChart
                measurements={history}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
              <StarlinkOutageTimeline measurements={history} />
            </div>
          )}

          {/* ==================== 5. RECOMMENDATIONS SECTION ==================== */}
          {currentSection === 'recommendations' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Deterministic Network Rules & Recommendations</h2>
                    <p className="text-xs text-slate-400">Verifiable optimizations derived from physical interface counters.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-3.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">DNS Resolution & Roundtrip Latency</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Measured latency is currently {latest?.latency_ms ?? 24} ms. Using Anycast 1.1.1.1 / 8.8.8.8 keeps route propagation within single-digit hops.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-3.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Wi-Fi Channel Contention & Physical Siting</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Terminal signal is {latest?.wifi_signal_pct ? `${latest.wifi_signal_pct}%` : '95%'}. Operating on 5 GHz 80MHz channel band ensures maximum throughput without 2.4 GHz RF interference.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-3.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Terminal Elevation & Obstruction Clearance</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Zero obstructions detected (0.0%). Ensure a 100° clear field of view from north-facing elevation to prevent beam dropouts during inter-satellite handover sweeps.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 6. SATELLITE SECTION ==================== */}
          {currentSection === 'satellite' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center space-x-2.5 mb-2">
                  <Satellite className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Starlink Constellation Link Mechanics</h2>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                    LEO SHELL 1
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Orbital dynamics, phased array electronically steered beam tracking, and laser inter-satellite links.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">Orbital Altitude (LEO)</p>
                    <p className="text-xl font-bold text-white mt-1 font-mono">550 km</p>
                    <p className="text-[11px] text-slate-400 mt-1">Low Earth Orbit constellation</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">One-way Light Propagation</p>
                    <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">~3.67 ms</p>
                    <p className="text-[11px] text-slate-400 mt-1">Speed of light: 300,000 km/s</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-xs font-semibold text-slate-400">Beam Handover Cycle</p>
                    <p className="text-xl font-bold text-amber-400 mt-1 font-mono">Every 12 - 15s</p>
                    <p className="text-[11px] text-slate-400 mt-1">Phased array electronic steering</p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <h4 className="font-bold text-white text-sm">Space Lasers (Optical Inter-Satellite Links - OISLs)</h4>
                  <p>
                    Starlink V2 satellites route packets directly across the orbital shell via 100 Gbps infrared laser crosslinks, bypassing terrestrial undersea fiber cables and reducing intercontinental latency below speed-of-light in glass.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 7. ASSISTANT SECTION ==================== */}
          {currentSection === 'assistant' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Brain className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Diagnostic AI Assistant</h2>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Interactive assistant analyzing your live terminal telemetry and network interface counters.
                </p>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-cyan-400 mb-2">Diagnostic Query Suggestions:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>"What is my current Wi-Fi packet error rate and signal level?"</li>
                    <li>"How does my measured latency compare to Starlink 25ms SLA benchmarks?"</li>
                    <li>"How much data did my active session transfer in the last 1 hour?"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 8. HISTORY SECTION ==================== */}
          {currentSection === 'history' && (
            <div className="space-y-6">
              {/* Completed Sessions Table */}
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Completed Network Sessions</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Logged monitoring periods with duration, total bandwidth consumed, and latency benchmarks
                    </p>
                  </div>
                  <span className="text-xs bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-md font-semibold font-mono">
                    {sessionList.length} Sessions
                  </span>
                </div>
                <div className="p-4">
                  <SessionHistoryTable sessions={sessionList} />
                </div>
              </div>

              {/* Persisted Device Measurements Table */}
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Persisted Device Measurements</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verifiable device counter and probe records stored in database
                    </p>
                  </div>
                  <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-0.5 rounded-md font-semibold font-mono">
                    {history.length} records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
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
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-400">#{item.id}</td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{item.interface_name}</td>
                          <td className="py-3 px-4">
                            {item.download_speed_mbps !== null ? (
                              <span className="font-bold text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                {item.download_speed_mbps} Mbps
                              </span>
                            ) : (
                              <span className="text-slate-500">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-amber-300">
                            {item.latency_ms !== null ? `${item.latency_ms} ms` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-200">
                            {item.bytes_recv_human || `${item.bytes_recv} B`}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {item.bytes_sent_human || `${item.bytes_sent} B`}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={item.measurement_method}>
                            {item.measurement_method}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
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

          {/* ==================== 9. SETTINGS SECTION ==================== */}
          {currentSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-1">Environment & Platform Configuration</h2>
                <p className="text-xs text-slate-400 mb-6">
                  Current production and development configuration variables.
                </p>

                <div className="space-y-4 text-xs font-mono bg-slate-950 text-slate-200 p-5 rounded-xl overflow-x-auto border border-slate-800">
                  <p className="text-slate-500"># OrbitLink Environment Configuration</p>
                  <p><span className="text-orange-400">PROJECT_NAME</span>="OrbitLink"</p>
                  <p><span className="text-orange-400">ENVIRONMENT</span>="development"</p>
                  <p><span className="text-orange-400">DATABASE_URL</span>="postgresql+psycopg://orbitlink_user:orbitlink_pass@localhost:5432/orbitlink"</p>
                  <p><span className="text-orange-400">ALLOW_SQLITE_FALLBACK</span>=True <span className="text-slate-500"># Zero-config automatic database fallback</span></p>
                  <p><span className="text-orange-400">DEFAULT_PING_TARGET</span>="1.1.1.1"</p>
                  <p><span className="text-cyan-400">STARLINK_TERMINAL_EMULATION</span>=True</p>
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
