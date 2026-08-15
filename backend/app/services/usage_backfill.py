"""Safe, rerunnable backfill from legacy LLM task logs into usage_events.

Dry-run is the default CLI behavior. Apply only after reviewing migration and
result counters; this module never updates or deletes task_logs.
"""

from __future__ import annotations

import argparse
import asyncio
import re
from dataclasses import dataclass

from sqlalchemy import select

from app.models.system import TaskLog
from app.models.usage import UsageEvent
from app.services.usage_ledger import (
    BeginUsageEventCommand,
    BillingClassification,
    FinalizeUsageEventCommand,
    SessionFactory,
    UsageCategory,
    UsageEventStatus,
    begin_usage_event,
    default_usage_session_factory,
    finalize_usage_event,
)


SAFE_LEGACY_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]*$")


@dataclass(frozen=True)
class BackfillResult:
    scanned: int
    eligible: int
    created: int
    finalized_existing: int
    skipped_existing: int
    unresolved: int
    dry_run: bool


async def backfill_task_logs(
    *,
    dry_run: bool = True,
    batch_size: int = 500,
    session_factory: SessionFactory | None = None,
) -> BackfillResult:
    """Backfill one bounded batch without mutating legacy source rows."""

    if isinstance(batch_size, bool) or batch_size < 1 or batch_size > 10_000:
        raise ValueError("batch_size must be between 1 and 10000")
    factory = session_factory or default_usage_session_factory
    async with factory() as session:
        already_migrated = (
            select(UsageEvent.id)
            .where(UsageEvent.source_task_log_id == TaskLog.id)
            .exists()
        )
        rows = list(
            (
                await session.scalars(
                    select(TaskLog)
                    .where(
                        TaskLog.task_type == "llm_call",
                        ~already_migrated,
                    )
                    .order_by(TaskLog.created_at, TaskLog.id)
                    .limit(batch_size)
                )
            ).all()
        )
        existing_keys = set(
            (
                await session.scalars(
                    select(UsageEvent.event_key).where(
                        UsageEvent.event_key.in_(
                            [f"legacy-task-log:{row.id}" for row in rows]
                        )
                    )
                )
            ).all()
        ) if rows else set()
        reported_existing = 0
        if not rows:
            reported_existing = len(
                (
                    await session.scalars(
                        select(TaskLog.id)
                        .join(
                            UsageEvent,
                            UsageEvent.source_task_log_id == TaskLog.id,
                        )
                        .where(TaskLog.task_type == "llm_call")
                        .order_by(TaskLog.created_at, TaskLog.id)
                        .limit(batch_size)
                    )
                ).all()
            )

    created = 0
    finalized_existing = 0
    skipped_existing = reported_existing
    unresolved = 0
    for row in rows:
        event_key = f"legacy-task-log:{row.id}"
        if dry_run:
            if event_key in existing_keys:
                skipped_existing += 1
            else:
                created += 1
                unresolved += 1
            continue

        admission = await begin_usage_event(
            BeginUsageEventCommand(
                event_key=event_key,
                client_id=row.client_id,
                content_item_id=row.content_item_id,
                agent_code=_legacy_identifier(row.agent_code, "legacy_unknown"),
                task_type="legacy_llm_call",
                wake_reason=_legacy_identifier(row.wake_reason, "legacy_unknown"),
                provider=_legacy_identifier(row.error_provider, "legacy_unknown"),
                model=_legacy_text(row.model_used, "legacy_unknown", 255),
                usage_category=UsageCategory.TEXT,
                environment="legacy",
                is_production=False,
                billing_classification=BillingClassification.INTERNAL_NON_BILLABLE,
                source_task_log_id=row.id,
                started_at=row.created_at,
            ),
            session_factory=factory,
        )
        if not admission.should_call_provider and admission.status != "pending":
            skipped_existing += 1
            continue
        if admission.should_call_provider:
            created += 1
        else:
            finalized_existing += 1
        await finalize_usage_event(
            FinalizeUsageEventCommand(
                usage_event_id=admission.usage_event_id,
                provider_request_id=_legacy_optional_identifier(
                    row.provider_request_id
                ),
                status=(
                    UsageEventStatus.SUCCEEDED
                    if str(row.status).casefold() in {"success", "succeeded"}
                    else UsageEventStatus.FAILED
                ),
                usage_units={
                    "input_tokens": max(int(row.tokens_in or 0), 0),
                    "output_tokens": max(int(row.tokens_out or 0), 0),
                },
                latency_ms=max(int(row.latency_ms or 0), 0),
                error_code=(
                    None
                    if str(row.status).casefold() in {"success", "succeeded"}
                    else "legacy_task_failure"
                ),
                force_unresolved=True,
            ),
            session_factory=factory,
        )
        unresolved += 1

    return BackfillResult(
        scanned=len(rows) + reported_existing,
        eligible=len(rows) + reported_existing,
        created=created,
        finalized_existing=finalized_existing,
        skipped_existing=skipped_existing,
        unresolved=unresolved,
        dry_run=dry_run,
    )


def _legacy_identifier(value: object, fallback: str) -> str:
    normalized = str(value or "").strip()
    if not normalized or len(normalized) > 128 or not SAFE_LEGACY_IDENTIFIER.fullmatch(normalized):
        return fallback
    return normalized


def _legacy_optional_identifier(value: object) -> str | None:
    normalized = str(value or "").strip()
    if not normalized or len(normalized) > 255 or not SAFE_LEGACY_IDENTIFIER.fullmatch(normalized):
        return None
    return normalized


def _legacy_text(value: object, fallback: str, max_length: int) -> str:
    normalized = str(value or "").strip()
    if not normalized or len(normalized) > max_length or any(
        ord(character) < 32 for character in normalized
    ):
        return fallback
    return normalized


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dry-run or apply the idempotent task_logs usage backfill."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist the backfill. Without this flag the command is read-only.",
    )
    parser.add_argument("--batch-size", type=int, default=500)
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    result = await backfill_task_logs(
        dry_run=not args.apply,
        batch_size=args.batch_size,
    )
    print(
        "usage backfill "
        f"dry_run={result.dry_run} scanned={result.scanned} "
        f"eligible={result.eligible} created={result.created} "
        f"finalized_existing={result.finalized_existing} "
        f"skipped_existing={result.skipped_existing} "
        f"unresolved={result.unresolved}"
    )


if __name__ == "__main__":
    asyncio.run(_main())
