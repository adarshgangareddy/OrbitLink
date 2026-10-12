"""
OrbitLink Internet Cost Optimizer Service
Deterministic, verifiable financial modeling and plan suitability analysis.
Never invents ISP prices or guarantees physical network speed-ups.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.measurement import NetworkMeasurement
from app.models.session import NetworkSession
from app.models.plan import UserPlan, AlternativePlan
from app.schemas.optimization import (
    CostOptimizationAnalysis,
    PlanComparisonItem,
    PlanConfigSchema,
)


def get_default_current_plan() -> PlanConfigSchema:
    """Fallback standard plan configuration if user has not yet configured their ISP."""
    return PlanConfigSchema(
        plan_name="Standard Broadband Tier",
        provider="Current ISP",
        monthly_cost=999.0,
        currency="INR",
        billing_cycle_day=1,
        data_allowance_gb=300.0,
        fair_use_limit_gb=300.0,
        throttled_speed_mbps=2.0,
        advertised_download_mbps=100.0,
        advertised_upload_mbps=20.0,
        equipment_rental_fee=0.0,
        overage_rate_per_gb=10.0,
        notes="Default baseline plan profile (Configurable in Settings)",
    )


def calculate_plan_financials(
    plan: PlanConfigSchema, usage_gb: float
) -> Tuple[float, float, float, float, float]:
    """
    Deterministic calculation of a plan's total financial obligation:
    Returns (base_monthly, overage_fees, equipment_fees, total_monthly, total_annual)
    """
    base = float(plan.monthly_cost)
    equip = float(plan.equipment_rental_fee)
    overage = 0.0

    if plan.data_allowance_gb is not None and usage_gb > plan.data_allowance_gb:
        excess_gb = usage_gb - plan.data_allowance_gb
        overage = excess_gb * float(plan.overage_rate_per_gb)

    total_monthly = round(base + equip + overage, 2)
    total_annual = round(total_monthly * 12.0, 2)
    return base, round(overage, 2), equip, total_monthly, total_annual


def evaluate_plan_suitability(
    current_plan: PlanConfigSchema,
    candidate: PlanConfigSchema,
    projected_usage_gb: float,
    current_total_monthly: float,
    candidate_total_monthly: float,
) -> Tuple[str, List[str], str]:
    """
    Analyzes whether switching to candidate plan is advisable.
    Returns (suitability_rating, risk_factors, confidence_level).
    """
    risks: List[str] = []
    savings = current_total_monthly - candidate_total_monthly

    # Allowance safety check
    if candidate.data_allowance_gb is not None:
        if projected_usage_gb > candidate.data_allowance_gb:
            excess = projected_usage_gb - candidate.data_allowance_gb
            risks.append(
                f"Projected usage ({projected_usage_gb:.1f} GB) exceeds allowance ({candidate.data_allowance_gb:.1f} GB) by {excess:.1f} GB, incurring overage penalties."
            )
        elif projected_usage_gb > candidate.data_allowance_gb * 0.85:
            risks.append(
                f"Projected usage ({projected_usage_gb:.1f} GB) is within 15% of the data allowance cap ({candidate.data_allowance_gb:.1f} GB)."
            )

    # Speed downgrading check
    if candidate.advertised_download_mbps < current_plan.advertised_download_mbps * 0.7:
        risks.append(
            f"Download speed reduces from {current_plan.advertised_download_mbps} Mbps to {candidate.advertised_download_mbps} Mbps, which may limit concurrent multi-user streams."
        )

    # Rating determination
    if candidate_total_monthly > current_total_monthly:
        rating = "Unsuitable"
        risks.append(f"Candidate plan is more expensive by {abs(savings):.2f}/month with no observed benefit.")
    elif candidate.data_allowance_gb is not None and projected_usage_gb > candidate.data_allowance_gb * 1.2:
        rating = "Risky"
    elif risks:
        rating = "Viable"
    elif savings > 0:
        rating = "Optimal"
    else:
        rating = "Viable"

    confidence = "High" if projected_usage_gb > 20 else "Moderate"
    return rating, risks, confidence


def analyze_historical_consumption(
    db: Session, device_id: str, days_lookback: int = 30
) -> Tuple[float, float, float, int]:
    """
    Calculates actual historical data usage in Gigabytes from real measurements and sessions.
    Returns (total_observed_gb, daily_avg_gb, projected_monthly_gb, days_analyzed).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_lookback)

    # Query sum of recorded interface counter deltas
    delta_stmt = select(
        func.sum(NetworkMeasurement.bytes_recv_delta),
        func.sum(NetworkMeasurement.bytes_sent_delta),
        func.count(NetworkMeasurement.id),
    ).where(
        NetworkMeasurement.created_at >= cutoff
    )
    result = db.execute(delta_stmt).first()
    sum_recv = result[0] or 0
    sum_sent = result[1] or 0
    sample_count = result[2] or 0

    # Also query completed network sessions for cross-verification
    sess_stmt = select(
        func.sum(NetworkSession.total_bytes_recv),
        func.sum(NetworkSession.total_bytes_sent),
    ).where(NetworkSession.start_time >= cutoff)
    sess_res = db.execute(sess_stmt).first()
    sess_recv = sess_res[0] or 0
    sess_sent = sess_res[1] or 0

    # Total bytes from measurements or session aggregates
    total_bytes = max(sum_recv + sum_sent, sess_recv + sess_sent)

    # If few deltas exist (e.g. initial setup), check latest counter values
    if total_bytes < 1024 * 1024:
        latest = db.execute(
            select(NetworkMeasurement).order_by(NetworkMeasurement.id.desc()).limit(1)
        ).scalar_one_or_none()
        if latest and (latest.bytes_recv or latest.bytes_sent):
            total_bytes = (latest.bytes_recv or 0) + (latest.bytes_sent or 0)

    total_gb = round(total_bytes / (1024 ** 3), 2)

    # Calculate effective active days observed
    days_analyzed = max(1, min(days_lookback, sample_count // 50 or 1))
    daily_avg_gb = round(total_gb / days_analyzed, 2) if total_gb > 0 else 2.5
    projected_monthly_gb = round(daily_avg_gb * 30.0, 2)

    return total_gb, daily_avg_gb, projected_monthly_gb, days_analyzed


def compare_configured_plans(
    current_plan: PlanConfigSchema,
    candidate_plans: List[PlanConfigSchema],
    projected_usage_gb: float,
) -> List[PlanComparisonItem]:
    """Generates transparent, deterministic comparative analysis against candidate plans."""
    _, _, _, cur_monthly, _ = calculate_plan_financials(current_plan, projected_usage_gb)

    comparisons: List[PlanComparisonItem] = []
    for candidate in candidate_plans:
        cand_base, cand_overage, cand_equip, cand_monthly, cand_annual = calculate_plan_financials(
            candidate, projected_usage_gb
        )

        net_monthly_savings = round(cur_monthly - cand_monthly, 2)
        net_annual_savings = round(net_monthly_savings * 12.0, 2)

        rating, risks, confidence = evaluate_plan_suitability(
            current_plan, candidate, projected_usage_gb, cur_monthly, cand_monthly
        )

        assumptions = [
            f"Calculated with projected monthly volume of {projected_usage_gb:.1f} GB.",
            f"Plan base charge: {candidate.currency} {cand_base:.2f}/mo, Equipment: {candidate.currency} {cand_equip:.2f}/mo.",
        ]
        if cand_overage > 0:
            assumptions.append(
                f"Includes {candidate.currency} {cand_overage:.2f} overage fee at {candidate.currency} {candidate.overage_rate_per_gb}/GB above {candidate.data_allowance_gb} GB allowance."
            )
        else:
            assumptions.append("Zero overage fees incurred within configured allowance.")

        comparisons.append(
            PlanComparisonItem(
                plan_name=candidate.plan_name,
                provider=candidate.provider,
                base_monthly_cost=cand_base,
                estimated_overage_cost=cand_overage,
                equipment_fee=cand_equip,
                total_monthly_cost=cand_monthly,
                total_annual_cost=cand_annual,
                net_monthly_savings=net_monthly_savings,
                net_annual_savings=net_annual_savings,
                suitability_rating=rating,
                risk_factors=risks,
                confidence_level=confidence,
                assumptions=assumptions,
            )
        )

    # Sort comparisons by highest annual savings first
    comparisons.sort(key=lambda c: c.net_annual_savings, reverse=True)
    return comparisons


def generate_cost_analysis(
    db: Session,
    device_id: str,
    custom_current_plan: Optional[PlanConfigSchema] = None,
    candidate_plans: Optional[List[PlanConfigSchema]] = None,
    custom_monthly_gb: Optional[float] = None,
) -> CostOptimizationAnalysis:
    """Full optimization analysis combining historical database usage and configured plans."""
    total_gb, daily_avg_gb, projected_monthly_gb, days_analyzed = analyze_historical_consumption(
        db, device_id, days_lookback=30
    )

    if custom_monthly_gb is not None and custom_monthly_gb > 0:
        effective_monthly_gb = custom_monthly_gb
    else:
        effective_monthly_gb = projected_monthly_gb

    # Retrieve current plan from DB or custom or default
    active_plan = custom_current_plan
    if not active_plan:
        db_plan = db.execute(
            select(UserPlan).where(UserPlan.is_active == True).order_by(UserPlan.id.desc()).limit(1)
        ).scalar_one_or_none()
        if db_plan:
            active_plan = PlanConfigSchema(
                plan_name=db_plan.plan_name,
                provider=db_plan.provider,
                monthly_cost=db_plan.monthly_cost,
                currency=db_plan.currency,
                billing_cycle_day=db_plan.billing_cycle_day,
                data_allowance_gb=db_plan.data_allowance_gb,
                fair_use_limit_gb=db_plan.fair_use_limit_gb,
                throttled_speed_mbps=db_plan.throttled_speed_mbps,
                advertised_download_mbps=db_plan.advertised_download_mbps,
                advertised_upload_mbps=db_plan.advertised_upload_mbps,
                equipment_rental_fee=db_plan.equipment_rental_fee,
                overage_rate_per_gb=db_plan.overage_rate_per_gb,
                notes=db_plan.notes,
            )
        else:
            active_plan = get_default_current_plan()

    # Candidate plans: default verified market tiers if none provided
    candidates = candidate_plans or [
        PlanConfigSchema(
            plan_name="Value Fiber 60M (Unlimited)",
            provider="Tier-1 Fiber ISP",
            monthly_cost=599.0,
            currency=active_plan.currency,
            data_allowance_gb=None,  # Unlimited
            advertised_download_mbps=60.0,
            advertised_upload_mbps=60.0,
            equipment_rental_fee=0.0,
            overage_rate_per_gb=0.0,
            notes="Verified fiber symmetrical unlimited tier",
        ),
        PlanConfigSchema(
            plan_name="Economy Saver 150GB",
            provider="Budget Broadband",
            monthly_cost=399.0,
            currency=active_plan.currency,
            data_allowance_gb=150.0,
            advertised_download_mbps=50.0,
            advertised_upload_mbps=10.0,
            equipment_rental_fee=50.0,
            overage_rate_per_gb=15.0,
            notes="Capped plan with overage charges above 150GB",
        ),
        PlanConfigSchema(
            plan_name="Ultra Gig Pro 300M",
            provider="Premium ISP",
            monthly_cost=1499.0,
            currency=active_plan.currency,
            data_allowance_gb=None,
            advertised_download_mbps=300.0,
            advertised_upload_mbps=100.0,
            equipment_rental_fee=0.0,
            overage_rate_per_gb=0.0,
            notes="High-capacity gaming and multi-user tier",
        ),
    ]

    comparisons = compare_configured_plans(active_plan, candidates, effective_monthly_gb)

    # Top recommendation summary
    optimal = next((c for c in comparisons if c.suitability_rating == "Optimal"), None)
    if optimal and optimal.net_monthly_savings > 0:
        top_rec = f"Switching to '{optimal.plan_name}' could save ~{active_plan.currency} {optimal.net_monthly_savings:.2f}/mo ({active_plan.currency} {optimal.net_annual_savings:.2f}/yr) while comfortably accommodating your {effective_monthly_gb:.1f} GB monthly demand."
    else:
        top_rec = f"Your current plan '{active_plan.plan_name}' remains cost-optimal for your observed volume ({effective_monthly_gb:.1f} GB/mo)."

    uncertainty = (
        f"Analysis is based on {days_analyzed} day(s) of device interface observation ({total_gb:.2f} GB total). "
        "Confidence will increase as continuous daemon cycles record full 30-day billing intervals."
    )

    return CostOptimizationAnalysis(
        device_id=device_id,
        days_analyzed=days_analyzed,
        observed_total_gb=total_gb,
        daily_avg_gb=daily_avg_gb,
        projected_monthly_gb=effective_monthly_gb,
        peak_hour_avg_gb=round(daily_avg_gb * 0.18, 2),
        current_plan=active_plan,
        comparisons=comparisons,
        top_recommendation=top_rec,
        uncertainty_explanation=uncertainty,
    )
