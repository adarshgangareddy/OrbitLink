from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class SessionStartRequest(BaseModel):
    device_id: Optional[str] = None
    interface_name: Optional[str] = None
    notes: Optional[str] = None


class SessionStopRequest(BaseModel):
    session_id: Optional[str] = None
    notes: Optional[str] = None


class SessionRead(BaseModel):
    id: int
    session_id: str
    device_id: str
    interface_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    start_bytes_sent: int
    start_bytes_recv: int
    total_bytes_sent: int
    total_bytes_recv: int
    sample_count: int
    avg_latency_ms: Optional[float] = None
    min_latency_ms: Optional[float] = None
    peak_latency_ms: Optional[float] = None
    packet_loss_pct: Optional[float] = None
    avg_download_speed_mbps: Optional[float] = None
    wifi_ssid: Optional[str] = None
    status: str
    notes: Optional[str] = None

    # Computed fields for presentation
    duration_seconds: float = 0.0
    total_bytes_sent_human: Optional[str] = None
    total_bytes_recv_human: Optional[str] = None
    total_bytes_combined_human: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SessionListResponse(BaseModel):
    total_count: int
    active_session: Optional[SessionRead] = None
    sessions: List[SessionRead]
