from datetime import datetime
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    database_status: str
    database_engine: str
    timestamp: datetime
