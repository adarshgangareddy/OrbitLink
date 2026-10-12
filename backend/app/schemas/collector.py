from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CollectorStatus(BaseModel):
    is_running: bool
    interval_seconds: int = Field(ge=1, le=3600)
    last_run: Optional[datetime] = None
    run_count: int = 0
    last_error: Optional[str] = None
    last_measurement_id: Optional[int] = None
    include_speed_test: bool = False


class CollectorConfigRequest(BaseModel):
    interval_seconds: Optional[int] = Field(default=None, ge=1, le=3600)
    include_speed_test: Optional[bool] = None
