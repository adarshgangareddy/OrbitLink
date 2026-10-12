export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'offline';
  app_name: string;
  version: string;
  environment: string;
  database_status: string;
  database_engine: string;
  timestamp: string;
}

export interface NetworkMeasurement {
  id: number;
  device_id: string;
  interface_name: string;
  bytes_sent: number;
  bytes_recv: number;
  bytes_sent_delta: number | null;
  bytes_recv_delta: number | null;
  latency_ms: number | null;
  packet_loss_pct: number | null;
  download_speed_mbps: number | null;
  upload_speed_mbps: number | null;
  wifi_ssid: string | null;
  wifi_signal_pct: number | null;
  measurement_method: string;
  status: 'connected' | 'degraded' | 'disconnected' | string;
  is_simulated: boolean;
  notes: string | null;
  created_at: string;
  bytes_sent_human?: string;
  bytes_recv_human?: string;
}

export interface MeasurementHistoryResponse {
  total_count: number;
  limit: number;
  offset: number;
  measurements: NetworkMeasurement[];
}

export interface NetworkSession {
  id: number;
  session_id: string;
  device_id: string;
  interface_name: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  start_bytes_sent: number;
  start_bytes_recv: number;
  total_bytes_sent: number;
  total_bytes_recv: number;
  sample_count: number;
  avg_latency_ms: number | null;
  min_latency_ms: number | null;
  peak_latency_ms: number | null;
  packet_loss_pct: number | null;
  avg_download_speed_mbps: number | null;
  wifi_ssid: string | null;
  status: string;
  notes: string | null;
  duration_seconds: number;
  total_bytes_sent_human?: string;
  total_bytes_recv_human?: string;
  total_bytes_combined_human?: string;
}

export interface SessionListResponse {
  total_count: number;
  active_session: NetworkSession | null;
  sessions: NetworkSession[];
}

export interface CollectorStatus {
  is_running: boolean;
  interval_seconds: number;
  last_run: string | null;
  run_count: number;
  last_error: string | null;
  last_measurement_id: number | null;
  include_speed_test: boolean;
}

// ==========================================
// Optimization & Intelligence Types
// ==========================================

export interface PlanConfig {
  plan_name: string;
  provider: string;
  monthly_cost: number;
  currency: string;
  billing_cycle_day: number;
  data_allowance_gb: number | null;
  fair_use_limit_gb?: number | null;
  throttled_speed_mbps?: number | null;
  advertised_download_mbps: number;
  advertised_upload_mbps: number;
  equipment_rental_fee: number;
  overage_rate_per_gb: number;
  notes?: string | null;
}

export interface PlanComparisonItem {
  plan_name: string;
  provider: string;
  base_monthly_cost: number;
  estimated_overage_cost: number;
  equipment_fee: number;
  total_monthly_cost: number;
  total_annual_cost: number;
  net_monthly_savings: number;
  net_annual_savings: number;
  suitability_rating: 'Optimal' | 'Viable' | 'Risky' | 'Unsuitable' | string;
  risk_factors: string[];
  confidence_level: 'High' | 'Moderate' | 'Low' | string;
  assumptions: string[];
}

export interface CostOptimizationAnalysis {
  device_id: string;
  days_analyzed: number;
  observed_total_gb: number;
  daily_avg_gb: number;
  projected_monthly_gb: number;
  peak_hour_avg_gb: number;
  current_plan: PlanConfig;
  comparisons: PlanComparisonItem[];
  top_recommendation: string | null;
  uncertainty_explanation: string;
}

export interface QualityDiagnosisItem {
  diagnosis_id: string;
  category: 'latency' | 'bufferbloat' | 'wifi_rf' | 'packet_loss' | 'congestion' | string;
  severity: 'normal' | 'advisory' | 'warning' | 'critical' | string;
  headline: string;
  observed_evidence: string;
  likely_explanation: string;
  competing_explanations: string[];
  uncertainty: string;
  safe_next_action: string;
  verification_method: string;
  metrics_snapshot: Record<string, any>;
}

export interface DiagnosticVerificationResponse {
  action_taken: string;
  before_latency_ms: number | null;
  after_latency_ms: number | null;
  before_signal_pct: number | null;
  after_signal_pct: number | null;
  delta_latency_ms: number | null;
  outcome: 'improved' | 'unchanged' | 'degraded' | 'inconclusive' | string;
  explanation: string;
}

export interface BandwidthScheduleRecommendation {
  file_size_gb: number;
  recommended_window: string;
  window_start_hour: number;
  window_end_hour: number;
  estimated_duration_minutes: number;
  safe_speed_mbps: number;
  safety_margin_pct: number;
  reasoning: string;
  hourly_demand_profile: Array<{
    hour: number;
    label: string;
    sample_count: number;
    avg_transfer_mb: number;
    avg_latency_ms: number;
    demand_level: 'low' | 'medium' | 'high' | string;
  }>;
  is_automated_execution: boolean;
  disclaimer: string;
}

export interface EnvironmentalImpactReport {
  total_observed_gb: number;
  energy_consumption_kwh: number;
  ghg_emissions_kg_co2e: number;
  avoided_transfers_gb: number;
  potential_energy_saved_kwh: number;
  energy_intensity_factor_kwh_per_gb: number;
  carbon_intensity_factor_g_co2_per_kwh: number;
  methodology_source: string;
  uncertainty_range: string;
  transparency_disclaimer: string;
}

export interface CitationItem {
  source_title: string;
  section: string;
  retrieval_date: string;
  verifiable_text: string;
}

export interface AssistantQueryResponse {
  question: string;
  answer: string;
  grounded_facts: string[];
  citations: CitationItem[];
  tools_executed: string[];
  confidence: string;
  is_evidence_sufficient: boolean;
}

export interface MLForecastResponse {
  target: string;
  horizon_days: number;
  baseline_model: string;
  projected_daily_gb: Array<{
    date: string;
    day_label: string;
    predicted_gb: number;
    confidence_lower_gb: number;
    confidence_upper_gb: number;
  }>;
  historical_mae_gb: number;
  historical_rmse_gb: number;
  confidence_interval_95_pct: {
    lower_offset_gb: number;
    upper_offset_gb: number;
  };
  data_points_analyzed: number;
  disclaimer: string;
}
