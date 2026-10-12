import { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { NetworkSession, CollectorStatus } from '../../types';

interface SessionTrackerCardProps {
  activeSession: NetworkSession | null;
  collector: CollectorStatus | null;
  onStartSession: (notes?: string) => Promise<void>;
  onStopSession: (sessionId?: string) => Promise<void>;
  onToggleCollector: () => Promise<void>;
  onChangeCollectorInterval: (seconds: number) => Promise<void>;
  onTriggerSampleNow: () => Promise<void>;
  loading: boolean;
}

export function SessionTrackerCard({
  activeSession,
  collector,
  onStartSession,
  onStopSession,
  onToggleCollector,
  onChangeCollectorInterval,
  onTriggerSampleNow,
  loading,
}: SessionTrackerCardProps) {
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSampling, setIsSampling] = useState<boolean>(false);

  // Live timer for active session
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.start_time).getTime();
    const updateElapsed = () => {
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSampleClick = async () => {
    setIsSampling(true);
    try {
      await onTriggerSampleNow();
    } finally {
      setIsSampling(false);
    }
  };

  return (
    <div className="bg-[#0E1526]/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md text-slate-100">
      {/* Header with Title and Daemon Status Bar */}
      <div className="px-6 py-4 bg-slate-900/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Active Session & Background Collector</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              Autonomous Daemon
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic background polling daemon paired with isolated, session-level usage accounting.
          </p>
        </div>

        {/* Collector Daemon Quick Bar */}
        <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                collector?.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-xs font-semibold text-slate-200">
              {collector?.is_running ? 'Collector Running' : 'Collector Paused'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Interval Selector */}
          <div className="flex items-center space-x-1 text-xs text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={collector?.interval_seconds ?? 15}
              onChange={(e) => onChangeCollectorInterval(Number(e.target.value))}
              disabled={loading}
              className="bg-slate-900 font-medium text-xs text-slate-200 focus:outline-none cursor-pointer rounded px-1"
            >
              <option value={5}>Every 5s</option>
              <option value={15}>Every 15s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Sample Now Button */}
          <button
            onClick={handleSampleClick}
            disabled={loading || isSampling}
            className="text-xs font-medium text-slate-300 hover:text-cyan-400 flex items-center space-x-1 transition-colors disabled:opacity-50"
            title="Execute immediate collection sample"
          >
            <Zap className={`w-3.5 h-3.5 text-orange-400 ${isSampling ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sample Now</span>
          </button>

          {/* Toggle Button */}
          <button
            onClick={onToggleCollector}
            disabled={loading}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              collector?.is_running
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs'
            }`}
          >
            {collector?.is_running ? 'Pause Daemon' : 'Start Daemon'}
          </button>
        </div>
      </div>

      {/* Main Body: Active Session vs Start Session */}
      <div className="p-6">
        {activeSession ? (
          <div className="space-y-6">
            {/* Active Session Status Card */}
            <div className="bg-slate-900/60 border border-cyan-500/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                    Session In Progress
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {activeSession.session_id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-1">
                  {activeSession.notes ? `“${activeSession.notes}”` : 'Live Network Session'}
                </h3>
                <p className="text-xs text-slate-400">
                  Adapter: <span className="font-semibold text-slate-200">{activeSession.interface_name}</span> • Started at{' '}
                  {new Date(activeSession.start_time).toLocaleTimeString()}
                </p>
              </div>

              {/* Live Timer and Stop Button */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Duration</p>
                  <div className="flex items-center space-x-1.5 text-2xl font-bold font-mono text-white">
                    <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
                    <span>{formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onStopSession(activeSession.session_id)}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Session</span>
                </button>
              </div>
            </div>

            {/* Session Accumulated Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-xs font-medium text-slate-400">Total Transferred</p>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {activeSession.total_bytes_combined_human || '0 B'}
                </p>
                <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                  <span className="text-emerald-400 flex items-center font-mono">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    {activeSession.total_bytes_recv_human || '0 B'}
                  </span>
                  <span>•</span>
                  <span className="text-cyan-400 flex items-center font-mono">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {activeSession.total_bytes_sent_human || '0 B'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-xs font-medium text-slate-400">Average Latency</p>
                <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                  {activeSession.avg_latency_ms !== null ? `${activeSession.avg_latency_ms} ms` : '--'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Min: {activeSession.min_latency_ms ?? '--'} ms • Peak: {activeSession.peak_latency_ms ?? '--'} ms
                </p>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-xs font-medium text-slate-400">Samples Captured</p>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {activeSession.sample_count} probes
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Persisted with session metadata
                </p>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-xs font-medium text-slate-400">Wi-Fi Connection</p>
                <p className="text-sm font-bold text-white mt-1 truncate" title={activeSession.wifi_ssid || 'Direct'}>
                  {activeSession.wifi_ssid || 'Local Adapter'}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium mt-1">
                  Status: {activeSession.status}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-800 rounded-xl p-6 bg-slate-900/30">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Start an Isolated Network Monitoring Session</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Track exact bytes sent and received during a specific task — high-def streaming, online gaming, cloud backups, or video calls.
                </p>
              </div>

              {/* Quick Tag Recommendations */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 mr-1">Quick label:</span>
                {['Work Meeting', '4K Video Stream', 'Competitive Gaming', 'Cloud File Sync', 'General Browsing'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSessionNotes(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        sessionNotes === tag
                          ? 'bg-orange-600/30 border-orange-500 text-orange-300 font-semibold'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>

              {/* Start Session Input & Action */}
              <div className="flex max-w-md mx-auto items-center space-x-2 pt-2">
                <input
                  type="text"
                  placeholder="Optional session label (e.g. Zoom Call #3)..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
                <button
                  onClick={() => {
                    onStartSession(sessionNotes.trim() || undefined);
                    setSessionNotes('');
                  }}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Session</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
