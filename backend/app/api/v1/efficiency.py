"""
OrbitLink Smart Bandwidth Efficiency and Environmental Impact API Routes
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.optimization import (
    BandwidthScheduleRecommendation,
    EnvironmentalImpactReport,
)
from app.services.bandwidth_scheduler import get_schedule_recommendation
from app.services.environmental_engine import calculate_environmental_impact

router = APIRouter(tags=["Efficiency & Sustainability"])


@router.get("/bandwidth/schedule", response_model=BandwidthScheduleRecommendation)
def get_bandwidth_download_schedule(
    file_size_gb: float = Query(15.0, ge=0.5, le=500.0, description="Size of file to transfer in GB"),
    safe_speed_mbps: float = Query(50.0, ge=5.0, le=1000.0, description="Nominal plan download speed in Mbps"),
    db: Session = Depends(get_db),
):
    """
    Returns an evidence-based download scheduling recommendation for large,
    non-urgent transfers during lower-demand, off-peak windows.
    """
    return get_schedule_recommendation(
        db, file_size_gb=file_size_gb, user_safe_speed_mbps=safe_speed_mbps
    )


@router.get("/environmental/impact", response_model=EnvironmentalImpactReport)
def get_environmental_impact(db: Session = Depends(get_db)):
    """
    Returns transparent lifecycle network energy (kWh) and greenhouse gas (kg CO2e)
    estimations derived from physical interface counters with documented IEA factors.
    """
    return calculate_environmental_impact(db, device_id="default")
