import type { HealthStatus, NetworkMeasurement, MeasurementHistoryResponse } from '../types';

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
