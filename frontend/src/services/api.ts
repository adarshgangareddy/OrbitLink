import type {
  HealthStatus,
  NetworkMeasurement,
  MeasurementHistoryResponse,
  NetworkSession,
  SessionListResponse,
  CollectorStatus,
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

