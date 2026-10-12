from datetime import datetime
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


class NetworkSession(Base):
    __tablename__ = "network_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    device_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    interface_name: Mapped[str] = mapped_column(String(50), index=True, nullable=False)

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    # Initial interface byte baseline when session started
    start_bytes_sent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    start_bytes_recv: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Cumulative bytes transferred during this active session
    total_bytes_sent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_bytes_recv: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Latency aggregates over the session
    avg_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peak_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    packet_loss_pct: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)

    # Throughput and connection details
    avg_download_speed_mbps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wifi_ssid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
