import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
import psutil
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.measurement import NetworkMeasurement
from app.models.session import NetworkSession
from app.schemas.session import SessionRead
from app.monitoring.counters import bytes_to_human, find_primary_interface, get_device_id
from app.core.logging import logger


def enrich_session_read(session: NetworkSession) -> SessionRead:
    """Enriches database NetworkSession with computed duration and human-readable bytes."""
    now_utc = datetime.now(timezone.utc)
    if session.end_time:
        duration = max(0.0, (session.end_time - session.start_time).total_seconds())
    elif session.start_time:
        # If naive, make timezone-aware
        st = session.start_time if session.start_time.tzinfo else session.start_time.replace(tzinfo=timezone.utc)
        duration = max(0.0, (now_utc - st).total_seconds())
    else:
        duration = 0.0

    read_obj = SessionRead.model_validate(session)
    read_obj.duration_seconds = round(duration, 1)
    read_obj.total_bytes_sent_human = bytes_to_human(session.total_bytes_sent)
    read_obj.total_bytes_recv_human = bytes_to_human(session.total_bytes_recv)
    read_obj.total_bytes_combined_human = bytes_to_human(session.total_bytes_sent + session.total_bytes_recv)
    return read_obj


def start_session(
    db: Session,
    device_id: Optional[str] = None,
    interface_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> SessionRead:
    """
    Initiates a new network tracking session.
    Automatically closes any existing active session for this device to prevent session overlap.
    """
    dev_id = device_id or get_device_id()
    iface = interface_name or find_primary_interface() or "unknown"

    # Auto-close prior active sessions for this device
    active_stmt = select(NetworkSession).where(
        NetworkSession.device_id == dev_id,
        NetworkSession.is_active == True,
    )
    prior_actives = db.execute(active_stmt).scalars().all()
    now_utc = datetime.now(timezone.utc)
    for prior in prior_actives:
        prior.is_active = False
        prior.end_time = now_utc
        prior.status = "closed_auto"
        logger.info(f"Auto-closed prior active session {prior.session_id} for device {dev_id}")

    # Read current baseline counters from interface
    start_sent = 0
    start_recv = 0
    if iface != "unknown":
        counters = psutil.net_io_counters(pernic=True).get(iface)
        if counters:
            start_sent = counters.bytes_sent
            start_recv = counters.bytes_recv

    timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
    session_uid = f"sess_{timestamp_str}_{uuid.uuid4().hex[:6]}"

    session_obj = NetworkSession(
        session_id=session_uid,
        device_id=dev_id,
        interface_name=iface,
        start_time=now_utc,
        is_active=True,
        start_bytes_sent=start_sent,
        start_bytes_recv=start_recv,
        total_bytes_sent=0,
        total_bytes_recv=0,
        sample_count=0,
        status="active",
        notes=notes,
    )

    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    logger.info(f"Started new network session {session_uid} on {iface} for device {dev_id}")
    return enrich_session_read(session_obj)


def get_active_session(
    db: Session,
    device_id: Optional[str] = None,
) -> Optional[NetworkSession]:
    """Retrieves the currently active network session for a device."""
    dev_id = device_id or get_device_id()
    stmt = (
        select(NetworkSession)
        .where(
            NetworkSession.device_id == dev_id,
            NetworkSession.is_active == True,
        )
        .order_by(desc(NetworkSession.id))
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def update_active_session_with_measurement(
    db: Session,
    measurement: NetworkMeasurement,
    session: Optional[NetworkSession] = None,
) -> Optional[NetworkSession]:
    """
    Updates the active session with incoming measurement metrics:
    - Increments sample count
    - Aggregates byte deltas
    - Recomputes running average and peak/min latency
    - Updates Wi-Fi information
    """
    target_session = session or get_active_session(db, measurement.device_id)
    if not target_session:
        return None

    # Link measurement to this session
    measurement.session_id = target_session.session_id

    # Update bytes transferred in session
    if measurement.bytes_sent >= target_session.start_bytes_sent:
        target_session.total_bytes_sent = measurement.bytes_sent - target_session.start_bytes_sent
    else:
        # Rollover or reboot: accumulate delta
        target_session.total_bytes_sent += (measurement.bytes_sent_delta or 0)

    if measurement.bytes_recv >= target_session.start_bytes_recv:
        target_session.total_bytes_recv = measurement.bytes_recv - target_session.start_bytes_recv
    else:
        target_session.total_bytes_recv += (measurement.bytes_recv_delta or 0)

    # Increment sample count
    target_session.sample_count += 1

    # Update latency metrics
    if measurement.latency_ms is not None:
        if target_session.min_latency_ms is None or measurement.latency_ms < target_session.min_latency_ms:
            target_session.min_latency_ms = measurement.latency_ms

        if target_session.peak_latency_ms is None or measurement.latency_ms > target_session.peak_latency_ms:
            target_session.peak_latency_ms = measurement.latency_ms

        if target_session.avg_latency_ms is None:
            target_session.avg_latency_ms = round(measurement.latency_ms, 2)
        else:
            n = target_session.sample_count
            prev_avg = target_session.avg_latency_ms
            new_avg = ((prev_avg * (n - 1)) + measurement.latency_ms) / n
            target_session.avg_latency_ms = round(new_avg, 2)

    # Update packet loss
    if measurement.packet_loss_pct is not None:
        target_session.packet_loss_pct = round(measurement.packet_loss_pct, 2)

    # Update download speed if test was conducted
    if measurement.download_speed_mbps is not None:
        if target_session.avg_download_speed_mbps is None:
            target_session.avg_download_speed_mbps = measurement.download_speed_mbps
        else:
            target_session.avg_download_speed_mbps = round(
                (target_session.avg_download_speed_mbps + measurement.download_speed_mbps) / 2.0,
                2,
            )

    # Update Wi-Fi SSID
    if measurement.wifi_ssid:
        target_session.wifi_ssid = measurement.wifi_ssid

    db.add(target_session)
    db.commit()
    db.refresh(target_session)
    return target_session


def stop_session(
    db: Session,
    session_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> Optional[SessionRead]:
    """
    Terminates the specified or active session and marks it completed.
    """
    if session_id:
        stmt = select(NetworkSession).where(NetworkSession.session_id == session_id)
        session = db.execute(stmt).scalars().first()
    else:
        session = get_active_session(db)

    if not session:
        return None

    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    session.status = "completed"
    if notes:
        session.notes = (f"{session.notes} | {notes}") if session.notes else notes

    db.commit()
    db.refresh(session)

    logger.info(f"Terminated network session {session.session_id} (total duration: {session.end_time - session.start_time})")
    return enrich_session_read(session)


def get_session_by_id(
    db: Session,
    session_id: str,
) -> Optional[SessionRead]:
    """Retrieves a single session by its unique session_id."""
    stmt = select(NetworkSession).where(NetworkSession.session_id == session_id)
    session = db.execute(stmt).scalars().first()
    if not session:
        return None
    return enrich_session_read(session)


def list_sessions(
    db: Session,
    device_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[int, Optional[SessionRead], List[SessionRead]]:
    """Returns total count, active session (if any), and paginated historical sessions."""
    dev_id = device_id or get_device_id()

    # Active session check
    active_obj = get_active_session(db, dev_id)
    active_read = enrich_session_read(active_obj) if active_obj else None

    # Count all sessions
    count_stmt = select(func.count(NetworkSession.id)).where(NetworkSession.device_id == dev_id)
    total_count = db.execute(count_stmt).scalar() or 0

    # Retrieve paginated sessions
    stmt = (
        select(NetworkSession)
        .where(NetworkSession.device_id == dev_id)
        .order_by(desc(NetworkSession.id))
        .offset(offset)
        .limit(limit)
    )
    records = db.execute(stmt).scalars().all()
    enriched_list = [enrich_session_read(s) for s in records]

    return total_count, active_read, enriched_list
