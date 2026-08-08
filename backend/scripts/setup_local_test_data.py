"""Create deterministic local/staging users and MVP test data.

Provider credentials are deliberately excluded. They must be entered through
the Internal App so Spec 0010 encryption and validation are exercised.
"""

import asyncio
import uuid
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.db import engine, settings
from app.models.clients import BrandSetting, Client


TEST_CLIENT_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ROOT = Path(__file__).resolve().parents[2]


def load_test_settings() -> dict[str, str]:
    path = ROOT / ".env.test.local"
    if not path.exists():
        raise RuntimeError(f"Missing {path}")
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    required = {
        "CREWLAB_TEST_ADMIN_EMAIL",
        "CREWLAB_TEST_ADMIN_PASSWORD",
        "CREWLAB_TEST_CLIENT_EMAIL",
        "CREWLAB_TEST_CLIENT_PASSWORD",
    }
    missing = sorted(required - values.keys())
    if missing:
        raise RuntimeError("Missing test settings: " + ", ".join(missing))
    return values


async def upsert_test_client(session: AsyncSession) -> Client:
    client = await session.get(Client, TEST_CLIENT_ID)
    if client is None:
        client = Client(
            id=TEST_CLIENT_ID,
            name="CrewLab Test Cafe",
            brand_name="CrewLab Test Cafe",
            is_active=False,
            industry="Cafe & F&B",
            timezone="Asia/Ho_Chi_Minh",
            schedule_frequency="weekly",
            schedule_day=1,
            schedule_time="08:00",
            platforms=["facebook", "instagram"],
        )
        session.add(client)
        await session.flush()

    brand = await session.scalar(
        select(BrandSetting).where(
            BrandSetting.client_id == TEST_CLIENT_ID,
            BrandSetting.is_current.is_(True),
        )
    )
    if brand is None:
        session.add(
            BrandSetting(
                client_id=TEST_CLIENT_ID,
                is_current=True,
                brand_voice_short="Quán cà phê thủ công gần gũi cho dân văn phòng trẻ.",
                tone_of_voice="Ấm áp, chân thành, tinh tế",
                target_audience="Người đi làm 22-40 tuổi tại TP.HCM yêu cà phê chất lượng",
                avoid_phrases=["giảm giá sốc", "cam kết 100%", "mua ngay kẻo lỡ"],
                brand_colors={"primary": "#4A2C11", "secondary": "#D9A05B"},
                personality_keywords=["Thủ công", "Chân thành", "Ấm áp", "Tỉ mỉ"],
                writing_style="conversational",
                sample_captions=[
                    "Một tách cà phê chậm rãi cho buổi sáng nhiều ý tưởng.",
                    "Hạt mới rang, câu chuyện mới bắt đầu.",
                ],
                posting_frequency={"facebook": 3, "instagram": 2},
                allow_ai_images=False,
            )
        )
    await session.commit()
    await session.refresh(client)
    return client


async def upsert_auth_user(
    http: httpx.AsyncClient,
    *,
    email: str,
    password: str,
    app_metadata: dict,
    display_name: str,
) -> str:
    response = await http.get("/auth/v1/admin/users", params={"page": 1, "per_page": 1000})
    response.raise_for_status()
    users = response.json().get("users", [])
    existing = next((user for user in users if user.get("email") == email), None)
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "app_metadata": app_metadata,
        "user_metadata": {"display_name": display_name},
    }
    if existing:
        updated = await http.put(f"/auth/v1/admin/users/{existing['id']}", json=body)
        updated.raise_for_status()
        return existing["id"]
    created = await http.post("/auth/v1/admin/users", json=body)
    created.raise_for_status()
    return created.json()["id"]


async def main() -> None:
    test_settings = load_test_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required")

    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        client = await upsert_test_client(session)

    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(
        base_url=settings.SUPABASE_URL.rstrip("/"), headers=headers, timeout=30
    ) as http:
        await upsert_auth_user(
            http,
            email=test_settings["CREWLAB_TEST_ADMIN_EMAIL"],
            password=test_settings["CREWLAB_TEST_ADMIN_PASSWORD"],
            app_metadata={"role": "agency_admin"},
            display_name="CrewLab Test Agency Admin",
        )
        await upsert_auth_user(
            http,
            email=test_settings["CREWLAB_TEST_CLIENT_EMAIL"],
            password=test_settings["CREWLAB_TEST_CLIENT_PASSWORD"],
            app_metadata={"role": "client_admin", "client_id": str(client.id)},
            display_name="CrewLab Test Client Admin",
        )

    print(f"Test data ready for client_id={client.id}")
    print("Passwords were not printed. See LOCAL-TEST-CREDENTIALS.md in the repo root.")


if __name__ == "__main__":
    asyncio.run(main())
