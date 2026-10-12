"""
OrbitLink Environmental and Resource Efficiency Service
Transparent lifecycle network energy and greenhouse gas estimation.
Explicitly documents all conversion factors, sources, and uncertainty boundaries.
Never claims to directly measure wall-plug electricity without dedicated smart meters.
"""

from typing import Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.measurement import NetworkMeasurement
from app.models.session import NetworkSession
from app.schemas.optimization import EnvironmentalImpactReport

# Documented scientific conversion factors
# Source: Aslan, J. et al. (2018) "Electricity Intensity of Internet Data Transmission:
# Untangling the Estimates", Journal of Industrial Ecology.
# IEA (2022) "Data Centres and Data Transmission Networks", International Energy Agency.
ENERGY_INTENSITY_KWH_PER_GB = 0.015  # Modern fixed-line transmission energy intensity
CARBON_INTENSITY_G_PER_KWH = 475.0   # IEA Global average electrical grid carbon intensity (g CO2e / kWh)


def calculate_environmental_impact(db: Session, device_id: str) -> EnvironmentalImpactReport:
    """
    Computes transparent energy and GHG estimates derived from physical interface counters.
    """
    # 1. Total observed gigabytes
    delta_stmt = select(
        func.sum(NetworkMeasurement.bytes_recv_delta),
        func.sum(NetworkMeasurement.bytes_sent_delta),
    )
    res = db.execute(delta_stmt).first()
    sum_bytes = (res[0] or 0) + (res[1] or 0)

    # Cross-reference with session totals
    sess_stmt = select(
        func.sum(NetworkSession.total_bytes_recv),
        func.sum(NetworkSession.total_bytes_sent),
    )
    sess_res = db.execute(sess_stmt).first()
    sess_bytes = (sess_res[0] or 0) + (sess_res[1] or 0)

    total_bytes = max(sum_bytes, sess_bytes)

    # Fallback to latest counter values if deltas are minimal
    if total_bytes < 1024 * 1024:
        latest = db.execute(
            select(NetworkMeasurement).order_by(NetworkMeasurement.id.desc()).limit(1)
        ).scalar_one_or_none()
        if latest and (latest.bytes_recv or latest.bytes_sent):
            total_bytes = (latest.bytes_recv or 0) + (latest.bytes_sent or 0)

    total_gb = round(total_bytes / (1024 ** 3), 2)

    # 2. Derive electricity consumption (kWh)
    energy_kwh = round(total_gb * ENERGY_INTENSITY_KWH_PER_GB, 4)

    # 3. Derive GHG emissions (kg CO2e)
    # g CO2e = kWh * 475 g/kWh; kg CO2e = g / 1000
    emissions_kg_co2e = round((energy_kwh * CARBON_INTENSITY_G_PER_KWH) / 1000.0, 4)

    # 4. Redundant/avoidable transfer efficiency modeling
    # Estimate ~4% of background sync traffic is duplicate cacheable assets
    avoided_gb = round(total_gb * 0.04, 2)
    saved_energy_kwh = round(avoided_gb * ENERGY_INTENSITY_KWH_PER_GB, 4)

    methodology = (
        "IEA (2022) / Aslan et al. (2018) Lifecycle Internet Transmission Model. "
        "Factor: 0.015 kWh/GB (Fixed-line access + edge routing) and 475 g CO2e/kWh (IEA Global Average Grid)."
    )

    uncertainty = (
        "±40% uncertainty range due to varying regional power grid mixes, access network topologies "
        "(GPON fiber vs Starlink LEO radio links), and seasonal cooling factors."
    )

    disclaimer = (
        "Transparency Notice: OrbitLink does not physically monitor router wall-plug electrical current. "
        "Energy (kWh) and greenhouse gas figures are derived estimations based on published telecommunications "
        "research literature. Avoided traffic figures represent candidate caching efficiency."
    )

    return EnvironmentalImpactReport(
        total_observed_gb=total_gb,
        energy_consumption_kwh=energy_kwh,
        ghg_emissions_kg_co2e=emissions_kg_co2e,
        avoided_transfers_gb=avoided_gb,
        potential_energy_saved_kwh=saved_energy_kwh,
        energy_intensity_factor_kwh_per_gb=ENERGY_INTENSITY_KWH_PER_GB,
        carbon_intensity_factor_g_co2_per_kwh=CARBON_INTENSITY_G_PER_KWH,
        methodology_source=methodology,
        uncertainty_range=uncertainty,
        transparency_disclaimer=disclaimer,
    )
