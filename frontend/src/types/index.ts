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

