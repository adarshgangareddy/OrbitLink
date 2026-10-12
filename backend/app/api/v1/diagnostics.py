"""
OrbitLink Network Quality Intelligence API Routes
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.optimization import (
    DiagnosticVerificationRequest,
    DiagnosticVerificationResponse,
    QualityDiagnosisItem,
)
from app.services.quality_diagnostics import (
    evaluate_network_quality,
    verify_diagnostic_action,
)

router = APIRouter(prefix="/diagnostics", tags=["Network Quality Intelligence"])


@router.get("/quality", response_model=list[QualityDiagnosisItem])
def get_network_quality_diagnoses(
    limit: int = Query(25, ge=5, le=100), db: Session = Depends(get_db)
):
    """
    Evaluates recent real measurements to generate evidence-based diagnoses
    including Wi-Fi RF attenuation, bufferbloat, jitter, and congestion.
    """
    return evaluate_network_quality(db, limit=limit)


@router.post("/verify", response_model=DiagnosticVerificationResponse)
def verify_remediation_action(
    request: DiagnosticVerificationRequest, db: Session = Depends(get_db)
):
    """
    Compares network measurements before an attempted fix against the latest
    sample to verify whether the action actually improved the situation.
    """
    return verify_diagnostic_action(
        db, action_taken=request.action_taken, baseline_id=request.baseline_measurement_id
    )
