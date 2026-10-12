import pytest
from app.schemas.optimization import PlanConfigSchema
from app.services.cost_optimizer import (
    calculate_plan_financials,
    compare_configured_plans,
    evaluate_plan_suitability,
    get_default_current_plan,
)


def test_calculate_plan_financials_within_allowance():
    plan = PlanConfigSchema(
        plan_name="Test Tier 200GB",
        provider="Test ISP",
        monthly_cost=500.0,
        currency="INR",
        data_allowance_gb=200.0,
        equipment_rental_fee=50.0,
        overage_rate_per_gb=10.0,
    )
    base, overage, equip, monthly, annual = calculate_plan_financials(plan, usage_gb=150.0)
    assert base == 500.0
    assert overage == 0.0
    assert equip == 50.0
    assert monthly == 550.0
    assert annual == 6600.0


def test_calculate_plan_financials_exceeding_allowance():
    plan = PlanConfigSchema(
        plan_name="Test Tier 100GB",
        provider="Test ISP",
        monthly_cost=400.0,
        currency="INR",
        data_allowance_gb=100.0,
        equipment_rental_fee=0.0,
        overage_rate_per_gb=15.0,
    )
    # 30 GB over allowance: 30 * 15 = 450 overage
    base, overage, equip, monthly, annual = calculate_plan_financials(plan, usage_gb=130.0)
    assert base == 400.0
    assert overage == 450.0
    assert monthly == 850.0
    assert annual == 10200.0


def test_compare_configured_plans():
    current = PlanConfigSchema(
        plan_name="Expensive Plan",
        provider="Old ISP",
        monthly_cost=1200.0,
        currency="INR",
        data_allowance_gb=500.0,
        equipment_rental_fee=0.0,
        overage_rate_per_gb=0.0,
    )
    candidate_1 = PlanConfigSchema(
        plan_name="Value Saver",
        provider="New Fiber",
        monthly_cost=600.0,
        currency="INR",
        data_allowance_gb=300.0,
        equipment_rental_fee=0.0,
        overage_rate_per_gb=10.0,
    )

    comparisons = compare_configured_plans(current, [candidate_1], projected_usage_gb=100.0)
    assert len(comparisons) == 1
    item = comparisons[0]
    assert item.plan_name == "Value Saver"
    assert item.net_monthly_savings == 600.0
    assert item.net_annual_savings == 7200.0
    assert item.suitability_rating == "Optimal"
    assert len(item.assumptions) >= 2


def test_plan_api_endpoints(client):
    # Test GET current plan
    resp = client.get("/api/v1/plans/current")
    assert resp.status_code == 200
    data = resp.json()
    assert "plan_name" in data
    assert "monthly_cost" in data

    # Test POST update current plan
    new_plan = {
        "plan_name": "Custom Fiber 200",
        "provider": "Airtel / Jio Fiber",
        "monthly_cost": 899.0,
        "currency": "INR",
        "billing_cycle_day": 5,
        "data_allowance_gb": 1000.0,
        "advertised_download_mbps": 200.0,
        "advertised_upload_mbps": 200.0,
        "equipment_rental_fee": 0.0,
        "overage_rate_per_gb": 0.0,
    }
    post_resp = client.post("/api/v1/plans/current", json=new_plan)
    assert post_resp.status_code == 200
    assert post_resp.json()["plan_name"] == "Custom Fiber 200"

    # Verify updated plan is returned
    get_resp = client.get("/api/v1/plans/current")
    assert get_resp.status_code == 200
    assert get_resp.json()["monthly_cost"] == 899.0

    # Test analysis endpoint
    analysis_resp = client.get("/api/v1/plans/analysis")
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()
    assert "projected_monthly_gb" in analysis
    assert "comparisons" in analysis
    assert "uncertainty_explanation" in analysis
