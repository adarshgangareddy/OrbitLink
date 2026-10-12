import type {
  HealthStatus,
  NetworkMeasurement,
  MeasurementHistoryResponse,
  NetworkSession,
  SessionListResponse,
  CollectorStatus,
  PlanConfig,
  CostOptimizationAnalysis,
  QualityDiagnosisItem,
  DiagnosticVerificationResponse,
  BandwidthScheduleRecommendation,
  EnvironmentalImpactReport,
  AssistantQueryResponse,
  MLForecastResponse,
} from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<HealthStatus> {
  const resp = await fetch(`${API_BASE}/health`);
  if (!resp.ok) {
    throw new Error(`Health check returned status ${resp.status}`);
  }
  return resp.json();
}

export async function fetchLatestMeasurement(): Promise<NetworkMeasurement | null> {
  const resp = await fetch(`${API_BASE}/measurements/latest`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch latest measurement: ${resp.status}`);
  }
  return resp.json();
}

export async function triggerLiveMeasurement(includeSpeedTest: boolean = false): Promise<NetworkMeasurement> {
  const resp = await fetch(`${API_BASE}/measurements/collect?include_speed_test=${includeSpeedTest}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || `Measurement failed with status ${resp.status}`);
  }
  return resp.json();
}

export async function runSpeedTest(): Promise<NetworkMeasurement> {
  const resp = await fetch(`${API_BASE}/tests/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || `Speed test failed with status ${resp.status}`);
  }
  return resp.json();
}

export async function fetchMeasurementHistory(limit: number = 20): Promise<MeasurementHistoryResponse> {
  const resp = await fetch(`${API_BASE}/measurements/history?limit=${limit}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch measurement history: ${resp.status}`);
  }
  return resp.json();
}

// Background Collector API
export async function fetchCollectorStatus(): Promise<CollectorStatus> {
  const resp = await fetch(`${API_BASE}/collector/status`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch collector status: ${resp.status}`);
  }
  return resp.json();
}

export async function startCollector(intervalSeconds?: number): Promise<CollectorStatus> {
  const resp = await fetch(`${API_BASE}/collector/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intervalSeconds ? { interval_seconds: intervalSeconds } : {}),
  });
  if (!resp.ok) {
    throw new Error(`Failed to start collector: ${resp.status}`);
  }
  return resp.json();
}

export async function stopCollector(): Promise<CollectorStatus> {
  const resp = await fetch(`${API_BASE}/collector/stop`, {
    method: 'POST',
  });
  if (!resp.ok) {
    throw new Error(`Failed to stop collector: ${resp.status}`);
  }
  return resp.json();
}

export async function configureCollector(intervalSeconds?: number, includeSpeedTest?: boolean): Promise<CollectorStatus> {
  const resp = await fetch(`${API_BASE}/collector/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval_seconds: intervalSeconds, include_speed_test: includeSpeedTest }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to configure collector: ${resp.status}`);
  }
  return resp.json();
}

// Session Tracking API
export async function fetchActiveSession(): Promise<NetworkSession | null> {
  const resp = await fetch(`${API_BASE}/sessions/active`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch active session: ${resp.status}`);
  }
  return resp.json();
}

export async function startSession(notes?: string): Promise<NetworkSession> {
  const resp = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notes ? { notes } : {}),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to start session: ${resp.status}`);
  }
  return resp.json();
}

export async function stopSession(sessionId?: string, notes?: string): Promise<NetworkSession> {
  const resp = await fetch(`${API_BASE}/sessions/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, notes }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to stop session: ${resp.status}`);
  }
  return resp.json();
}

export async function fetchSessions(limit: number = 20): Promise<SessionListResponse> {
  const resp = await fetch(`${API_BASE}/sessions?limit=${limit}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch sessions: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature A: Internet Cost Optimizer API
// ==========================================

export async function fetchCurrentPlan(): Promise<PlanConfig> {
  const resp = await fetch(`${API_BASE}/plans/current`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch current plan: ${resp.status}`);
  }
  return resp.json();
}

export async function saveCurrentPlan(plan: PlanConfig): Promise<PlanConfig> {
  const resp = await fetch(`${API_BASE}/plans/current`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!resp.ok) {
    throw new Error(`Failed to save plan: ${resp.status}`);
  }
  return resp.json();
}

export async function fetchCostAnalysis(customMonthlyGb?: number): Promise<CostOptimizationAnalysis> {
  const query = customMonthlyGb ? `?custom_monthly_gb=${customMonthlyGb}` : '';
  const resp = await fetch(`${API_BASE}/plans/analysis${query}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch cost analysis: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature B: Network Quality Intelligence API
// ==========================================

export async function fetchQualityDiagnoses(limit: number = 25): Promise<QualityDiagnosisItem[]> {
  const resp = await fetch(`${API_BASE}/diagnostics/quality?limit=${limit}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch quality diagnoses: ${resp.status}`);
  }
  return resp.json();
}

export async function verifyRemediationAction(actionTaken: string, baselineId?: number): Promise<DiagnosticVerificationResponse> {
  const resp = await fetch(`${API_BASE}/diagnostics/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_taken: actionTaken, baseline_measurement_id: baselineId }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to verify remediation action: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature C: Smart Bandwidth Efficiency API
// ==========================================

export async function fetchBandwidthSchedule(fileSizeGb: number = 15.0, safeSpeedMbps: number = 50.0): Promise<BandwidthScheduleRecommendation> {
  const resp = await fetch(`${API_BASE}/bandwidth/schedule?file_size_gb=${fileSizeGb}&safe_speed_mbps=${safeSpeedMbps}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch bandwidth schedule: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature D: Environmental & Resource Efficiency API
// ==========================================

export async function fetchEnvironmentalImpact(): Promise<EnvironmentalImpactReport> {
  const resp = await fetch(`${API_BASE}/environmental/impact`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch environmental impact: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature E: Grounded AI Assistant API
// ==========================================

export async function queryAssistant(question: string): Promise<AssistantQueryResponse> {
  const resp = await fetch(`${API_BASE}/assistant/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to query assistant: ${resp.status}`);
  }
  return resp.json();
}

// ==========================================
// Feature F: Machine Learning Forecasting API
// ==========================================

export async function fetchMLForecast(horizonDays: number = 7): Promise<MLForecastResponse> {
  const resp = await fetch(`${API_BASE}/ml/forecast?horizon_days=${horizonDays}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ML forecast: ${resp.status}`);
  }
  return resp.json();
}
