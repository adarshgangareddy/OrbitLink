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
