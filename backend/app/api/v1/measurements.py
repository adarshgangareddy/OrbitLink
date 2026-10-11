from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementRead,
    MeasurementHistoryResponse,
)
from app.monitoring.agent import collect_live_measurement
from app.services.measurement_service import (
    record_measurement,
    get_latest_measurement,
    get_measurement_history,
)

router = APIRouter(prefix="/measurements", tags=["Measurements"])


@router.post(
    "/collect",
    response_model=MeasurementRead,
    status_code=status.HTTP_201_CREATED,
    summary="Collect and persist a real live device network measurement",
)
def collect_and_store_measurement(
    db: Session = Depends(get_db),
) -> MeasurementRead:
    """
    Triggers local device network probe, extracts real interface byte counters and ping/HTTP latency,
    and commits the record to the database.
    """
    try:
        live_data = collect_live_measurement()
        measurement_in = MeasurementCreate(**live_data)
        saved = record_measurement(db, measurement_in)
        return saved
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect network measurement: {str(exc)}",
        )


@router.post(
    "/ingest",
    response_model=MeasurementRead,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a measurement payload directly",
)
def ingest_measurement(
    payload: MeasurementCreate,
    db: Session = Depends(get_db),
) -> MeasurementRead:
    """
    Ingests an externally measured or agent-collected network record.
    """
    return record_measurement(db, payload)


@router.get(
    "/latest",
    response_model=Optional[MeasurementRead],
    summary="Get the most recent measurement",
)
def read_latest_measurement(
    device_id: Optional[str] = Query(None, description="Optional device filter"),
    db: Session = Depends(get_db),
) -> Optional[MeasurementRead]:
    record = get_latest_measurement(db, device_id=device_id)
    return record


@router.get(
    "/history",
    response_model=MeasurementHistoryResponse,
    summary="Get paginated measurement history",
)
def read_measurement_history(
    device_id: Optional[str] = Query(None, description="Optional device filter"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> MeasurementHistoryResponse:
    total_count, records = get_measurement_history(
        db,
        device_id=device_id,
        limit=limit,
        offset=offset,
    )
    return MeasurementHistoryResponse(
        total_count=total_count,
        limit=limit,
        offset=offset,
        measurements=records,
    )
