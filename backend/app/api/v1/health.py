from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.database.session import check_db_connection
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    db_ok, db_engine, db_msg = check_db_connection()
    status_str = "healthy" if db_ok else "degraded"

    return HealthResponse(
        status=status_str,
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database_status="connected" if db_ok else f"error: {db_msg}",
        database_engine=db_engine,
        timestamp=datetime.now(timezone.utc),
    )
