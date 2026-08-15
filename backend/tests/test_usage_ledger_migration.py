import ast
import re
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.models.clients import Client
from app.models.system import TaskLog
from app.models.usage import UsageEvent
from app.services.usage_backfill import backfill_task_logs


BACKEND_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_PATH = BACKEND_ROOT / "alembic/versions/0016_usage_event_ledger.py"
FULL_DEPLOY_PATH = BACKEND_ROOT / "full_deploy.sql"
ENV_EXAMPLE_PATH = BACKEND_ROOT / ".env.example"
LEDGER_TABLES = {
    "pricing_snapshots",
    "charge_multiplier_configs",
    "usage_events",
    "usage_cost_adjustments",
}


@pytest_asyncio.fixture
async def migration_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    client_id = uuid.uuid4()
    async with factory() as session:
        session.add(
            Client(
                id=client_id,
                name="Legacy Backfill Test",
                brand_name="Legacy Backfill Test",
                is_active=True,
            )
        )
        await session.commit()

    yield factory, client_id
    await engine.dispose()


def _legacy_log(
    *,
    client_id: uuid.UUID,
    created_at: datetime,
    index: int,
) -> TaskLog:
    return TaskLog(
        id=uuid.uuid4(),
        client_id=client_id,
        agent_code="D01",
        task_type="llm_call",
        model_used="legacy-model",
        tokens_in=100 + index,
        tokens_out=20,
        latency_ms=50,
        status="success",
        wake_reason="legacy_import",
        error_provider="openai",
        provider_request_id=f"legacy-provider-request-{index}",
        created_at=created_at,
    )


@pytest.mark.asyncio
async def test_backfill_rerun_is_idempotent_and_keeps_unresolved_explicit(
    migration_store,
):
    """AC-08: source rows survive, reruns add no cost, and missing rates stay unresolved."""
    factory, client_id = migration_store
    started_at = datetime(2026, 8, 1, tzinfo=timezone.utc)
    source_rows = [
        _legacy_log(client_id=client_id, created_at=started_at, index=index)
        for index in range(2)
    ]
    async with factory() as session:
        session.add_all(source_rows)
        await session.commit()
        source_ids = {row.id for row in source_rows}

    first = await backfill_task_logs(
        dry_run=False,
        batch_size=500,
        session_factory=factory,
    )
    second = await backfill_task_logs(
        dry_run=False,
        batch_size=500,
        session_factory=factory,
    )

    async with factory() as session:
        events = list((await session.scalars(select(UsageEvent))).all())
        source_count = await session.scalar(select(func.count()).select_from(TaskLog))

    assert first.created == 2
    assert first.unresolved == 2
    assert second.created == 0
    assert second.skipped_existing == 2
    assert len(events) == 2
    assert {event.source_task_log_id for event in events} == source_ids
    assert {event.cost_status for event in events} == {"unresolved"}
    assert {event.cost_source for event in events} == {"legacy_task_log"}
    assert all(event.actual_cost_usd is None for event in events)
    assert all(event.customer_charge_usd is None for event in events)
    assert source_count == 2


@pytest.mark.asyncio
async def test_backfill_with_more_than_500_rows_advances_past_existing_first_batch(
    migration_store,
):
    """AC-08 regression: LIMIT must apply after excluding already migrated sources."""
    factory, client_id = migration_store
    started_at = datetime(2026, 8, 2, tzinfo=timezone.utc)
    source_rows = [
        _legacy_log(
            client_id=client_id,
            created_at=started_at + timedelta(microseconds=index),
            index=index,
        )
        for index in range(501)
    ]
    async with factory() as session:
        session.add_all(source_rows)
        await session.commit()
        ordered_rows = list(
            (
                await session.scalars(
                    select(TaskLog).order_by(TaskLog.created_at, TaskLog.id)
                )
            ).all()
        )
        session.add_all(
            [
                UsageEvent(
                    event_key=f"legacy-task-log:{row.id}",
                    client_id=row.client_id,
                    source_task_log_id=row.id,
                    agent_code=row.agent_code,
                    task_type="legacy_llm_call",
                    wake_reason=row.wake_reason,
                    provider="openai",
                    model=row.model_used,
                    usage_category="text",
                    usage_units={
                        "input_tokens": row.tokens_in,
                        "output_tokens": row.tokens_out,
                    },
                    environment="legacy",
                    is_production=False,
                    billing_classification="internal_non_billable",
                    status="succeeded",
                    cost_status="unresolved",
                    cost_source="legacy_task_log",
                    multiplier_snapshot=Decimal("1.10000000"),
                    multiplier_source="global_default",
                    started_at=row.created_at,
                    completed_at=row.created_at,
                )
                for row in ordered_rows[:500]
            ]
        )
        await session.commit()
        remaining_source_id = ordered_rows[500].id

    result = await backfill_task_logs(
        dry_run=False,
        batch_size=500,
        session_factory=factory,
    )

    async with factory() as session:
        event_count = await session.scalar(select(func.count()).select_from(UsageEvent))
        remaining_event = await session.scalar(
            select(UsageEvent).where(
                UsageEvent.source_task_log_id == remaining_source_id
            )
        )

    assert result.scanned == 1
    assert result.created == 1
    assert event_count == 501
    assert remaining_event is not None


@pytest.mark.asyncio
async def test_backfill_mixed_rows_dry_run_and_second_batch_preserve_sources(
    migration_store,
):
    """Post-fix regression: mixed history advances without mutating task_logs."""
    factory, client_id = migration_store
    started_at = datetime(2026, 8, 3, tzinfo=timezone.utc)
    source_rows = [
        _legacy_log(
            client_id=client_id,
            created_at=started_at + timedelta(microseconds=index),
            index=1000 + index,
        )
        for index in range(6)
    ]
    async with factory() as session:
        session.add_all(source_rows)
        await session.commit()
        ordered_rows = list(
            (
                await session.scalars(
                    select(TaskLog).order_by(TaskLog.created_at, TaskLog.id)
                )
            ).all()
        )
        session.add_all(
            [
                UsageEvent(
                    event_key=f"legacy-task-log:{row.id}",
                    client_id=row.client_id,
                    source_task_log_id=row.id,
                    agent_code=row.agent_code,
                    task_type="legacy_llm_call",
                    wake_reason=row.wake_reason,
                    provider="openai",
                    model=row.model_used,
                    usage_category="text",
                    usage_units={
                        "input_tokens": row.tokens_in,
                        "output_tokens": row.tokens_out,
                    },
                    environment="legacy",
                    is_production=False,
                    billing_classification="internal_non_billable",
                    status="succeeded",
                    cost_status="unresolved",
                    cost_source="legacy_task_log",
                    multiplier_snapshot=Decimal("1.10000000"),
                    multiplier_source="global_default",
                    started_at=row.created_at,
                    completed_at=row.created_at,
                )
                for row in (ordered_rows[0], ordered_rows[2])
            ]
        )
        await session.commit()

    dry_run = await backfill_task_logs(
        dry_run=True,
        batch_size=2,
        session_factory=factory,
    )
    async with factory() as session:
        event_count_after_dry_run = await session.scalar(
            select(func.count()).select_from(UsageEvent)
        )
        source_count_after_dry_run = await session.scalar(
            select(func.count()).select_from(TaskLog)
        )

    first_apply = await backfill_task_logs(
        dry_run=False,
        batch_size=2,
        session_factory=factory,
    )
    second_apply = await backfill_task_logs(
        dry_run=False,
        batch_size=2,
        session_factory=factory,
    )
    async with factory() as session:
        final_event_count = await session.scalar(
            select(func.count()).select_from(UsageEvent)
        )
        final_source_count = await session.scalar(
            select(func.count()).select_from(TaskLog)
        )
        mapped_source_ids = set(
            (
                await session.scalars(
                    select(UsageEvent.source_task_log_id).where(
                        UsageEvent.source_task_log_id.is_not(None)
                    )
                )
            ).all()
        )

    assert dry_run.created == 2
    assert event_count_after_dry_run == 2
    assert source_count_after_dry_run == 6
    assert first_apply.created == 2
    assert second_apply.created == 2
    assert final_event_count == 6
    assert final_source_count == 6
    assert mapped_source_ids == {row.id for row in ordered_rows}


def _operation_calls(function_node: ast.FunctionDef) -> list[tuple[str, str | None]]:
    calls = []
    for node in ast.walk(function_node):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        if not isinstance(node.func.value, ast.Name) or node.func.value.id != "op":
            continue
        first_argument = node.args[0].value if (
            node.args and isinstance(node.args[0], ast.Constant)
        ) else None
        calls.append((node.func.attr, first_argument))
    return calls


def test_migration_is_additive_and_downgrade_mentions_only_four_new_tables():
    """AC-09/deferred AC-10 support: revision 0016 cannot mutate legacy tables."""
    source = MIGRATION_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    functions = {
        node.name: node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name in {"upgrade", "downgrade"}
    }
    upgrade_calls = _operation_calls(functions["upgrade"])
    downgrade_calls = _operation_calls(functions["downgrade"])

    assert {
        argument for operation, argument in upgrade_calls if operation == "create_table"
    } == LEDGER_TABLES
    assert not {
        operation
        for operation, _argument in upgrade_calls
        if operation in {"drop_table", "drop_column", "alter_column"}
    }
    assert downgrade_calls == [
        ("drop_table", "usage_cost_adjustments"),
        ("drop_table", "usage_events"),
        ("drop_table", "charge_multiplier_configs"),
        ("drop_table", "pricing_snapshots"),
    ]
    downgrade_source = ast.get_source_segment(source, functions["downgrade"])
    assert "task_logs" not in downgrade_source


def test_downgrade_removes_immutability_guards_before_ledger_tables():
    """Pass-2 regression: trigger/function cleanup precedes every table drop."""
    source = MIGRATION_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    functions = {
        node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)
    }
    downgrade = functions["downgrade"]
    helper = functions["_drop_immutability_guards"]
    downgrade_source = ast.get_source_segment(source, downgrade)
    helper_source = ast.get_source_segment(source, helper)

    guard_cleanup_position = downgrade_source.index("_drop_immutability_guards()")
    table_drop_positions = [
        downgrade_source.index(f'op.drop_table("{table}")')
        for table in (
            "usage_cost_adjustments",
            "usage_events",
            "charge_multiplier_configs",
            "pricing_snapshots",
        )
    ]
    assert all(guard_cleanup_position < position for position in table_drop_positions)
    assert helper_source.count("DROP TRIGGER IF EXISTS") == 3
    assert helper_source.count("DROP FUNCTION IF EXISTS") == 2
    assert helper_source.rindex("DROP TRIGGER IF EXISTS") < helper_source.index(
        "DROP FUNCTION IF EXISTS"
    )


def test_ledger_tables_enable_rls_without_anon_or_authenticated_access():
    """Migration security contract: ledger stays backend-only until later projections."""
    migration = MIGRATION_PATH.read_text(encoding="utf-8")
    deploy_sql = FULL_DEPLOY_PATH.read_text(encoding="utf-8")

    assert "ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in migration
    assert "ALTER TABLE {table} FORCE ROW LEVEL SECURITY" in migration
    assert (
        "REVOKE ALL PRIVILEGES ON TABLE {table} FROM anon, authenticated"
        in migration
    )
    for table in LEDGER_TABLES:
        assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in deploy_sql
        assert f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY" in deploy_sql
        assert (
            f"REVOKE ALL PRIVILEGES ON TABLE {table} FROM anon, authenticated"
            in deploy_sql
        )
        assert f"GRANT ALL PRIVILEGES ON TABLE {table}" not in deploy_sql
        assert f"CREATE POLICY" not in "\n".join(
            line for line in deploy_sql.splitlines() if f"ON {table}" in line
        )


def test_ledger_schema_has_no_short_retention_or_destructive_cleanup():
    """Deferred AC-10 support: schema does not impose a TTL before 24 months."""
    model_columns = {column.name for column in UsageEvent.__table__.columns}
    migration = MIGRATION_PATH.read_text(encoding="utf-8").casefold()
    deploy_sql = FULL_DEPLOY_PATH.read_text(encoding="utf-8").casefold()

    assert {"expires_at", "ttl", "deleted_at"}.isdisjoint(model_columns)
    assert "delete from usage_events" not in migration
    assert "delete from usage_events" not in deploy_sql
    assert "drop table task_logs" not in migration


def _normalized_sql(source: str) -> str:
    return re.sub(r"\s+", " ", source.casefold())


def _assert_postgres_immutability_triggers(source: str) -> None:
    normalized = _normalized_sql(source)
    for table in ("pricing_snapshots", "usage_cost_adjustments"):
        assert re.search(
            rf"create\s+trigger\s+\w+\s+before\s+update\s+or\s+delete\s+on\s+{table}",
            normalized,
        ), f"{table} requires a DB-level UPDATE/DELETE immutability trigger"
    assert re.search(
        r"create\s+trigger\s+\w+\s+before\s+update\s+or\s+delete\s+on\s+usage_events",
        normalized,
    ), "usage_events requires a finalized-row immutability trigger"
    assert "raise exception" in normalized


def test_migration_and_full_deploy_define_financial_immutability_triggers():
    """R-003 RED: append-only guarantees must exist in PostgreSQL itself."""
    _assert_postgres_immutability_triggers(
        MIGRATION_PATH.read_text(encoding="utf-8")
    )
    _assert_postgres_immutability_triggers(
        FULL_DEPLOY_PATH.read_text(encoding="utf-8")
    )


def test_usage_event_trigger_allows_pending_to_terminal_but_locks_finalized_rows():
    """R-003 RED: the DB guard must permit finalization, then reject rewrites."""
    for path in (MIGRATION_PATH, FULL_DEPLOY_PATH):
        normalized = _normalized_sql(path.read_text(encoding="utf-8"))
        assert re.search(r"old\.status\s*=\s*'pending'", normalized)
        assert re.search(
            r"new\.status\s+in\s*\(\s*'succeeded'\s*,\s*'failed'\s*,\s*'cancelled'\s*\)",
            normalized,
        )
        assert re.search(
            r"old\.status\s*(?:<>|!=)\s*'pending'", normalized
        ) or "finalized usage event" in normalized


def test_usage_event_sql_guard_explicitly_rejects_delete_and_terminal_update():
    """Pass-2 regression: both forbidden operations raise inside their guard blocks."""
    for path in (MIGRATION_PATH, FULL_DEPLOY_PATH):
        normalized = _normalized_sql(path.read_text(encoding="utf-8"))
        assert re.search(
            r"if\s+tg_op\s*=\s*'delete'\s+then\s+raise\s+exception"
            r"\s+'usage events cannot be deleted'",
            normalized,
        )
        assert re.search(
            r"if\s+old\.status\s*(?:<>|!=)\s*'pending'\s+then\s+raise\s+exception"
            r"\s+'finalized usage event cannot be updated'",
            normalized,
        )


def test_env_example_declares_safe_usage_environment_and_production_instruction():
    """R-004 RED: deployment accounting mode must be explicit and locally safe."""
    env_example = ENV_EXAMPLE_PATH.read_text(encoding="utf-8")
    lines = env_example.splitlines()
    environment_line = next(
        (
            index
            for index, line in enumerate(lines)
            if line.strip().startswith("CREWLAB_ENVIRONMENT=")
        ),
        None,
    )

    assert environment_line is not None
    assert lines[environment_line].strip() == "CREWLAB_ENVIRONMENT=local"
    nearby_instruction = " ".join(
        lines[max(0, environment_line - 3) : environment_line + 4]
    ).casefold()
    assert "production" in nearby_instruction
    assert "deploy" in nearby_instruction or "coolify" in nearby_instruction
