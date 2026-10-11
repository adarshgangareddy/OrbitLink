from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class NetworkMeasurement(Base):
    __tablename__ = "network_measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    interface_name: Mapped[str] = mapped_column(String(50), index=True, nullable=False)

    # Cumulative counters
    bytes_sent: Mapped[int] = mapped_column(BigInteger, nullable=False)
    bytes_recv: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Incremental deltas since previous reading
    bytes_sent_delta: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    bytes_recv_delta: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # Probe metrics
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    packet_loss_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Controlled throughput tests (if performed)
    download_speed_mbps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    upload_speed_mbps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Wi-Fi details (when available and permitted)
    wifi_ssid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    wifi_signal_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Provenance and status metadata
    measurement_method: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="connected", nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
