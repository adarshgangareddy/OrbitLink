import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type {
  DiagnosticVerificationResponse,
  QualityDiagnosisItem,
} from '../../types';

interface QualityDiagnosticsCardProps {
  diagnoses: QualityDiagnosisItem[];
  onVerifyAction: (actionTaken: string) => Promise<DiagnosticVerificationResponse>;
  onRefreshDiagnoses: () => Promise<void>;
  loading?: boolean;
}

export function QualityDiagnosticsCard({
  diagnoses,
  onVerifyAction,
  onRefreshDiagnoses,
  loading = false,
}: QualityDiagnosticsCardProps) {
  const [actionInput, setActionInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<DiagnosticVerificationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionInput.trim()) return;
    setVerifying(true);
    try {
      const res = await onVerifyAction(actionInput.trim());
      setVerificationResult(res);
      await onRefreshDiagnoses();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Refresh */}
      <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Network Quality Intelligence Engine
              </h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                EVIDENCE-BASED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-dimensional analysis covering latency variation, bufferbloat under load, and Wi-Fi RF attenuation.
            </p>
          </div>

          <button
            onClick={onRefreshDiagnoses}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all self-start sm:self-auto"
            title="Refresh Diagnostic Scan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Diagnoses List */}
        <div className="mt-5 space-y-4">
          {diagnoses.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No active diagnoses recorded.</p>
          ) : (
            diagnoses.map((diag, idx) => {
              const isCrit = diag.severity === 'critical';
              const isWarn = diag.severity === 'warning';
              const isNorm = diag.severity === 'normal';

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCrit
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isNorm
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      {isNorm ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      )}
                      <h3 className="text-sm font-bold text-white">{diag.headline}</h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isNorm
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : isWarn
                          ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {diag.severity}
                    </span>
                  </div>

                  <div className="space-y-2 mt-3 text-xs">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 font-semibold">Observed Evidence: </span>
                      <span className="text-slate-200">{diag.observed_evidence}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                        <span className="text-slate-400 font-semibold block mb-0.5">Likely Explanation:</span>
                        <span className="text-slate-300">{diag.likely_explanation}</span>
                      </div>
                      {diag.competing_explanations.length > 0 && (
                        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                          <span className="text-slate-400 font-semibold block mb-0.5">Competing Factors:</span>
                          <span className="text-slate-400">{diag.competing_explanations.join(' • ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-500/30">
                      <span className="text-cyan-400 font-semibold">Recommended Safe Action: </span>
                      <span className="text-slate-200">{diag.safe_next_action}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Verification Method: {diag.verification_method}</span>
                      <span>Confidence: {diag.uncertainty}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive Before vs After Fix Verification Box */}
      <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Remediation Verification Engine (Did the change work?)
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Record any action you just performed (e.g. "Switched to 5 GHz channel", "Moved laptop closer to router", "Paused OneDrive sync").
          OrbitLink will compare post-action telemetry against your pre-action baseline to verify real improvement.
        </p>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            placeholder="e.g. Switched to 5 GHz 80MHz Wi-Fi network"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            required
          />
          <button
            type="submit"
            disabled={verifying}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 shrink-0"
          >
            {verifying ? 'Evaluating...' : 'Verify Fix Outcome'}
          </button>
        </form>

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400">Action Tested:</span>
              <span
                className={`font-bold uppercase px-2 py-0.5 rounded-full border text-[10px] ${
                  verificationResult.outcome === 'improved'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                    : verificationResult.outcome === 'degraded'
                    ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                Outcome: {verificationResult.outcome}
              </span>
            </div>
            <p className="text-slate-200">{verificationResult.explanation}</p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-500">Latency: </span>
                <span className="text-slate-300">
                  {verificationResult.before_latency_ms ?? '--'} ms → {verificationResult.after_latency_ms ?? '--'} ms
                </span>
              </div>
              <div>
                <span className="text-slate-500">Signal: </span>
                <span className="text-slate-300">
                  {verificationResult.before_signal_pct ?? '--'}% → {verificationResult.after_signal_pct ?? '--'}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
