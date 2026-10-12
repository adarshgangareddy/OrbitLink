from datetime import datetime
from typing import Optional
from sqlalchemy import (
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


class UserPlan(Base):
    __tablename__ = "user_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(100), index=True, default="default")
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    monthly_cost: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    billing_cycle_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Allowances and speed limits
    data_allowance_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # None = Unlimited
    fair_use_limit_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    throttled_speed_mbps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    advertised_download_mbps: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    advertised_upload_mbps: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)

    # Extra fees
    equipment_rental_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overage_rate_per_gb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AlternativePlan(Base):
    __tablename__ = "alternative_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    monthly_cost: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    data_allowance_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    advertised_download_mbps: Mapped[float] = mapped_column(Float, nullable=False)
    advertised_upload_mbps: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    equipment_rental_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overage_rate_per_gb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    source_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    retrieval_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
