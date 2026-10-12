"""
OrbitLink Internet Cost Optimizer API Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.plan import UserPlan
from app.schemas.optimization import (
    CostOptimizationAnalysis,
    PlanComparisonItem,
    PlanComparisonRequest,
    PlanConfigSchema,
)
from app.services.cost_optimizer import (
    compare_configured_plans,
    generate_cost_analysis,
    get_default_current_plan,
)

router = APIRouter(prefix="/plans", tags=["Internet Cost Optimizer"])


@router.get("/current", response_model=PlanConfigSchema)
def get_current_plan(db: Session = Depends(get_db)):
    """Retrieve user's active internet plan configuration."""
    db_plan = db.execute(
        select(UserPlan).where(UserPlan.is_active == True).order_by(UserPlan.id.desc()).limit(1)
    ).scalar_one_or_none()

    if db_plan:
        return PlanConfigSchema(
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
    return get_default_current_plan()


@router.post("/current", response_model=PlanConfigSchema)
def set_current_plan(plan_in: PlanConfigSchema, db: Session = Depends(get_db)):
    """Save or update user's active internet plan."""
    # Deactivate older active plans
    db.query(UserPlan).filter(UserPlan.is_active == True).update({"is_active": False})

    new_plan = UserPlan(
        device_id="default",
        plan_name=plan_in.plan_name,
        provider=plan_in.provider,
        monthly_cost=plan_in.monthly_cost,
        currency=plan_in.currency,
        billing_cycle_day=plan_in.billing_cycle_day,
        data_allowance_gb=plan_in.data_allowance_gb,
        fair_use_limit_gb=plan_in.fair_use_limit_gb,
        throttled_speed_mbps=plan_in.throttled_speed_mbps,
        advertised_download_mbps=plan_in.advertised_download_mbps,
        advertised_upload_mbps=plan_in.advertised_upload_mbps,
        equipment_rental_fee=plan_in.equipment_rental_fee,
        overage_rate_per_gb=plan_in.overage_rate_per_gb,
        notes=plan_in.notes,
        is_active=True,
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return plan_in


@router.post("/compare", response_model=list[PlanComparisonItem])
def compare_plans(request: PlanComparisonRequest, db: Session = Depends(get_db)):
    """Compare a current plan with candidate plans against estimated usage."""
    current = request.current_plan or get_default_current_plan()
    if not request.candidate_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one candidate plan must be provided for comparison.",
        )

    monthly_gb = request.custom_monthly_gb or 75.0
    return compare_configured_plans(current, request.candidate_plans, monthly_gb)


@router.get("/analysis", response_model=CostOptimizationAnalysis)
def get_cost_analysis(
    custom_monthly_gb: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    """
    Returns full cost analysis combining measured consumption,
    configured plan, market comparisons, and savings calculations.
    """
    return generate_cost_analysis(
        db, device_id="default", custom_monthly_gb=custom_monthly_gb
    )
