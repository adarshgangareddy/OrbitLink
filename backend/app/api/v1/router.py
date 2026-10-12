from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.measurements import router as measurements_router
from app.api.v1.tests import router as tests_router
from app.api.v1.collector import router as collector_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.optimizer import router as optimizer_router
from app.api.v1.diagnostics import router as diagnostics_router
from app.api.v1.efficiency import router as efficiency_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.forecasting import router as forecasting_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(measurements_router)
api_router.include_router(tests_router)
api_router.include_router(collector_router)
api_router.include_router(sessions_router)
api_router.include_router(optimizer_router)
api_router.include_router(diagnostics_router)
api_router.include_router(efficiency_router)
api_router.include_router(assistant_router)
api_router.include_router(forecasting_router)

