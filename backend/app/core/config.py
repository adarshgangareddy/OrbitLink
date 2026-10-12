import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_DEFAULT_SQLITE_PATH = os.path.join(_ROOT_DIR, "orbitlink.db").replace("\\", "/")


class Settings(BaseSettings):
    PROJECT_NAME: str = "OrbitLink"
    PROJECT_DESCRIPTION: str = "AI-powered network intelligence, usage analytics, and connectivity optimisation platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Database configuration
    # By default, points to PostgreSQL as specified in architecture.
    # If PostgreSQL server is unavailable in the local environment,
    # ALLOW_SQLITE_FALLBACK allows smooth zero-setup development.
    DATABASE_URL: str = "postgresql+psycopg://orbitlink_user:orbitlink_pass@localhost:5432/orbitlink"
    FALLBACK_SQLITE_URL: str = f"sqlite:///{_DEFAULT_SQLITE_PATH}"
    ALLOW_SQLITE_FALLBACK: bool = True

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Probing configuration
    DEFAULT_PING_TARGET: str = "1.1.1.1"
    HTTP_PROBE_URL: str = "https://1.1.1.1/cdn-cgi/trace"
    MEASUREMENT_COOLDOWN_SECONDS: int = 3

    # Background Collector Daemon configuration
    COLLECTOR_AUTO_START: bool = True
    COLLECTOR_INTERVAL_SECONDS: int = 15
    COLLECTOR_INCLUDE_SPEED_TEST: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
