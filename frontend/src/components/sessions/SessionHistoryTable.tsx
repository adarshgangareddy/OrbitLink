import { Clock } from 'lucide-react';
import type { NetworkSession } from '../../types';


interface SessionHistoryTableProps {
  sessions: NetworkSession[];
}

export function SessionHistoryTable({ sessions }: SessionHistoryTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">No session history recorded</p>
        <p className="text-xs text-slate-500 mt-1">
          Completed network sessions will be logged here with duration, transferred bytes, and latency benchmarks.
        </p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '< 1s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="py-3 px-4">Session ID</th>
            <th className="py-3 px-4">Task / Label</th>
            <th className="py-3 px-4">Duration</th>
            <th className="py-3 px-4">Total Consumed</th>
            <th className="py-3 px-4">Download / Upload</th>
            <th className="py-3 px-4">Avg Latency</th>
            <th className="py-3 px-4">Samples</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {sessions.map((sess) => (
            <tr key={sess.session_id} className="hover:bg-slate-800/40 transition-colors">
              <td className="py-3 px-4 font-mono font-medium text-slate-400">{sess.session_id}</td>
              <td className="py-3 px-4 font-semibold text-white">
                {sess.notes || <span className="text-slate-500 italic">General Session</span>}
              </td>
              <td className="py-3 px-4 font-mono font-medium text-slate-300">
                {formatDuration(sess.duration_seconds)}
              </td>
              <td className="py-3 px-4 font-mono font-bold text-orange-400">
                {sess.total_bytes_combined_human || '0 B'}
              </td>
              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                ↓ {sess.total_bytes_recv_human || '0 B'} • ↑ {sess.total_bytes_sent_human || '0 B'}
              </td>
              <td className="py-3 px-4 font-mono text-cyan-400">
                {sess.avg_latency_ms !== null ? `${sess.avg_latency_ms} ms` : 'N/A'}
              </td>
              <td className="py-3 px-4 text-slate-400">{sess.sample_count} probes</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    sess.is_active
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                  }`}
                >
                  {sess.is_active ? 'Active' : 'Completed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
