from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.database.session import create_tables, init_engine
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OrbitLink backend services...")
    try:
        init_engine()
        create_tables()
        logger.info("Database schemas verified.")
    except Exception as exc:
        logger.error(f"Error during database initialization: {exc}")
    yield
    logger.info("OrbitLink backend shut down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root_summary():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "operational",
    }
