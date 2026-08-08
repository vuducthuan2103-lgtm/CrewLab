from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.portal_router import router as portal_router
from app.api.internal_router import router as internal_router
from app.core.db import settings

app = FastAPI(title="CrewLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portal_router)
app.include_router(internal_router)


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
