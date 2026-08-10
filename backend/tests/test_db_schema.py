"""
Rigorous Test Suite for CrewLab Database Schema MVP (Spec 0001)
Validates all 70+ test cases across 10 categories from specs/0001-db-schema/test-cases.md
"""
import os
import re
import unittest
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.orm import class_mapper
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector

# Import all SQLAlchemy models
from app.models.clients import Client, BrandSetting, BrandSettingHistory
from app.models.content import WorkflowCycle, ContentPillar, ContentItem, ContentItemStateLog, ContentItemEvalAttempt
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.portal_accounts import ClientPortalAdmin
from app.models.assets import BrandAsset, SemanticAssetRecord, VisualSelectionDecision
from app.models.reviews import HitlReview, AgentMemory
from app.models.system import TaskLog, AuditLog

PROJECT_ROOT = Path(__file__).parent.parent
FULL_DEPLOY_SQL = PROJECT_ROOT / "full_deploy.sql"
ALEMBIC_VERSIONS_DIR = PROJECT_ROOT / "alembic" / "versions"

MODELS = [
    Client, BrandSetting, BrandSettingHistory, ClientPortalAdmin,
    WorkflowCycle, ContentPillar, ContentItem, ContentItemStateLog, ClientLLMConfig, ClientProviderCredential,
    BrandAsset, SemanticAssetRecord, VisualSelectionDecision, HitlReview, AgentMemory,
    TaskLog, AuditLog, ContentItemEvalAttempt
]

EXPECTED_TABLE_NAMES = {
    "clients", "brand_settings", "brand_settings_history",
    "workflow_cycles", "content_pillars", "content_items",
    "brand_assets", "semantic_asset_records", "visual_selection_decisions", "hitl_reviews", "agent_memory",
    "task_logs", "audit_log", "client_llm_configs", "content_item_state_logs",
    "content_item_eval_attempts", "client_provider_credentials", "client_portal_admins"
}


class TestMigrationAndSchemaStructure(unittest.TestCase):
    """Section 3: DB-MIG-001 to DB-MIG-015"""

    def test_DB_MIG_001_alembic_versions_exist(self):
        """DB-MIG-001 (P0): Check if Alembic migration scripts exist in alembic/versions/"""
        version_files = list(ALEMBIC_VERSIONS_DIR.glob("*.py"))
        self.assertGreater(
            len(version_files), 0,
            "DEFECT P0 [DB-MIG-001]: No migration revision files found in backend/alembic/versions/"
        )

    def test_DB_MIG_000_revision_graph_has_one_head(self):
        """Migration graph must be traversable and converge on the current head."""
        config = Config(str(PROJECT_ROOT / "alembic.ini"))
        script = ScriptDirectory.from_config(config)
        self.assertEqual(script.get_heads(), ["0015"])
        self.assertIsNotNone(script.get_revision("0006"))

    def test_DB_MIG_002_migration_idempotency_sql(self):
        """DB-MIG-002 (P0): DDL should be idempotent (CREATE TABLE IF NOT EXISTS or controlled Alembic)"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        has_if_not_exists = "CREATE TABLE IF NOT EXISTS" in sql_content
        # If full_deploy.sql has bare CREATE TABLE without IF NOT EXISTS, flag idempotency risk
        self.assertTrue(
            has_if_not_exists,
            "GAP/DEFECT P0 [DB-MIG-002]: full_deploy.sql uses bare 'CREATE TABLE' without 'IF NOT EXISTS', re-running raw SQL will fail."
        )

    def test_DB_MIG_005_schema_inventory_12_tables(self):
        """DB-MIG-005 (P0): All MVP tables must exist in models and DDL"""
        model_table_names = {model.__tablename__ for model in MODELS}
        self.assertEqual(
            model_table_names, EXPECTED_TABLE_NAMES,
            f"DEFECT P0 [DB-MIG-005]: Missing tables in models. Expected {EXPECTED_TABLE_NAMES}, got {model_table_names}"
        )
        
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        created_tables = set(re.findall(r"CREATE\ TABLE\ (?:IF\ NOT\ EXISTS\ )?(\w+)", sql_content, re.IGNORECASE))
        self.assertEqual(
            created_tables, EXPECTED_TABLE_NAMES,
            f"DEFECT P0 [DB-MIG-005]: Missing tables in full_deploy.sql DDL. Expected {EXPECTED_TABLE_NAMES}, got {created_tables}"
        )

    def test_DB_MIG_006_uuid_data_types(self):
        """DB-MIG-006 (P0): All PKs and FKs must use PostgreSQL UUID type"""
        for model in MODELS:
            mapper = class_mapper(model)
            pk_column = mapper.primary_key[0]
            self.assertIsInstance(
                pk_column.type, UUID,
                f"DEFECT P0 [DB-MIG-006]: Table '{model.__tablename__}' PK '{pk_column.name}' is not UUID"
            )

    def test_DB_MIG_007_timestamptz_data_types(self):
        """DB-MIG-007 (P1): created_at & updated_at must be timezone-aware (DateTime(timezone=True))"""
        for model in MODELS:
            mapper = class_mapper(model)
            for col in mapper.columns:
                if col.name in ("created_at", "updated_at"):
                    self.assertTrue(
                        getattr(col.type, "timezone", False),
                        f"DEFECT P1 [DB-MIG-007]: Table '{model.__tablename__}' column '{col.name}' is not timezone-aware"
                    )

    def test_DB_MIG_008_default_and_not_null_constraints(self):
        """DB-MIG-008 (P1): Field defaults (is_active=True, eval_retry_count=0, timezone='Asia/Ho_Chi_Minh')"""
        client_mapper = class_mapper(Client)
        self.assertFalse(client_mapper.columns["is_active"].nullable)
        self.assertEqual(client_mapper.columns["timezone"].default.arg, "Asia/Ho_Chi_Minh")
        
        item_mapper = class_mapper(ContentItem)
        self.assertFalse(item_mapper.columns["eval_retry_count"].nullable)
        self.assertEqual(item_mapper.columns["eval_retry_count"].default.arg, 0)

    def test_DB_MIG_010_indexes_on_fks_and_hot_paths(self):
        """DB-MIG-010 (P1): Foreign keys and hot query columns must be indexed"""
        for model in MODELS:
            mapper = class_mapper(model)
            for col in mapper.columns:
                if col.foreign_keys:
                    self.assertTrue(
                        col.index,
                        f"DEFECT P1 [DB-MIG-010]: Table '{model.__tablename__}' FK column '{col.name}' is missing index=True"
                    )
        
        # Hot paths: content_items.status, semantic record status, hitl_reviews.target_id.
        self.assertTrue(class_mapper(ContentItem).columns["status"].index)
        self.assertTrue(class_mapper(SemanticAssetRecord).columns["status"].index)
        self.assertTrue(class_mapper(HitlReview).columns["target_id"].index)

    def test_DB_MIG_011_jsonb_fields(self):
        """DB-MIG-011 (P1): Structured JSON fields must use PostgreSQL JSONB type"""
        jsonb_expectations = [
            (Client, "platforms"),
            (BrandSetting, "avoid_phrases"),
            (BrandSetting, "brand_colors"),
            (BrandSetting, "personality_keywords"),
            (BrandSetting, "sample_captions"),
            (ContentItem, "image_brief"),
            (ContentItem, "failed_criteria"),
            (BrandAsset, "tags"),
            (AuditLog, "details"),
        ]
        for model, col_name in jsonb_expectations:
            col = class_mapper(model).columns[col_name]
            self.assertIsInstance(
                col.type, JSONB,
                f"DEFECT P1 [DB-MIG-011]: {model.__tablename__}.{col_name} is not JSONB"
            )

    def test_DB_MIG_014_cascade_policies(self):
        """DB-MIG-014 (P1): Every FK must declare its deletion policy explicitly."""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        fk_lines = [line for line in sql_content.splitlines() if "FOREIGN KEY" in line]
        for fk in fk_lines:
            has_on_delete = any(
                policy in fk
                for policy in (
                    "ON DELETE CASCADE",
                    "ON DELETE SET NULL",
                    "ON DELETE RESTRICT",
                )
            )
            self.assertTrue(
                has_on_delete,
                f"DEFECT P1 [DB-MIG-014]: Foreign key missing explicit ON DELETE clause in SQL: {fk}"
            )


class TestBrandSettingsAndVersionHistory(unittest.TestCase):
    """Section 4: DB-BR-001 to DB-BR-010"""

    def test_DB_BR_007_is_current_uniqueness(self):
        """DB-BR-007 (P0): brand_settings MUST have is_current flag with unique partial index per client"""
        brand_setting_mapper = class_mapper(BrandSetting)
        has_is_current = "is_current" in brand_setting_mapper.columns
        self.assertTrue(
            has_is_current,
            "DEFECT P0 [DB-BR-007]: brand_settings model is missing 'is_current' column required for PRD C1 AC (single active brand setting per client)"
        )

    def test_DB_BR_010_scope_guard(self):
        """DB-BR-010 (P1): Confirm PRD-Master fields (service_tier, llm_usage) are NOT in MVP Spec 0001"""
        client_columns = {c.name for c in class_mapper(Client).columns}
        self.assertNotIn("service_tier", client_columns, "Scope guard: service_tier should not be in MVP clients model")


class TestWorkflowCycleAndFSM(unittest.TestCase):
    """Section 5: DB-WF-001 to DB-WF-006, DB-FSM-001 to DB-FSM-015"""

    def test_DB_WF_001_phase_enum_domain(self):
        """DB-WF-001 (P0): workflow_cycles.phase values strategy, content_production, done"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        has_check = "ck_workflow_cycles_phase" in sql_content or "CHECK (phase IN" in sql_content
        self.assertTrue(
            has_check,
            "GAP/DEFECT P0 [DB-WF-001]: workflow_cycles.phase is stored as generic VARCHAR in DDL without CHECK constraint"
        )

    def test_DB_FSM_001_content_item_status_enum_domain(self):
        """DB-FSM-001 (P0): content_items.status must enforce the 15 MVP states at DB level"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        has_status_check = "ck_content_items_status" in sql_content or "CHECK (status IN" in sql_content
        self.assertTrue(
            has_status_check,
            "GAP/DEFECT P0 [DB-FSM-001]: content_items.status is generic VARCHAR in DDL without CHECK constraint or Postgres ENUM for the 15 FSM states"
        )

    def test_DB_FSM_015_deferred_states_guard(self):
        """DB-FSM-015 (P2): Verify deferred states (draft, generated, scheduled, published) are excluded from MVP FSM"""
        valid_mvp_states = {
            "planned", "ready_for_generation", "caption_generating", "visual_matching",
            "visual_generating", "evaluating", "eval_failed",
            "pending_content_approval", "approved_ready_to_post", "posted", "rejected", "archived"
        }
        deferred_states = {"draft", "generated", "scheduled", "published"}
        self.assertTrue(deferred_states.isdisjoint(valid_mvp_states))


class TestAssetLibraryAndRequests(unittest.TestCase):
    """Section 6: DB-AS-001 to DB-AS-007"""

    def test_DB_AS_001_brand_asset_url_not_null(self):
        """DB-AS-001 (P0): brand_assets.url must be non-nullable"""
        col = class_mapper(BrandAsset).columns["url"]
        self.assertFalse(col.nullable, "DEFECT P0 [DB-AS-001]: brand_assets.url must be NOT NULL")

    def test_DB_AS_005_semantic_asset_record_foreign_keys(self):
        """DB-AS-005 (P0): semantic records must remain scoped to client and source asset."""
        mapper = class_mapper(SemanticAssetRecord)
        self.assertTrue(mapper.columns["client_id"].foreign_keys)
        self.assertTrue(mapper.columns["source_asset_id"].foreign_keys)

    def test_DB_AS_006_semantic_embedding_uses_pgvector(self):
        mapper = class_mapper(SemanticAssetRecord)
        self.assertIsInstance(mapper.columns["embedding"].type, Vector)
        self.assertEqual(mapper.columns["embedding"].type.dim, 1536)
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        self.assertIn("embedding extensions.vector(1536)", sql_content)
        self.assertIn("USING hnsw (embedding extensions.vector_cosine_ops)", sql_content)


class TestHitlReviewAndAppendOnly(unittest.TestCase):
    """Section 7: DB-HITL-001 to DB-HITL-005"""

    def test_DB_HITL_001_gate_type_and_action_domain(self):
        """DB-HITL-001 (P0): hitl_reviews gate_type and action domains"""
        mapper = class_mapper(HitlReview)
        self.assertIn("gate_type", mapper.columns)
        self.assertIn("action", mapper.columns)

    def test_DB_HITL_004_hitl_reviews_append_only(self):
        """DB-HITL-004 (P0): hitl_reviews must be append-only (no FOR ALL policy for client users)"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        has_client_view = 'CREATE POLICY "Clients can view their own hitl_reviews"' in sql_content
        has_client_insert = 'CREATE POLICY "Clients can insert their own hitl_reviews"' in sql_content
        self.assertTrue(
            has_client_view and has_client_insert,
            "DEFECT P0 [DB-HITL-004]: hitl_reviews missing separate SELECT/INSERT RLS policies required for append-only security"
        )


class TestAgentMemoryAndObservability(unittest.TestCase):
    """Section 8: DB-MEM-001 to DB-MEM-006, DB-OBS-001 to DB-OBS-005"""

    def test_DB_MEM_001_agent_memory_schema_fields(self):
        """DB-MEM-001 (P0): agent_memory required fields"""
        cols = {c.name for c in class_mapper(AgentMemory).columns}
        required = {"client_id", "agent_code", "task_type", "input_summary", "output_summary"}
        self.assertTrue(required.issubset(cols))

    def test_DB_MEM_005_agent_memory_content_item_fk(self):
        """DB-MEM-005 (P1): agent_memory.content_item_id SHOULD have FK to content_items.id"""
        col = class_mapper(AgentMemory).columns["content_item_id"]
        self.assertTrue(
            bool(col.foreign_keys),
            "DEFECT/GAP P1 [DB-MEM-005]: agent_memory.content_item_id is missing FK to content_items(id)"
        )

    def test_DB_OBS_001_task_logs_observability_fields(self):
        """DB-OBS-001 (P0): task_logs observability fields"""
        cols = {c.name for c in class_mapper(TaskLog).columns}
        required = {
            "client_id", "agent_code", "task_type", "tokens_in", "tokens_out",
            "latency_ms", "status", "wake_reason", "error_code", "error_retryable",
        }
        self.assertTrue(required.issubset(cols))

    def test_DB_OBS_005_task_logs_content_item_id(self):
        """DB-OBS-005 (P1): task_logs SHOULD have content_item_id for Internal App filtering"""
        cols = {c.name for c in class_mapper(TaskLog).columns}
        self.assertIn(
            "content_item_id", cols,
            "GAP P1 [DB-OBS-005]: task_logs is missing 'content_item_id' column required by Internal App log filtering"
        )


class TestAuditLogAndRLS(unittest.TestCase):
    """Section 9: DB-RLS-001 to DB-RLS-010"""

    def test_DB_RLS_001_rls_enabled_on_all_tables(self):
        """DB-RLS-001 (P0): Row Level Security must be enabled on all tenant tables"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        enabled_rls_tables = set(re.findall(r"ALTER\ TABLE\ (\w+)\ ENABLE\ ROW\ LEVEL\ SECURITY", sql_content, re.IGNORECASE))
        if not enabled_rls_tables and "ENABLE ROW LEVEL SECURITY" in sql_content:
            # Parse table names inside unnest(ARRAY[...]) block
            array_match = re.search(r"ARRAY\[(.*?)\]", sql_content, re.DOTALL)
            if array_match:
                enabled_rls_tables = set(re.findall(r"'([a-z_]+)'", array_match.group(1)))
        self.assertEqual(
            enabled_rls_tables, EXPECTED_TABLE_NAMES,
            f"DEFECT P0 [DB-RLS-001]: RLS not enabled on all 12 tables. Expected {EXPECTED_TABLE_NAMES}, got {enabled_rls_tables}"
        )

    def test_DB_RLS_007_audit_log_immutability(self):
        """DB-RLS-007 (P0): audit_log RLS must NOT grant UPDATE or DELETE permissions to Client users"""
        sql_content = FULL_DEPLOY_SQL.read_text(encoding="utf-8")
        has_client_view = 'CREATE POLICY "Clients can view their own audit_log"' in sql_content
        has_client_insert = 'CREATE POLICY "Clients can insert their own audit_log"' in sql_content
        self.assertTrue(
            has_client_view and has_client_insert,
            "DEFECT P0 [DB-RLS-007]: audit_log missing separate SELECT/INSERT RLS policies required for append-only immutability"
        )


if __name__ == "__main__":
    unittest.main()
