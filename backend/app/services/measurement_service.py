from typing import List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session
from app.models.measurement import NetworkMeasurement
from app.schemas.measurement import MeasurementCreate, MeasurementRead
from app.monitoring.counters import bytes_to_human
from app.core.logging import logger


def enrich_measurement_read(measurement: NetworkMeasurement) -> MeasurementRead:
    read_obj = MeasurementRead.model_validate(measurement)
    read_obj.bytes_sent_human = bytes_to_human(measurement.bytes_sent)
    read_obj.bytes_recv_human = bytes_to_human(measurement.bytes_recv)
    return read_obj


def record_measurement(db: Session, measurement_in: MeasurementCreate) -> MeasurementRead:
    """
    Persists a network measurement into the database.
    """
    # If delta is not provided, attempt to compute it against the most recent DB record
    bytes_sent_delta = measurement_in.bytes_sent_delta
    bytes_recv_delta = measurement_in.bytes_recv_delta

    if bytes_sent_delta is None or bytes_recv_delta is None:
        stmt = (
            select(NetworkMeasurement)
            .where(
                NetworkMeasurement.device_id == measurement_in.device_id,
                NetworkMeasurement.interface_name == measurement_in.interface_name,
            )
            .order_by(desc(NetworkMeasurement.id))
            .limit(1)
        )
        prev = db.execute(stmt).scalars().first()
        if prev:
            if measurement_in.bytes_sent >= prev.bytes_sent:
                bytes_sent_delta = measurement_in.bytes_sent - prev.bytes_sent
            else:
                bytes_sent_delta = measurement_in.bytes_sent

            if measurement_in.bytes_recv >= prev.bytes_recv:
                bytes_recv_delta = measurement_in.bytes_recv - prev.bytes_recv
            else:
                bytes_recv_delta = measurement_in.bytes_recv

    db_obj = NetworkMeasurement(
        device_id=measurement_in.device_id,
        interface_name=measurement_in.interface_name,
        bytes_sent=measurement_in.bytes_sent,
        bytes_recv=measurement_in.bytes_recv,
        bytes_sent_delta=bytes_sent_delta,
        bytes_recv_delta=bytes_recv_delta,
        latency_ms=measurement_in.latency_ms,
        packet_loss_pct=measurement_in.packet_loss_pct,
        download_speed_mbps=measurement_in.download_speed_mbps,
        upload_speed_mbps=measurement_in.upload_speed_mbps,
        wifi_ssid=measurement_in.wifi_ssid,
        wifi_signal_pct=measurement_in.wifi_signal_pct,
        measurement_method=measurement_in.measurement_method,
        status=measurement_in.status,
        is_simulated=measurement_in.is_simulated,
        notes=measurement_in.notes,
    )

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    logger.info(
        f"Persisted measurement id={db_obj.id} for device={db_obj.device_id} on {db_obj.interface_name}"
    )
    return enrich_measurement_read(db_obj)


def get_latest_measurement(
    db: Session,
    device_id: Optional[str] = None,
) -> Optional[MeasurementRead]:
    """
    Returns the most recent measurement, optionally filtered by device.
    """
    stmt = select(NetworkMeasurement)
    if device_id:
        stmt = stmt.where(NetworkMeasurement.device_id == device_id)
    stmt = stmt.order_by(desc(NetworkMeasurement.id)).limit(1)

    result = db.execute(stmt).scalars().first()
    if not result:
        return None
    return enrich_measurement_read(result)


def get_measurement_history(
    db: Session,
    device_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[int, List[MeasurementRead]]:
    """
    Returns paginated measurement history and total count.
    """
    count_stmt = select(func.count(NetworkMeasurement.id))
    if device_id:
        count_stmt = count_stmt.where(NetworkMeasurement.device_id == device_id)
    total_count = db.execute(count_stmt).scalar() or 0

    stmt = select(NetworkMeasurement)
    if device_id:
        stmt = stmt.where(NetworkMeasurement.device_id == device_id)
    stmt = stmt.order_by(desc(NetworkMeasurement.id)).offset(offset).limit(limit)

    records = db.execute(stmt).scalars().all()
    enriched = [enrich_measurement_read(r) for r in records]
    return total_count, enriched
