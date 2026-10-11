from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.schemas.measurement import MeasurementCreate, MeasurementRead
from app.monitoring.agent import collect_live_measurement
from app.services.measurement_service import record_measurement

router = APIRouter(prefix="/tests", tags=["Network Tests"])


@router.post(
    "/run",
    response_model=MeasurementRead,
    status_code=status.HTTP_201_CREATED,
    summary="Execute an active, controlled network performance test",
)
def run_controlled_test(
    db: Session = Depends(get_db),
) -> MeasurementRead:
    """
    Executes an opt-in controlled network test:
    Measures download throughput (Mbps), roundtrip latency (ms), and captures device counters.
    """
    try:
        live_data = collect_live_measurement(include_speed_test=True)
        measurement_in = MeasurementCreate(**live_data)
        saved = record_measurement(db, measurement_in)
        return saved
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network test execution failed: {str(exc)}",
        )
