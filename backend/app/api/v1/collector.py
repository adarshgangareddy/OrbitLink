from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.monitoring.collector import collector_daemon
from app.schemas.collector import CollectorConfigRequest, CollectorStatus

router = APIRouter(prefix="/collector", tags=["Collector Daemon"])


@router.get(
    "/status",
    response_model=CollectorStatus,
    summary="Get background collector daemon operational status",
)
def get_collector_status() -> CollectorStatus:
    """Returns whether the daemon is actively running, its polling interval, run count, and last run time."""
    return CollectorStatus(**collector_daemon.get_status())


@router.post(
    "/start",
    response_model=CollectorStatus,
    summary="Start background collector daemon",
)
def start_collector(config: CollectorConfigRequest = None) -> CollectorStatus:
    """Starts the background network measurement collector daemon with optional interval config."""
    interval = config.interval_seconds if config else None
    collector_daemon.start(interval_seconds=interval)
    if config and config.include_speed_test is not None:
        collector_daemon.include_speed_test = config.include_speed_test
    return CollectorStatus(**collector_daemon.get_status())


@router.post(
    "/stop",
    response_model=CollectorStatus,
    summary="Stop background collector daemon",
)
def stop_collector() -> CollectorStatus:
    """Stops the background network measurement collector daemon."""
    collector_daemon.stop()
    return CollectorStatus(**collector_daemon.get_status())


@router.post(
    "/config",
    response_model=CollectorStatus,
    summary="Configure background collector polling interval or speed tests",
)
def configure_collector(config: CollectorConfigRequest) -> CollectorStatus:
    """Updates the polling interval (in seconds) or toggles periodic speed tests."""
    if config.interval_seconds is not None:
        try:
            collector_daemon.set_interval(config.interval_seconds)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )

    if config.include_speed_test is not None:
        collector_daemon.include_speed_test = config.include_speed_test

    return CollectorStatus(**collector_daemon.get_status())


@router.post(
    "/collect-now",
    response_model=CollectorStatus,
    summary="Trigger an immediate background collection sample",
)
def collect_now(db: Session = Depends(get_db)) -> CollectorStatus:
    """Manually triggers an immediate sample without waiting for the timer interval."""
    collector_daemon.run_single_collection(db=db)
    return CollectorStatus(**collector_daemon.get_status())

