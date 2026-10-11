from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.measurements import router as measurements_router
from app.api.v1.tests import router as tests_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(measurements_router)
api_router.include_router(tests_router)
