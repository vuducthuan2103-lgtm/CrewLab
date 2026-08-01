"""Celery application instance and Beat periodic task configuration."""
import os
try:
    from celery import Celery
    from celery.schedules import crontab
except ImportError:
    # Fallback stub if Celery is not installed in current environment
    class Celery:
        def __init__(self, *args, **kwargs):
            self.conf = type('conf', (), {'beat_schedule': {}})()
        def task(self, *args, **kwargs):
            def decorator(f): return f
            return decorator

    def crontab(*args, **kwargs):
        return None

broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "crewlab",
    broker=broker_url,
    backend=result_backend,
    include=[
        "app.tasks.orchestrator_tasks",
        "app.tasks.d01_tasks",
        "app.tasks.d02_tasks",
        "app.tasks.e01_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
)

# Beat schedule configuration
celery_app.conf.beat_schedule = {
    "check-scheduled-cycles": {
        "task": "check_scheduled_cycles",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    "check-asset-expiry": {
        "task": "check_asset_request_expiry",
        "schedule": crontab(minute=0),        # Hourly on minute 0
    },
}
