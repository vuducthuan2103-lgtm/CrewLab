import uuid

from fastapi import FastAPI
from starlette.testclient import TestClient

from app.core.db import engine
from app.main import app, database_connection_refused_handler, settings
from fastapi.middleware.cors import CORSMiddleware


def test_database_connection_error_is_readable_from_internal_app():
    test_app = FastAPI()
    test_app.add_exception_handler(ConnectionRefusedError, database_connection_refused_handler)

    @test_app.get("/database-check")
    async def database_check():
        raise ConnectionRefusedError("Supabase pooler is unavailable")

    cors_app = CORSMiddleware(
        app=test_app,
        allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    response = TestClient(cors_app).get(
        "/database-check", headers={"Origin": "http://localhost:3001"}
    )

    assert response.status_code == 503
    assert response.headers["access-control-allow-origin"] == "http://localhost:3001"
    assert response.json()["error"]["error_code"] == "DATABASE_UNAVAILABLE"


def test_session_database_pool_is_bounded_for_api_and_workers():
    """Each process must stay below Supavisor's small session-mode limit."""
    if settings.SUPABASE_POOLER_MODE.lower() != "session":
        return

    assert engine.pool.size() == settings.DB_POOL_SIZE
    assert engine.pool._max_overflow == settings.DB_MAX_OVERFLOW


def test_every_response_has_a_server_request_id():
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert uuid.UUID(response.headers["x-request-id"])


def test_readiness_reports_database_ready(monkeypatch):
    async def database_ready():
        return True

    monkeypatch.setattr("app.main._database_is_ready", database_ready, raising=False)
    response = TestClient(app).get("/readyz")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "dependencies": {"database": "ready"},
    }


def test_readiness_reports_database_unavailable(monkeypatch):
    async def database_unavailable():
        return False

    monkeypatch.setattr("app.main._database_is_ready", database_unavailable, raising=False)
    response = TestClient(app).get("/readyz")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "dependencies": {"database": "unavailable"},
    }
