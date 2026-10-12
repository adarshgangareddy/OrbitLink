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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Header with Title and Daemon Status Bar */}
      <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-gray-900">Session Network Tracker & Background Collector</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              Phase 2 Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Automatic background polling daemon paired with isolated, session-level usage accounting.
          </p>
        </div>

        {/* Collector Daemon Quick Bar */}
        <div className="flex items-center space-x-3 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                collector?.is_running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs font-semibold text-gray-800">
              {collector?.is_running ? 'Collector Running' : 'Collector Paused'}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-200" />

          {/* Interval Selector */}
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <Sliders className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={collector?.interval_seconds ?? 15}
              onChange={(e) => onChangeCollectorInterval(Number(e.target.value))}
              disabled={loading}
              className="bg-transparent font-medium text-xs text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value={5}>Every 5s</option>
              <option value={15}>Every 15s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
            </select>
          </div>

          <div className="h-4 w-px bg-gray-200" />

          {/* Sample Now Button */}
          <button
            onClick={handleSampleClick}
            disabled={loading || isSampling}
            className="text-xs font-medium text-gray-700 hover:text-orange-600 flex items-center space-x-1 transition-colors disabled:opacity-50"
            title="Execute immediate collection sample"
          >
            <Zap className={`w-3.5 h-3.5 text-orange-500 ${isSampling ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sample Now</span>
          </button>

          {/* Toggle Button */}
          <button
            onClick={onToggleCollector}
            disabled={loading}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              collector?.is_running
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
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
            <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Session In Progress
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    ID: {activeSession.session_id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mt-1">
                  {activeSession.notes ? `“${activeSession.notes}”` : 'Live Network Session'}
                </h3>
                <p className="text-xs text-gray-500">
                  Adapter: <span className="font-semibold text-gray-800">{activeSession.interface_name}</span> • Started at{' '}
                  {new Date(activeSession.start_time).toLocaleTimeString()}
                </p>
              </div>

              {/* Live Timer and Stop Button */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 uppercase font-semibold">Active Duration</p>
                  <div className="flex items-center space-x-1 text-2xl font-bold font-mono text-gray-900">
                    <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
                    <span>{formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onStopSession(activeSession.session_id)}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Session</span>
                </button>
              </div>
            </div>

            {/* Session Accumulated Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500">Total Transferred</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {activeSession.total_bytes_combined_human || '0 B'}
                </p>
                <div className="flex items-center space-x-2 mt-1 text-[11px] text-gray-400">
                  <span className="text-emerald-600 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    {activeSession.total_bytes_recv_human || '0 B'}
                  </span>
                  <span>•</span>
                  <span className="text-blue-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {activeSession.total_bytes_sent_human || '0 B'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500">Average Latency</p>
                <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
                  {activeSession.avg_latency_ms !== null ? `${activeSession.avg_latency_ms} ms` : '--'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Min: {activeSession.min_latency_ms ?? '--'} ms • Peak: {activeSession.peak_latency_ms ?? '--'} ms
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500">Samples Captured</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {activeSession.sample_count} probes
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Linked to measurements table
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500">Wi-Fi Connection</p>
                <p className="text-sm font-bold text-gray-900 mt-1 truncate" title={activeSession.wifi_ssid || 'Direct'}>
                  {activeSession.wifi_ssid || 'Local Adapter'}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Status: {activeSession.status}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/40">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Start an Isolated Network Monitoring Session</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Track exact bytes sent and received during a specific task — such as high-def streaming, online gaming, cloud backups, or video calls.
                </p>
              </div>

              {/* Quick Tag Recommendations */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-xs text-gray-400 mr-1">Quick label:</span>
                {['Work Meeting', '4K Video Stream', 'Competitive Gaming', 'Cloud File Sync', 'General Browsing'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSessionNotes(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        sessionNotes === tag
                          ? 'bg-orange-100 border-orange-300 text-orange-800 font-semibold'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <button
                  onClick={() => {
                    onStartSession(sessionNotes.trim() || undefined);
                    setSessionNotes('');
                  }}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50"
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
