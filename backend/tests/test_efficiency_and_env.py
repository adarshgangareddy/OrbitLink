import pytest
from app.services.bandwidth_scheduler import get_schedule_recommendation
from app.services.environmental_engine import (
    calculate_environmental_impact,
    ENERGY_INTENSITY_KWH_PER_GB,
    CARBON_INTENSITY_G_PER_KWH,
)


def test_bandwidth_scheduler_recommendation(client):
    resp = client.get("/api/v1/bandwidth/schedule?file_size_gb=20.0&safe_speed_mbps=50.0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_size_gb"] == 20.0
    assert "recommended_window" in data
    assert data["safety_margin_pct"] == 30.0
    assert data["safe_speed_mbps"] == 35.0  # 70% of 50 Mbps
    assert data["estimated_duration_minutes"] > 0
    assert "disclaimer" in data
    assert len(data["hourly_demand_profile"]) == 24


def test_environmental_impact_calculation(client):
    resp = client.get("/api/v1/environmental/impact")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_observed_gb" in data
    assert "energy_consumption_kwh" in data
    assert "ghg_emissions_kg_co2e" in data
    assert data["energy_intensity_factor_kwh_per_gb"] == ENERGY_INTENSITY_KWH_PER_GB
    assert data["carbon_intensity_factor_g_co2_per_kwh"] == CARBON_INTENSITY_G_PER_KWH
    assert "Aslan" in data["methodology_source"] or "IEA" in data["methodology_source"]
    assert "transparency_disclaimer" in data
