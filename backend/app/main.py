import asyncio
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.api.portal_router import router as portal_router
from app.api.internal_router import router as internal_router
from app.core.db import engine, settings

logger = logging.getLogger(__name__)

app = FastAPI(title="CrewLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

app.include_router(portal_router)
app.include_router(internal_router)


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "request_failed request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        response = JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "message": "Hệ thống đang tạm gián đoạn. Vui lòng thử lại.",
                    "details": {"support_reference": request_id},
                },
            },
        )

    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        round((time.perf_counter() - started_at) * 1000),
    )
    return response


@app.exception_handler(ConnectionRefusedError)
async def database_connection_refused_handler(
    _request: Request, _exc: ConnectionRefusedError
) -> JSONResponse:
    """Return a useful response when the local machine cannot reach Supabase."""
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error": {
                "error_code": "DATABASE_UNAVAILABLE",
                "message": "Không thể kết nối tới cơ sở dữ liệu Supabase. Hãy kiểm tra kết nối mạng hoặc quyền tường lửa.",
            },
        },
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


async def _database_is_ready() -> bool:
    try:
        async with engine.connect() as connection:
            await asyncio.wait_for(connection.execute(text("SELECT 1")), timeout=3)
        return True
    except Exception:
        logger.warning("database_readiness_failed")
        return False


@app.get("/readyz")
async def readiness_check():
    if await _database_is_ready():
        return {"status": "ready", "dependencies": {"database": "ready"}}
    return JSONResponse(
        status_code=503,
        content={
            "status": "not_ready",
            "dependencies": {"database": "unavailable"},
        },
    )
