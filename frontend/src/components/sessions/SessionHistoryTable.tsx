import { Clock } from 'lucide-react';
import type { NetworkSession } from '../../types';


interface SessionHistoryTableProps {
  sessions: NetworkSession[];
}

export function SessionHistoryTable({ sessions }: SessionHistoryTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">No session history yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Completed network sessions will be logged here with duration and total data usage.
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
        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
          <tr>
            <th className="py-3 px-4">Session ID</th>
            <th className="py-3 px-4">Label / Notes</th>
            <th className="py-3 px-4">Duration</th>
            <th className="py-3 px-4">Total Consumed</th>
            <th className="py-3 px-4">Download / Upload</th>
            <th className="py-3 px-4">Avg Latency</th>
            <th className="py-3 px-4">Samples</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {sessions.map((sess) => (
            <tr key={sess.session_id} className="hover:bg-gray-50/70 transition-colors">
              <td className="py-3 px-4 font-mono font-medium text-gray-500">{sess.session_id}</td>
              <td className="py-3 px-4 font-semibold text-gray-900">
                {sess.notes || <span className="text-gray-400 italic">General Session</span>}
              </td>
              <td className="py-3 px-4 font-mono font-medium text-gray-700">
                {formatDuration(sess.duration_seconds)}
              </td>
              <td className="py-3 px-4 font-bold text-orange-600">
                {sess.total_bytes_combined_human || '0 B'}
              </td>
              <td className="py-3 px-4 text-gray-500">
                ↓ {sess.total_bytes_recv_human || '0 B'} • ↑ {sess.total_bytes_sent_human || '0 B'}
              </td>
              <td className="py-3 px-4 font-mono">
                {sess.avg_latency_ms !== null ? `${sess.avg_latency_ms} ms` : 'N/A'}
              </td>
              <td className="py-3 px-4 text-gray-600">{sess.sample_count} probes</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    sess.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
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
