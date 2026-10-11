from typing import Generator, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger
from app.database.base import Base

_engine = None
_SessionLocal = None
_active_db_url = None
_db_engine_name = "unknown"


def init_engine():
    global _engine, _SessionLocal, _active_db_url, _db_engine_name

    target_url = settings.DATABASE_URL
    try:
        # First attempt connecting to the configured PostgreSQL database
        connect_args = {}
        if target_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}
        elif "postgresql" in target_url:
            connect_args = {"connect_timeout": 2}

        test_engine = create_engine(
            target_url,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _engine = test_engine
        _active_db_url = target_url
        _db_engine_name = test_engine.dialect.name
        logger.info(f"Connected successfully to primary database ({_db_engine_name})")
    except Exception as exc:
        if settings.ALLOW_SQLITE_FALLBACK and not target_url.startswith("sqlite"):
            logger.warning(
                f"Primary database connection to PostgreSQL failed ({exc}). "
                f"Falling back to local SQLite database at {settings.FALLBACK_SQLITE_URL} for local development."
            )
            fallback_engine = create_engine(
                settings.FALLBACK_SQLITE_URL,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
            _engine = fallback_engine
            _active_db_url = settings.FALLBACK_SQLITE_URL
            _db_engine_name = fallback_engine.dialect.name
        else:
            logger.error(f"Database connection error: {exc}")
            raise exc

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_engine():
    global _engine
    if _engine is None:
        init_engine()
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        init_engine()
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Tuple[bool, str, str]:
    """
    Returns (is_connected, engine_name, message)
    """
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, _db_engine_name, "Database connection healthy"
    except Exception as exc:
        return False, _db_engine_name, str(exc)


def create_tables():
    """
    Convenience table creation for dev and tests
    """
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
