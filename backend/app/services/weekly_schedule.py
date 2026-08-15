"""Helpers for the tenant-scoped weekly workflow schedule."""

from datetime import UTC, datetime, time, timedelta
import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


logger = logging.getLogger(__name__)

WEEKDAY_TO_ISO = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 7,
}
ISO_TO_WEEKDAY = {value: key for key, value in WEEKDAY_TO_ISO.items()}
SCHEDULE_CHECK_INTERVAL = timedelta(minutes=15)


def serialize_weekly_schedule(client, cycle=None) -> dict:
    """Return the stable Portal representation for a client's weekly schedule."""
    return {
        "weekly_cycle_day": ISO_TO_WEEKDAY.get(client.schedule_day, "monday"),
        "weekly_cycle_time": client.schedule_time,
        "timezone": client.timezone or "Asia/Ho_Chi_Minh",
        "frequency": client.schedule_frequency or "weekly",
        "cycle_id": str(cycle.id) if cycle else None,
        "status": cycle.status if cycle else None,
        "phase": cycle.phase if cycle else None,
    }


def is_weekly_schedule_due(client, now_utc: datetime | None = None) -> bool:
    """Return true once during the 15-minute Beat window after local run time."""
    now_utc = now_utc or datetime.now(UTC)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=UTC)

    try:
        client_tz = ZoneInfo(client.timezone or "Asia/Ho_Chi_Minh")
        hour_text, minute_text = client.schedule_time.split(":", 1)
        scheduled_time = time(hour=int(hour_text), minute=int(minute_text))
        schedule_day = int(client.schedule_day)
        if schedule_day not in ISO_TO_WEEKDAY:
            return False
    except (AttributeError, TypeError, ValueError, ZoneInfoNotFoundError):
        logger.warning("Skipping client with invalid weekly schedule configuration")
        return False

    local_now = now_utc.astimezone(client_tz)
    days_since_schedule = (local_now.isoweekday() - schedule_day) % 7
    scheduled_date = local_now.date() - timedelta(days=days_since_schedule)
    scheduled_at = datetime.combine(scheduled_date, scheduled_time, tzinfo=client_tz)
    elapsed = local_now - scheduled_at
    return timedelta(0) <= elapsed < SCHEDULE_CHECK_INTERVAL
