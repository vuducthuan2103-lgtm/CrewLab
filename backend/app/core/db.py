import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, declared_attr, sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import Column, DateTime, String
import sqlalchemy as sa
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crewlab"
    SUPABASE_POOLER_MODE: str = "session"
    DB_POOL_SIZE: int = 2
    DB_MAX_OVERFLOW: int = 1
    DB_POOL_TIMEOUT_SECONDS: int = 15
    DB_POOL_RECYCLE_SECONDS: int = 300
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    CREWLAB_CREDENTIAL_ENCRYPTION_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    # Resolve against the backend package, not the process working directory.
    # Local development is commonly launched from the monorepo root.
    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, extra="ignore")

settings = Settings()


def _database_runtime_url() -> str:
    """Use Supavisor session mode for the persistent local API process."""
    mode = settings.SUPABASE_POOLER_MODE.lower()
    if mode not in {"session", "transaction"}:
        raise ValueError("SUPABASE_POOLER_MODE must be 'session' or 'transaction'")

    if mode == "session" and "pooler.supabase.com:6543/" in settings.DATABASE_URL:
        return settings.DATABASE_URL.replace(":6543/", ":5432/", 1)
    return settings.DATABASE_URL


database_runtime_url = _database_runtime_url()
_uses_transaction_pooler = ":6543/" in database_runtime_url
_engine_options: dict[str, Any] = {"echo": False}
if _uses_transaction_pooler:
    _engine_options.update(
        connect_args={"statement_cache_size": 0},
        poolclass=NullPool,
    )
else:
    # Supavisor session mode assigns one server connection to each client
    # connection until the client releases it. Keep every long-running CrewLab
    # process deliberately small so API + worker traffic cannot exhaust the
    # project's session pool.
    _engine_options.update(
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT_SECONDS,
        pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
        pool_pre_ping=True,
    )
engine = create_async_engine(database_runtime_url, **_engine_options)

# Celery sync tasks can recreate their event loop between deliveries. asyncpg
# connections are loop-bound, so worker sessions must not reuse pooled
# connections created by an earlier delivery. Keep API pooling unchanged and
# give workers a dedicated NullPool engine.
_celery_engine_options: dict[str, Any] = {
    "echo": False,
    "poolclass": NullPool,
}
if _uses_transaction_pooler:
    _celery_engine_options["connect_args"] = {"statement_cache_size": 0}
celery_engine = create_async_engine(database_runtime_url, **_celery_engine_options)
CeleryAsyncSessionLocal = sessionmaker(
    bind=celery_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base:
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()

Base = declarative_base(cls=Base)

def utcnow():
    return datetime.now(timezone.utc)
