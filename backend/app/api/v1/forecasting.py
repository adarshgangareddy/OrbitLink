"""
OrbitLink Machine Learning & Statistical Forecasting API Routes
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.optimization import MLForecastResponse
from app.services.ml_forecasting import generate_usage_forecast

router = APIRouter(prefix="/ml", tags=["Machine Learning & Predictive Intelligence"])


@router.get("/forecast", response_model=MLForecastResponse)
def get_ml_usage_forecast(
    horizon_days: int = Query(7, ge=1, le=30, description="Forecast horizon in days"),
    db: Session = Depends(get_db),
):
    """
    Returns transparent statistical usage forecasts with 95% confidence intervals
    and historical MAE/RMSE evaluation metrics.
    """
    return generate_usage_forecast(db, horizon_days=horizon_days)
