from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class MeasurementBase(BaseModel):
    session_id: Optional[str] = None
    device_id: str
    interface_name: str
    bytes_sent: int = Field(ge=0)
    bytes_recv: int = Field(ge=0)
    bytes_sent_delta: Optional[int] = Field(default=None, ge=0)
    bytes_recv_delta: Optional[int] = Field(default=None, ge=0)
    latency_ms: Optional[float] = Field(default=None, ge=0)
    packet_loss_pct: Optional[float] = Field(default=None, ge=0, le=100)
    download_speed_mbps: Optional[float] = Field(default=None, ge=0)
    upload_speed_mbps: Optional[float] = Field(default=None, ge=0)
    wifi_ssid: Optional[str] = None
    wifi_signal_pct: Optional[float] = Field(default=None, ge=0, le=100)
    measurement_method: str
    status: str = "connected"
    is_simulated: bool = False
    notes: Optional[str] = None


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementRead(MeasurementBase):
    id: int
    created_at: datetime

    # Computed fields for human-friendly units
    bytes_sent_human: Optional[str] = None
    bytes_recv_human: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MeasurementHistoryResponse(BaseModel):
    total_count: int
    limit: int
    offset: int
    measurements: List[MeasurementRead]
