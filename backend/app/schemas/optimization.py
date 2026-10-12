from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Feature A: Internet Cost Optimizer Schemas
# ==========================================

class PlanConfigSchema(BaseModel):
    plan_name: str = Field(..., description="Name of the internet plan")
    provider: str = Field(..., description="Internet Service Provider name")
    monthly_cost: float = Field(..., ge=0, description="Monthly cost in local currency")
    currency: str = Field(default="INR", description="Currency symbol or code")
    billing_cycle_day: int = Field(default=1, ge=1, le=31, description="Day of the month billing resets")
    data_allowance_gb: Optional[float] = Field(None, ge=0, description="Monthly data allowance in GB, None if unlimited")
    fair_use_limit_gb: Optional[float] = Field(None, ge=0, description="Fair use policy throttling limit in GB")
    throttled_speed_mbps: Optional[float] = Field(None, ge=0, description="Throttled speed after reaching FUP")
    advertised_download_mbps: float = Field(default=100.0, ge=1, description="Advertised download bandwidth")
    advertised_upload_mbps: float = Field(default=20.0, ge=1, description="Advertised upload bandwidth")
    equipment_rental_fee: float = Field(default=0.0, ge=0, description="Monthly modem/router rental charges")
    overage_rate_per_gb: float = Field(default=0.0, ge=0, description="Cost per GB for exceeding data cap")
    notes: Optional[str] = None


class PlanComparisonRequest(BaseModel):
    current_plan: Optional[PlanConfigSchema] = None
    candidate_plans: List[PlanConfigSchema] = Field(default_factory=list)
    custom_monthly_gb: Optional[float] = Field(None, ge=0, description="Optional override for estimated monthly usage")


class PlanComparisonItem(BaseModel):
    plan_name: str
    provider: str
    base_monthly_cost: float
    estimated_overage_cost: float
    equipment_fee: float
    total_monthly_cost: float
    total_annual_cost: float
    net_monthly_savings: float
    net_annual_savings: float
    suitability_rating: str  # "Optimal", "Viable", "Risky", "Unsuitable"
    risk_factors: List[str]
    confidence_level: str  # "High", "Moderate", "Low"
    assumptions: List[str]


class CostOptimizationAnalysis(BaseModel):
    device_id: str
    days_analyzed: int
    observed_total_gb: float
    daily_avg_gb: float
    projected_monthly_gb: float
    peak_hour_avg_gb: float
    current_plan: Optional[PlanConfigSchema] = None
    comparisons: List[PlanComparisonItem] = Field(default_factory=list)
    top_recommendation: Optional[str] = None
    uncertainty_explanation: str


# ==========================================
# Feature B: Network Quality Intelligence
# ==========================================

class QualityDiagnosisItem(BaseModel):
    diagnosis_id: str
    category: str  # "latency", "bufferbloat", "wifi_rf", "packet_loss", "congestion"
    severity: str  # "normal", "advisory", "warning", "critical"
    headline: str
    observed_evidence: str
    likely_explanation: str
    competing_explanations: List[str]
    uncertainty: str
    safe_next_action: str
    verification_method: str
    metrics_snapshot: Dict[str, Any]


class DiagnosticVerificationRequest(BaseModel):
    action_taken: str
    baseline_measurement_id: Optional[int] = None


class DiagnosticVerificationResponse(BaseModel):
    action_taken: str
    before_latency_ms: Optional[float]
    after_latency_ms: Optional[float]
    before_signal_pct: Optional[float]
    after_signal_pct: Optional[float]
    delta_latency_ms: Optional[float]
    outcome: str  # "improved", "unchanged", "degraded", "inconclusive"
    explanation: str


# ==========================================
# Feature C: Smart Bandwidth Efficiency
# ==========================================

class BandwidthScheduleRecommendation(BaseModel):
    file_size_gb: float
    recommended_window: str
    window_start_hour: int
    window_end_hour: int
    estimated_duration_minutes: float
    safe_speed_mbps: float
    safety_margin_pct: float
    reasoning: str
    hourly_demand_profile: List[Dict[str, Any]]
    is_automated_execution: bool = False
    disclaimer: str


# ==========================================
# Feature D: Environmental & Resource Efficiency
# ==========================================

class EnvironmentalImpactReport(BaseModel):
    total_observed_gb: float
    energy_consumption_kwh: float
    ghg_emissions_kg_co2e: float
    avoided_transfers_gb: float
    potential_energy_saved_kwh: float
    energy_intensity_factor_kwh_per_gb: float
    carbon_intensity_factor_g_co2_per_kwh: float
    methodology_source: str
    uncertainty_range: str
    transparency_disclaimer: str


# ==========================================
# Feature E: Grounded AI Assistant & RAG
# ==========================================

class AssistantQueryRequest(BaseModel):
    question: str
    include_system_context: bool = True


class CitationItem(BaseModel):
    source_title: str
    section: str
    retrieval_date: str
    verifiable_text: str


class AssistantQueryResponse(BaseModel):
    question: str
    answer: str
    grounded_facts: List[str]
    citations: List[CitationItem] = Field(default_factory=list)
    tools_executed: List[str] = Field(default_factory=list)
    confidence: str
    is_evidence_sufficient: bool


# ==========================================
# Feature F: Machine Learning & Forecasts
# ==========================================

class MLForecastResponse(BaseModel):
    target: str
    horizon_days: int
    baseline_model: str
    projected_daily_gb: List[Dict[str, Any]]
    historical_mae_gb: float
    historical_rmse_gb: float
    confidence_interval_95_pct: Dict[str, float]
    data_points_analyzed: int
    disclaimer: str
