import { useState } from 'react';
import {
  DollarSign,
  AlertCircle,
  Sliders,
  Save,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import type { CostOptimizationAnalysis, PlanConfig } from '../../types';

interface CostOptimizerViewProps {
  analysis: CostOptimizationAnalysis | null;
  onSavePlan: (plan: PlanConfig) => Promise<void>;
  onRecalculate: (customMonthlyGb?: number) => Promise<void>;
  loading?: boolean;
}

export function CostOptimizerView({
  analysis,
  onSavePlan,
  onRecalculate,
  loading = false,
}: CostOptimizerViewProps) {
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [customUsage, setCustomUsage] = useState<number>(
    analysis?.projected_monthly_gb ?? 120
  );

  // Editable Plan Form State
  const current = analysis?.current_plan;
  const [planName, setPlanName] = useState(current?.plan_name ?? 'Standard Broadband');
  const [provider, setProvider] = useState(current?.provider ?? 'Current ISP');
  const [monthlyCost, setMonthlyCost] = useState(current?.monthly_cost ?? 999);
  const [currency, setCurrency] = useState(current?.currency ?? 'INR');
  const [dataAllowanceGb, setDataAllowanceGb] = useState<number | string>(
    current?.data_allowance_gb ?? 300
  );
  const [advertisedDownload, setAdvertisedDownload] = useState(
    current?.advertised_download_mbps ?? 100
  );
  const [overageRate, setOverageRate] = useState(current?.overage_rate_per_gb ?? 10);
  const [equipmentFee, setEquipmentFee] = useState(current?.equipment_rental_fee ?? 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePlan({
      plan_name: planName,
      provider: provider,
      monthly_cost: Number(monthlyCost),
      currency: currency,
      billing_cycle_day: 1,
      data_allowance_gb: dataAllowanceGb === '' ? null : Number(dataAllowanceGb),
      advertised_download_mbps: Number(advertisedDownload),
      advertised_upload_mbps: 20,
      equipment_rental_fee: Number(equipmentFee),
      overage_rate_per_gb: Number(overageRate),
    });
    setIsEditingPlan(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Observed Consumption vs Configured Plan */}
      <div className="bg-[#0E1526]/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                AI Internet Cost Optimizer & Plan Analysis
              </h2>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                DETERMINISTIC MATH
              </span>
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verifiable financial modeling comparing your measured interface usage against verified market tiers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditingPlan(!isEditingPlan)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            >
              {isEditingPlan ? 'Cancel Edit' : 'Configure Current Plan'}
            </button>
          </div>
        </div>

        {/* Current Plan Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-xs">
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Current Plan & ISP:</span>
            <p className="font-bold text-white text-sm mt-0.5 truncate">
              {current?.plan_name || 'Standard Broadband'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{current?.provider || 'Active ISP'}</p>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Base Monthly Bill:</span>
            <p className="font-bold text-emerald-400 text-sm mt-0.5 font-mono">
              {current?.currency || '₹'} {current?.monthly_cost?.toFixed(2) || '999.00'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {current?.equipment_rental_fee ? `+₹${current.equipment_rental_fee} equip` : 'No equip fees'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Measured Consumption:</span>
            <p className="font-bold text-cyan-400 text-sm mt-0.5 font-mono">
              {analysis?.observed_total_gb?.toFixed(1) || '0.0'} GB
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {analysis?.days_analyzed || 1} day(s) monitored
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Projected Monthly Demand:</span>
            <p className="font-bold text-amber-400 text-sm mt-0.5 font-mono">
              ~{analysis?.projected_monthly_gb?.toFixed(1) || '75.0'} GB / mo
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Avg {analysis?.daily_avg_gb?.toFixed(1) || '2.5'} GB/day
            </p>
          </div>
        </div>

        {/* Inline Plan Edit Form */}
        {isEditingPlan && (
          <form onSubmit={handleSave} className="mt-5 p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Update Current Plan Parameters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400">Plan Name</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400">ISP Provider</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400">Monthly Cost (Price)</label>
                <input
                  type="number"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400">Data Allowance (GB, empty for unlimited)</label>
                <input
                  type="number"
                  value={dataAllowanceGb}
                  onChange={(e) => setDataAllowanceGb(e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400">Download Speed (Mbps)</label>
                <input
                  type="number"
                  value={advertisedDownload}
                  onChange={(e) => setAdvertisedDownload(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400">Overage Rate (per GB above cap)</label>
                <input
                  type="number"
                  value={overageRate}
                  onChange={(e) => setOverageRate(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400">Equipment Rental Fee</label>
                <input
                  type="number"
                  value={equipmentFee}
                  onChange={(e) => setEquipmentFee(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400">Currency Symbol</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingPlan(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Plan Profile</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Interactive Usage Simulation Slider */}
      <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Interactive Demand Simulation</h3>
          </div>
          <span className="text-xs font-mono text-cyan-300 font-bold">
            Simulated Demand: {customUsage} GB / month
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Adjust monthly volume to stress-test candidate plans against heavy household usage or game download surges.
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-500 font-mono">20 GB</span>
          <input
            type="range"
            min="20"
            max="600"
            step="10"
            value={customUsage}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCustomUsage(val);
              onRecalculate(val);
            }}
            className="flex-1 accent-cyan-500 cursor-pointer"
          />
          <span className="text-xs text-slate-500 font-mono">600 GB</span>
        </div>
      </div>

      {/* Candidate Plan Comparison Engine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Comparative Plan Intelligence</h3>
            <p className="text-xs text-slate-400">
              Evaluated against simulated demand of {customUsage} GB/month with transparent overage penalty modeling.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {analysis?.comparisons.map((plan, idx) => {
            const isOptimal = plan.suitability_rating === 'Optimal';
            const isRisky = plan.suitability_rating === 'Risky';
            const isUnsuitable = plan.suitability_rating === 'Unsuitable';

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isOptimal
                    ? 'bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border-emerald-500/50 shadow-emerald-950/30 shadow-lg'
                    : isRisky
                    ? 'bg-gradient-to-b from-amber-950/20 to-slate-900/90 border-amber-500/40 shadow-lg'
                    : isUnsuitable
                    ? 'bg-gradient-to-b from-rose-950/20 to-slate-900/90 border-rose-500/30 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                      {plan.provider}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isOptimal
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : isRisky
                          ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                          : isUnsuitable
                          ? 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                          : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40'
                      }`}
                    >
                      {plan.suitability_rating}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">{plan.plan_name}</h4>

                  {/* Financials Breakdown */}
                  <div className="mt-4 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Monthly Cost:</span>
                      <span className="font-bold text-white font-mono">
                        ₹ {plan.total_monthly_cost.toFixed(2)}
                      </span>
                    </div>
                    {plan.estimated_overage_cost > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Overage Penalty:</span>
                        <span className="font-mono">+₹ {plan.estimated_overage_cost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-400">Net Annual Savings:</span>
                      <span
                        className={`font-bold font-mono ${
                          plan.net_annual_savings > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {plan.net_annual_savings > 0
                          ? `+₹ ${plan.net_annual_savings.toFixed(2)}/yr`
                          : `₹ ${plan.net_annual_savings.toFixed(2)}/yr`}
                      </span>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {plan.risk_factors.length > 0 && (
                    <div className="mt-3.5 space-y-1.5">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Identified Considerations:
                      </p>
                      <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                        {plan.risk_factors.map((rf, rIdx) => (
                          <li key={rIdx}>{rf}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Assumptions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <p>• {plan.assumptions[0]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uncertainty & Methodology Transparency Callout */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-3">
        <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">Financial Modeling Transparency Notice</p>
          <p className="leading-relaxed">{analysis?.uncertainty_explanation}</p>
          <p className="text-[11px] text-slate-500">
            OrbitLink does not receive affiliate compensation from ISPs and does not fabricate hypothetical market tiers.
          </p>
        </div>
      </div>
    </div>
  );
}
