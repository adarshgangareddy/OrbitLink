from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.session import (
    SessionListResponse,
    SessionRead,
    SessionStartRequest,
    SessionStopRequest,
)
from app.services.session_service import (
    get_active_session,
    get_session_by_id,
    list_sessions,
    start_session,
    stop_session,
    enrich_session_read,
)

router = APIRouter(prefix="/sessions", tags=["Network Sessions"])


@router.post(
    "/start",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new network tracking session",
)
def create_session(
    payload: Optional[SessionStartRequest] = None,
    db: Session = Depends(get_db),
) -> SessionRead:
    """
    Starts an isolated network monitoring session for tracking bandwidth consumption and latency.
    Auto-closes any previous open session for the device.
    """
    dev_id = payload.device_id if payload else None
    iface = payload.interface_name if payload else None
    notes = payload.notes if payload else None

    return start_session(db, device_id=dev_id, interface_name=iface, notes=notes)


@router.post(
    "/stop",
    response_model=SessionRead,
    summary="Stop the active network session",
)
def end_session(
    payload: Optional[SessionStopRequest] = None,
    db: Session = Depends(get_db),
) -> SessionRead:
    """
    Finalizes the active or specified session, locking total consumption and duration statistics.
    """
    sess_id = payload.session_id if payload else None
    notes = payload.notes if payload else None

    stopped = stop_session(db, session_id=sess_id, notes=notes)
    if not stopped:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active network session found to terminate.",
        )
    return stopped


@router.get(
    "/active",
    response_model=Optional[SessionRead],
    summary="Retrieve the current active session (if any)",
)
def get_current_active_session(
    device_id: Optional[str] = Query(default=None, description="Optional device filter"),
    db: Session = Depends(get_db),
) -> Optional[SessionRead]:
    """Returns the currently active session details and accumulated usage."""
    active_obj = get_active_session(db, device_id=device_id)
    if not active_obj:
        return None
    return enrich_session_read(active_obj)


@router.get(
    "",
    response_model=SessionListResponse,
    summary="List past and current network sessions",
)
def get_all_sessions(
    device_id: Optional[str] = Query(default=None, description="Filter by device ID"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> SessionListResponse:
    """Returns paginated historical sessions alongside the current active session."""
    total, active, items = list_sessions(db, device_id=device_id, limit=limit, offset=offset)
    return SessionListResponse(
        total_count=total,
        active_session=active,
        sessions=items,
    )


@router.get(
    "/{session_id}",
    response_model=SessionRead,
    summary="Get detailed metrics for a specific session",
)
def get_session_details(
    session_id: str,
    db: Session = Depends(get_db),
) -> SessionRead:
    """Retrieves full metrics and lifecycle timestamps for a specified session ID."""
    session = get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id '{session_id}' not found.",
        )
    return session
