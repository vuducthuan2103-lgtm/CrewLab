from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.portal_router import router as portal_router

app = FastAPI(title="CrewLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portal_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
