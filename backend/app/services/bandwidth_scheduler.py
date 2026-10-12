"""
OrbitLink Smart Bandwidth Efficiency Service
Hourly network activity profiling, off-peak window detection, and safe download scheduling.
Never pretends to control an external router without authorized integrations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.models.measurement import NetworkMeasurement
from app.schemas.optimization import BandwidthScheduleRecommendation


def build_hourly_demand_profile(db: Session) -> List[Dict[str, Any]]:
    """
    Groups historical measurements into 24 hour-of-day bins (00:00 to 23:00).
    Calculates average transfer volume (MB) and average latency per hour.
    """
    # Initialize 24-hour baseline bins
    profile = [
        {
            "hour": h,
            "label": f"{h:02d}:00",
            "sample_count": 0,
            "avg_transfer_mb": 5.0,  # conservative nominal baseline
            "avg_latency_ms": 25.0,
            "demand_level": "low",
        }
        for h in range(24)
    ]

    stmt = select(
        extract("hour", NetworkMeasurement.created_at).label("hour"),
        func.count(NetworkMeasurement.id).label("count"),
        func.avg(NetworkMeasurement.latency_ms).label("avg_lat"),
        func.sum(NetworkMeasurement.bytes_recv_delta).label("sum_recv"),
        func.sum(NetworkMeasurement.bytes_sent_delta).label("sum_sent"),
    ).group_by(extract("hour", NetworkMeasurement.created_at))

    rows = db.execute(stmt).all()
    for row in rows:
        h = int(row.hour) if row.hour is not None else 0
        if 0 <= h < 24:
            count = row.count or 0
            lat = round(float(row.avg_lat), 1) if row.avg_lat is not None else 25.0
            sum_b = (row.sum_recv or 0) + (row.sum_sent or 0)
            mb = round(sum_b / (1024 * 1024), 2)

            profile[h]["sample_count"] = count
            profile[h]["avg_transfer_mb"] = max(mb, 5.0)
            profile[h]["avg_latency_ms"] = lat

    # Assign demand levels relative to average
    avg_volume = sum(p["avg_transfer_mb"] for p in profile) / 24.0
    for p in profile:
        vol = p["avg_transfer_mb"]
        if vol > avg_volume * 1.4:
            p["demand_level"] = "high"
        elif vol > avg_volume * 0.8:
            p["demand_level"] = "medium"
        else:
            p["demand_level"] = "low"

    return profile


def get_schedule_recommendation(
    db: Session, file_size_gb: float = 15.0, user_safe_speed_mbps: float = 50.0
) -> BandwidthScheduleRecommendation:
    """
    Analyzes 24h demand profile to identify the safest, lowest-impact window for large transfers.
    """
    profile = build_hourly_demand_profile(db)

    # Find the consecutive 4-hour window with lowest average volume
    best_start = 1  # Default 01:00 AM
    best_sum = float("inf")
    for start in range(24):
        window_sum = sum(profile[(start + i) % 24]["avg_transfer_mb"] for i in range(4))
        if window_sum < best_sum:
            best_sum = window_sum
            best_start = start

    window_end = (best_start + 4) % 24
    window_label = f"{best_start:02d}:00 – {window_end:02d}:00"

    # Enforce safe capacity margin (70% utilization, 30% safety headroom)
    safety_margin_pct = 30.0
    effective_speed_mbps = user_safe_speed_mbps * 0.70

    # Calculate transfer duration: 1 GB = 8000 Megabits
    total_megabits = file_size_gb * 8000.0
    duration_seconds = total_megabits / max(1.0, effective_speed_mbps)
    duration_minutes = round(duration_seconds / 60.0, 1)

    reasoning = (
        f"The {window_label} window exhibits the lowest historical network demand ({round(best_sum / 4, 1)} MB/hr avg). "
        f"Scheduling during this period avoids peak congestion and keeps 30% headroom for critical interactive packets."
    )

    disclaimer = (
        "OrbitLink provides data-driven scheduling intelligence. Execution must be configured within your "
        "download manager (e.g. Steam download scheduler, OS update window, or rsync cron task); "
        "OrbitLink does not hijack system or router routing policies."
    )

    return BandwidthScheduleRecommendation(
        file_size_gb=file_size_gb,
        recommended_window=window_label,
        window_start_hour=best_start,
        window_end_hour=window_end,
        estimated_duration_minutes=duration_minutes,
        safe_speed_mbps=round(effective_speed_mbps, 1),
        safety_margin_pct=safety_margin_pct,
        reasoning=reasoning,
        hourly_demand_profile=profile,
        is_automated_execution=False,
        disclaimer=disclaimer,
    )
