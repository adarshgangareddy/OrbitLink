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
import type {
  HealthStatus,
  NetworkMeasurement,
  NetworkSession,
  CollectorStatus,
  CostOptimizationAnalysis,
  PlanConfig,
  QualityDiagnosisItem,
  BandwidthScheduleRecommendation,
  EnvironmentalImpactReport,
  MLForecastResponse,
} from './types';
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
  fetchCostAnalysis,
  saveCurrentPlan,
  fetchQualityDiagnoses,
  verifyRemediationAction,
  fetchBandwidthSchedule,
  fetchEnvironmentalImpact,
  queryAssistant,
  fetchMLForecast,
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
import { CostOptimizerView } from './components/optimizer/CostOptimizerView';
import { QualityDiagnosticsCard } from './components/diagnostics/QualityDiagnosticsCard';
import { BandwidthSchedulerCard } from './components/efficiency/BandwidthSchedulerCard';
import { EnvironmentalImpactCard } from './components/efficiency/EnvironmentalImpactCard';
import { GroundedAssistantView } from './components/assistant/GroundedAssistantView';
import { UsageForecastCard } from './components/forecasting/UsageForecastCard';

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

  // Optimization & Intelligence States
  const [costAnalysis, setCostAnalysis] = useState<CostOptimizationAnalysis | null>(null);
  const [diagnoses, setDiagnoses] = useState<QualityDiagnosisItem[]>([]);
  const [schedule, setSchedule] = useState<BandwidthScheduleRecommendation | null>(null);
  const [environmental, setEnvironmental] = useState<EnvironmentalImpactReport | null>(null);
  const [forecast, setForecast] = useState<MLForecastResponse | null>(null);

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
      const [h, l, hist, col, actSess, sessList, costRes, diagRes, schedRes, envRes, fcRes] =
        await Promise.all([
          fetchHealth().catch(() => null),
          fetchLatestMeasurement().catch(() => null),
          fetchMeasurementHistory(30).catch(() => ({ total_count: 0, limit: 30, offset: 0, measurements: [] })),
          fetchCollectorStatus().catch(() => null),
          fetchActiveSession().catch(() => null),
          fetchSessions(15).catch(() => ({ total_count: 0, active_session: null, sessions: [] })),
          fetchCostAnalysis().catch(() => null),
          fetchQualityDiagnoses().catch(() => []),
          fetchBandwidthSchedule().catch(() => null),
          fetchEnvironmentalImpact().catch(() => null),
          fetchMLForecast().catch(() => null),
        ]);

      setHealth(h);
      setLatest(l);
      setHistory(hist.measurements);
      setCollector(col);
      setActiveSession(actSess || sessList.active_session);
      setSessionList(sessList.sessions);
      setCostAnalysis(costRes);
      setDiagnoses(diagRes);
      setSchedule(schedRes);
      setEnvironmental(envRes);
      setForecast(fcRes);
      setLastRefreshed(new Date());
    } catch (err: any) {
      showToast(err?.message || 'Failed to update telemetry', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 12000);
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

  // Feature A Callbacks: Plan Configuration & Savings Recalculation
  const handleSavePlan = async (plan: PlanConfig) => {
    try {
      await saveCurrentPlan(plan);
      const updatedAnalysis = await fetchCostAnalysis();
      setCostAnalysis(updatedAnalysis);
      showToast(`Saved ISP plan: ${plan.plan_name}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save plan', 'error');
    }
  };

  const handleRecalculateCost = async (customGb?: number) => {
    try {
      const updated = await fetchCostAnalysis(customGb);
      setCostAnalysis(updated);
    } catch (err: any) {
      showToast(err?.message || 'Failed to recalculate cost', 'error');
    }
  };

  // Feature B Callbacks: Quality Diagnostics & Verification
  const handleVerifyAction = async (action: string) => {
    const res = await verifyRemediationAction(action);
    showToast(`Verification outcome: ${res.outcome.toUpperCase()}`, res.outcome === 'improved' ? 'success' : 'info');
    return res;
  };

  const handleRefreshDiagnoses = async () => {
    const res = await fetchQualityDiagnoses();
    setDiagnoses(res);
    showToast('Quality diagnostics refreshed', 'info');
  };

  // Feature C Callback: Bandwidth Scheduler
  const handleFileSizeChange = async (sizeGb: number) => {
    try {
      const res = await fetchBandwidthSchedule(sizeGb);
      setSchedule(res);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update schedule', 'error');
    }
  };

  // Feature E Callback: Assistant Query
  const handleAssistantQuery = async (q: string) => {
    return await queryAssistant(q);
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
                  {currentSection === 'monitor' && 'Hardware & RF Quality Monitor'}
                  {currentSection === 'usage' && 'Internet Cost Optimizer & Usage'}
                  {currentSection === 'performance' && 'Network Quality & Jitter Intelligence'}
                  {currentSection === 'recommendations' && 'Bandwidth & Efficiency Intelligence'}
                  {currentSection === 'satellite' && 'Satellite Simulator & LEO Constellation'}
                  {currentSection === 'assistant' && 'Grounded AI Diagnostic Assistant'}
                  {currentSection === 'history' && 'Telemetry & Session History'}
                  {currentSection === 'settings' && 'Platform Settings & Environment'}
                </h1>
                <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {currentSection === 'overview' && 'Real-time terminal telemetry, KPI benchmarks, and continuous link status.'}
                {currentSection === 'monitor' && 'Evidence-based diagnoses, Wi-Fi RF attenuation, and remediation verification.'}
                {currentSection === 'usage' && 'Deterministic plan comparison, overage safeguards, and carbon footprint estimation.'}
                {currentSection === 'performance' && 'Bufferbloat identification, RFC 3393 jitter, and Starlink 25ms SLA compliance.'}
                {currentSection === 'recommendations' && 'Smart off-peak download scheduler, 24h diurnal demand profiling, and resource efficiency.'}
                {currentSection === 'satellite' && 'Orbital mechanics, Doppler compensation, and phased-array beam modeling.'}
                {currentSection === 'assistant' && 'Grounded RAG assistant with verifiable technical citations and backend tools.'}
                {currentSection === 'history' && 'Verifiable device measurement logs and recorded monitoring sessions.'}
                {currentSection === 'settings' && 'Environment configuration, collector daemon parameters, and credentials.'}
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

            {/* Real Starlink 3-Stage Speed Test Button */}
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

                {/* 4. Data Received */}
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

                {/* 5. Data Sent */}
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

                {/* 6. Link Quality */}
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

              {/* Advanced Multi-Metric Telemetry Chart */}
              <AdvancedTelemetryChart
                measurements={history}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />

              {/* Starlink Real-Time Outage Timeline */}
              <StarlinkOutageTimeline measurements={history} />

              {/* Phase 2: Session Tracker & Background Collector */}
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
            </>
          )}

          {/* ==================== 2. MONITOR SECTION (Feature B) ==================== */}
          {currentSection === 'monitor' && (
            <div className="space-y-6">
              <QualityDiagnosticsCard
                diagnoses={diagnoses}
                onVerifyAction={handleVerifyAction}
                onRefreshDiagnoses={handleRefreshDiagnoses}
                loading={loading}
              />

              {/* Physical Adapter Hardware Inspection */}
              <div className="bg-[#0E1526]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-2">Physical Interface Hardware Inspection</h2>
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
              </div>
            </div>
          )}

          {/* ==================== 3. USAGE SECTION (Features A, D, F) ==================== */}
          {currentSection === 'usage' && (
            <div className="space-y-6">
              {/* Feature A: Internet Cost Optimizer & Plan Analysis */}
              <CostOptimizerView
                analysis={costAnalysis}
                onSavePlan={handleSavePlan}
                onRecalculate={handleRecalculateCost}
                loading={loading}
              />

              {/* Feature F: Machine Learning Usage Forecasting */}
              <UsageForecastCard forecast={forecast} loading={loading} />

              {/* Feature D: Environmental & Resource Transmission Efficiency */}
              <EnvironmentalImpactCard report={environmental} loading={loading} />

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

          {/* ==================== 4. PERFORMANCE SECTION (Feature B) ==================== */}
          {currentSection === 'performance' && (
            <div className="space-y-6">
              <AdvancedTelemetryChart
                measurements={history}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
              <QualityDiagnosticsCard
                diagnoses={diagnoses}
                onVerifyAction={handleVerifyAction}
                onRefreshDiagnoses={handleRefreshDiagnoses}
                loading={loading}
              />
              <StarlinkOutageTimeline measurements={history} />
            </div>
          )}

          {/* ==================== 5. RECOMMENDATIONS SECTION (Features C & D) ==================== */}
          {currentSection === 'recommendations' && (
            <div className="space-y-6">
              {/* Feature C: Smart Bandwidth Efficiency Scheduler */}
              <BandwidthSchedulerCard
                schedule={schedule}
                onFileSizeChange={handleFileSizeChange}
                loading={loading}
              />

              {/* Feature D: Environmental Resource Efficiency */}
              <EnvironmentalImpactCard report={environmental} loading={loading} />
            </div>
          )}

          {/* ==================== 6. ASSISTANT SECTION (Feature E) ==================== */}
          {currentSection === 'assistant' && (
            <div className="space-y-6">
              <GroundedAssistantView onQuery={handleAssistantQuery} loading={loading} />
            </div>
          )}

          {/* ==================== 7. SATELLITE SECTION ==================== */}
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
                  <p><span className="text-emerald-400">AI_COST_OPTIMIZER_ENABLED</span>=True</p>
                  <p><span className="text-emerald-400">QUALITY_INTELLIGENCE_ENABLED</span>=True</p>
                  <p><span className="text-emerald-400">BANDWIDTH_SCHEDULER_ENABLED</span>=True</p>
                  <p><span className="text-emerald-400">ENVIRONMENTAL_ESTIMATOR_ENABLED</span>=True</p>
                  <p><span className="text-emerald-400">GROUNDED_AI_RAG_ENABLED</span>=True</p>
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
