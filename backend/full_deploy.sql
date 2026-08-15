-- CrewLab Database DDL & RLS Setup (Phase 1 MVP - Spec 0001)

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand-assets', 'brand-assets', false, 52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Supabase blocks direct deletes from storage catalog tables. Remove an
-- obsolete bucket through the Storage API only after deleting its objects.

CREATE TABLE IF NOT EXISTS clients (
	id UUID NOT NULL,
	name VARCHAR NOT NULL,
	brand_name VARCHAR NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	industry VARCHAR,
	timezone VARCHAR DEFAULT 'Asia/Ho_Chi_Minh',
	platforms JSONB,
	monthly_budget_usd NUMERIC(10, 2),
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT ck_clients_monthly_budget_nonnegative CHECK (
		monthly_budget_usd IS NULL OR monthly_budget_usd >= 0
	)
);

CREATE TABLE IF NOT EXISTS brand_settings (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	is_current BOOLEAN NOT NULL DEFAULT TRUE,
	brand_voice_short TEXT,
	tone_of_voice VARCHAR,
	target_audience TEXT,
	avoid_phrases JSONB,
	brand_colors JSONB,
	personality_keywords JSONB,
	writing_style TEXT,
	sample_captions JSONB,
	logo_url VARCHAR,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_brand_settings_client_current ON brand_settings (client_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS ix_brand_settings_client_id ON brand_settings (client_id);

CREATE TABLE IF NOT EXISTS brand_settings_history (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	brand_setting_id UUID NOT NULL,
	brand_voice_short TEXT,
	tone_of_voice VARCHAR,
	target_audience TEXT,
	avoid_phrases JSONB,
	brand_colors JSONB,
	personality_keywords JSONB,
	writing_style TEXT,
	sample_captions JSONB,
	logo_url VARCHAR,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(brand_setting_id) REFERENCES brand_settings (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_brand_settings_history_client_id ON brand_settings_history (client_id);
CREATE INDEX IF NOT EXISTS ix_brand_settings_history_brand_setting_id ON brand_settings_history (brand_setting_id);

CREATE TABLE IF NOT EXISTS workflow_cycles (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	phase VARCHAR NOT NULL DEFAULT 'strategy',
	start_date DATE,
	end_date DATE,
	status VARCHAR NOT NULL DEFAULT 'active',
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	CONSTRAINT ck_workflow_cycles_phase CHECK (phase IN ('strategy', 'content_production', 'done')),
	CONSTRAINT ck_workflow_cycles_status CHECK (status IN ('active', 'completed'))
);

CREATE INDEX IF NOT EXISTS ix_workflow_cycles_client_id ON workflow_cycles (client_id);

CREATE TABLE IF NOT EXISTS client_llm_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    agent_code VARCHAR NOT NULL,
    provider VARCHAR NOT NULL DEFAULT 'openai',
    model VARCHAR NOT NULL DEFAULT 'gpt-4o',
    tier VARCHAR NOT NULL DEFAULT 'standard',
    budget_usd NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
    CONSTRAINT uq_client_llm_configs_client_agent UNIQUE (client_id, agent_code),
    CONSTRAINT ck_client_llm_configs_budget_nonnegative CHECK (
        budget_usd IS NULL OR budget_usd >= 0
    )
);

CREATE INDEX IF NOT EXISTS ix_client_llm_configs_client_id ON client_llm_configs (client_id);

CREATE TABLE IF NOT EXISTS client_provider_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    key_hint VARCHAR(8) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(16) NOT NULL DEFAULT 'untested',
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_test_error VARCHAR(200),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
    CONSTRAINT uq_client_provider_credentials_client_provider UNIQUE (client_id, provider),
    CONSTRAINT ck_client_provider_credentials_provider CHECK (provider IN ('openai', 'anthropic', 'google', 'deepseek', 'qwen')),
    CONSTRAINT ck_client_provider_credentials_validation_status CHECK (validation_status IN ('untested', 'valid', 'invalid'))
);

CREATE INDEX IF NOT EXISTS ix_client_provider_credentials_client_id ON client_provider_credentials (client_id);
CREATE INDEX IF NOT EXISTS ix_client_provider_credentials_enabled_client
    ON client_provider_credentials (client_id) WHERE is_enabled = TRUE;

CREATE TABLE IF NOT EXISTS client_portal_admins (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    auth_user_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
    CONSTRAINT uq_client_portal_admins_client_id UNIQUE (client_id),
    CONSTRAINT uq_client_portal_admins_auth_user_id UNIQUE (auth_user_id),
    CONSTRAINT uq_client_portal_admins_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS ix_client_portal_admins_client_id ON client_portal_admins (client_id);
CREATE INDEX IF NOT EXISTS ix_client_portal_admins_auth_user_id ON client_portal_admins (auth_user_id);

CREATE TABLE IF NOT EXISTS content_pillars (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	cycle_id UUID NOT NULL,
	name VARCHAR NOT NULL,
	description TEXT,
	weight INTEGER DEFAULT 1,
	updated_reason TEXT,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(cycle_id) REFERENCES workflow_cycles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_content_pillars_client_id ON content_pillars (client_id);
CREATE INDEX IF NOT EXISTS ix_content_pillars_cycle_id ON content_pillars (cycle_id);

CREATE TABLE IF NOT EXISTS content_items (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	cycle_id UUID NOT NULL,
	pillar_id UUID,
	topic VARCHAR NOT NULL,
	platform VARCHAR NOT NULL,
	status VARCHAR NOT NULL DEFAULT 'planned',
	caption TEXT,
	image_brief JSONB,
	image_url VARCHAR,
	eval_score_caption FLOAT,
	eval_score_visual FLOAT,
	eval_retry_count INTEGER NOT NULL DEFAULT 0,
	failed_criteria JSONB,
	fix_instructions TEXT,
	client_edited_caption TEXT,
	posted_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(cycle_id) REFERENCES workflow_cycles (id) ON DELETE CASCADE,
	FOREIGN KEY(pillar_id) REFERENCES content_pillars (id) ON DELETE SET NULL,
	CONSTRAINT ck_content_items_status CHECK (status IN ('planned', 'ready_for_generation', 'caption_generating', 'visual_matching', 'visual_generating', 'evaluating', 'eval_failed', 'pending_content_approval', 'approved_ready_to_post', 'posted', 'rejected', 'archived'))
);

CREATE INDEX IF NOT EXISTS ix_content_items_client_id ON content_items (client_id);
CREATE INDEX IF NOT EXISTS ix_content_items_cycle_id ON content_items (cycle_id);
CREATE INDEX IF NOT EXISTS ix_content_items_pillar_id ON content_items (pillar_id);
CREATE INDEX IF NOT EXISTS ix_content_items_status ON content_items (status);

CREATE TABLE IF NOT EXISTS content_item_state_logs (
    id UUID NOT NULL,
    content_item_id UUID NOT NULL,
    agent_code VARCHAR,
    previous_state VARCHAR,
    new_state VARCHAR NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_content_item_state_logs_content_item_id ON content_item_state_logs (content_item_id);

CREATE TABLE IF NOT EXISTS brand_assets (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	url VARCHAR NOT NULL,
	storage_path VARCHAR NOT NULL DEFAULT '',
	file_name VARCHAR,
	tags JSONB,
	asset_type VARCHAR,
	format VARCHAR,
	source VARCHAR,
	status VARCHAR NOT NULL DEFAULT 'pending_review',
	source_asset_id UUID,
	replaces_asset_id UUID,
	generation_mode TEXT,
	usage_rights VARCHAR,
	dimensions VARCHAR,
	content_sha256 VARCHAR(64),
	usage_count INTEGER NOT NULL DEFAULT 0,
	last_used_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(source_asset_id) REFERENCES brand_assets (id) ON DELETE SET NULL,
	FOREIGN KEY(replaces_asset_id) REFERENCES brand_assets (id) ON DELETE RESTRICT
);

ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS replaces_asset_id UUID;
ALTER TABLE brand_assets DROP CONSTRAINT IF EXISTS brand_assets_replaces_asset_id_fkey;
ALTER TABLE brand_assets ADD CONSTRAINT brand_assets_replaces_asset_id_fkey
    FOREIGN KEY (replaces_asset_id) REFERENCES brand_assets(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS ix_brand_assets_client_id ON brand_assets (client_id);
CREATE INDEX IF NOT EXISTS ix_brand_assets_source_asset_id ON brand_assets (source_asset_id);
CREATE INDEX IF NOT EXISTS ix_brand_assets_replaces_asset_id ON brand_assets (replaces_asset_id);
CREATE INDEX IF NOT EXISTS ix_brand_assets_content_sha256 ON brand_assets (content_sha256);
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_assets_client_source_fingerprint
    ON brand_assets (client_id, content_sha256)
    WHERE content_sha256 IS NOT NULL AND source_asset_id IS NULL
      AND source IN ('client_uploaded', 'real_photo', 'portal');
CREATE TABLE IF NOT EXISTS semantic_asset_records (
    id UUID NOT NULL,
    client_id UUID NOT NULL,
    source_asset_id UUID NOT NULL UNIQUE,
    status VARCHAR NOT NULL DEFAULT 'processing',
    content_fingerprint VARCHAR(64),
    analysis_version VARCHAR NOT NULL DEFAULT 'v1',
    embedding_version VARCHAR,
    embedding extensions.vector(1536),
    search_text TEXT,
    semantic_summary TEXT,
    primary_subjects JSONB,
    secondary_subjects JSONB,
    setting JSONB,
    actions JSONB,
    composition JSONB,
    mood_lighting JSONB,
    text_safe_areas JSONB,
    visible_text JSONB,
    suggested_tags JSONB,
    technical_quality JSONB,
    editability JSONB,
    safety JSONB,
    confidence JSONB,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
    FOREIGN KEY(source_asset_id) REFERENCES brand_assets (id) ON DELETE CASCADE,
    CONSTRAINT ck_semantic_asset_records_status CHECK (
        status IN ('processing', 'ready', 'needs_attention', 'failed', 'superseded')
    )
);
CREATE INDEX IF NOT EXISTS ix_semantic_asset_records_client_id ON semantic_asset_records (client_id);
CREATE INDEX IF NOT EXISTS ix_semantic_asset_records_status ON semantic_asset_records (status);
CREATE INDEX IF NOT EXISTS ix_semantic_asset_records_client_status ON semantic_asset_records (client_id, status);
CREATE INDEX IF NOT EXISTS ix_semantic_asset_records_content_fingerprint ON semantic_asset_records (content_fingerprint);
CREATE INDEX IF NOT EXISTS ix_semantic_asset_records_embedding_hnsw
    ON semantic_asset_records USING hnsw (embedding extensions.vector_cosine_ops)
    WHERE status = 'ready';

CREATE TABLE IF NOT EXISTS visual_selection_decisions (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL,
    wake_reason VARCHAR NOT NULL,
    source_asset_id UUID REFERENCES brand_assets(id) ON DELETE RESTRICT,
    derivative_asset_id UUID NOT NULL REFERENCES brand_assets(id) ON DELETE RESTRICT,
    generation_mode VARCHAR NOT NULL,
    selection_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    selection_rationale TEXT,
    candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligibility_exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_summary TEXT,
    technical_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_visual_decision_item_run UNIQUE (content_item_id, run_number)
);
CREATE INDEX IF NOT EXISTS ix_visual_selection_decisions_client_id ON visual_selection_decisions(client_id);
CREATE INDEX IF NOT EXISTS ix_visual_selection_decisions_content_item_id ON visual_selection_decisions(content_item_id);
CREATE INDEX IF NOT EXISTS ix_visual_selection_decisions_source_asset_id ON visual_selection_decisions(source_asset_id);
CREATE INDEX IF NOT EXISTS ix_visual_selection_decisions_derivative_asset_id ON visual_selection_decisions(derivative_asset_id);

CREATE TABLE IF NOT EXISTS hitl_reviews (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	gate_type VARCHAR NOT NULL,
	target_id UUID NOT NULL,
	content_item_id UUID,
	reviewer_id UUID NOT NULL,
	action VARCHAR NOT NULL,
	reject_reason VARCHAR,
	feedback_text TEXT,
	edited_caption TEXT,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL,
	CONSTRAINT ck_hitl_reviews_gate CHECK (gate_type IN ('pillar', 'plan', 'content')),
	CONSTRAINT ck_hitl_reviews_action CHECK (action IN ('approved', 'rejected', 'edited'))
);

CREATE INDEX IF NOT EXISTS ix_hitl_reviews_client_id ON hitl_reviews (client_id);
CREATE INDEX IF NOT EXISTS ix_hitl_reviews_target_id ON hitl_reviews (target_id);
CREATE INDEX IF NOT EXISTS ix_hitl_reviews_content_item_id ON hitl_reviews (content_item_id);

CREATE TABLE IF NOT EXISTS agent_memory (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	content_item_id UUID,
	agent_code VARCHAR NOT NULL,
	task_type VARCHAR NOT NULL,
	input_summary TEXT NOT NULL,
	output_summary TEXT NOT NULL,
	human_feedback TEXT,
	eval_score FLOAT,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_agent_memory_client_id ON agent_memory (client_id);
CREATE INDEX IF NOT EXISTS ix_agent_memory_content_item_id ON agent_memory (content_item_id);
CREATE INDEX IF NOT EXISTS ix_agent_memory_agent_code ON agent_memory (agent_code);

CREATE TABLE IF NOT EXISTS task_logs (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	content_item_id UUID,
	agent_code VARCHAR NOT NULL,
	task_type VARCHAR NOT NULL,
	model_used VARCHAR,
	tokens_in INTEGER DEFAULT 0,
	tokens_out INTEGER DEFAULT 0,
	latency_ms INTEGER DEFAULT 0,
	status VARCHAR NOT NULL,
	eval_score FLOAT,
	wake_reason VARCHAR NOT NULL,
	error_code VARCHAR,
	error_provider VARCHAR,
	provider_request_id VARCHAR,
	error_message TEXT,
	error_retryable BOOLEAN,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_task_logs_client_id ON task_logs (client_id);
CREATE INDEX IF NOT EXISTS ix_task_logs_content_item_id ON task_logs (content_item_id);
CREATE INDEX IF NOT EXISTS ix_task_logs_agent_code ON task_logs (agent_code);

CREATE TABLE IF NOT EXISTS pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(255) NOT NULL,
    usage_category VARCHAR(32) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    unit_prices JSONB NOT NULL DEFAULT '{}'::jsonb,
    version VARCHAR(128) NOT NULL,
    source_reference TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_pricing_snapshots_currency CHECK (currency = 'USD'),
    CONSTRAINT ck_pricing_snapshots_effective_range
        CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT uq_pricing_snapshots_provider_model_category_version
        UNIQUE (provider, model, usage_category, version)
);
CREATE INDEX IF NOT EXISTS ix_pricing_snapshots_effective_lookup
    ON pricing_snapshots (provider, model, usage_category, effective_from);

CREATE TABLE IF NOT EXISTS charge_multiplier_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(32) NOT NULL,
    client_id UUID,
    multiplier NUMERIC(18, 8) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    changed_by UUID NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    CONSTRAINT ck_charge_multiplier_configs_scope
        CHECK (scope IN ('global_default', 'client_override')),
    CONSTRAINT ck_charge_multiplier_configs_scope_client CHECK (
        (scope = 'global_default' AND client_id IS NULL) OR
        (scope = 'client_override' AND client_id IS NOT NULL)
    ),
    CONSTRAINT ck_charge_multiplier_configs_nonnegative CHECK (multiplier >= 0),
    CONSTRAINT ck_charge_multiplier_configs_effective_range
        CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS ix_charge_multiplier_configs_client_id
    ON charge_multiplier_configs (client_id);
CREATE INDEX IF NOT EXISTS ix_charge_multiplier_configs_effective_lookup
    ON charge_multiplier_configs (scope, client_id, effective_from);
CREATE UNIQUE INDEX IF NOT EXISTS uq_charge_multiplier_configs_active_global
    ON charge_multiplier_configs (scope)
    WHERE scope = 'global_default' AND effective_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_charge_multiplier_configs_active_client
    ON charge_multiplier_configs (client_id)
    WHERE scope = 'client_override' AND effective_to IS NULL;
INSERT INTO charge_multiplier_configs
    (id, scope, client_id, multiplier, effective_from, effective_to,
     changed_by, reason, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000110', 'global_default', NULL,
     1.10, NOW(), NULL, '00000000-0000-0000-0000-000000000000',
     'Initial system default', NOW())
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(255) NOT NULL,
    client_id UUID,
    content_item_id UUID,
    parent_event_id UUID,
    trace_id VARCHAR(255),
    span_id VARCHAR(255),
    agent_code VARCHAR(32) NOT NULL,
    task_type VARCHAR(128) NOT NULL,
    wake_reason VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(255) NOT NULL,
    usage_category VARCHAR(32) NOT NULL,
    request_mode VARCHAR(64),
    usage_units JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider_request_id VARCHAR(255),
    environment VARCHAR(32) NOT NULL,
    is_production BOOLEAN NOT NULL DEFAULT FALSE,
    billing_classification VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    cost_status VARCHAR(16) NOT NULL DEFAULT 'pending',
    cost_source VARCHAR(32),
    pricing_snapshot_id UUID,
    provider_reported_cost_usd NUMERIC(24, 12),
    actual_cost_usd NUMERIC(24, 12),
    multiplier_snapshot NUMERIC(18, 8) NOT NULL,
    multiplier_source VARCHAR(32) NOT NULL,
    customer_charge_usd NUMERIC(24, 12),
    latency_ms INTEGER,
    error_code VARCHAR(64),
    source_task_log_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY(content_item_id) REFERENCES content_items(id) ON DELETE SET NULL,
    FOREIGN KEY(parent_event_id) REFERENCES usage_events(id) ON DELETE SET NULL,
    FOREIGN KEY(pricing_snapshot_id) REFERENCES pricing_snapshots(id) ON DELETE RESTRICT,
    FOREIGN KEY(source_task_log_id) REFERENCES task_logs(id) ON DELETE RESTRICT,
    CONSTRAINT ck_usage_events_billing_classification CHECK (
        billing_classification IN ('customer_billable', 'internal_non_billable')
    ),
    CONSTRAINT ck_usage_events_status
        CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    CONSTRAINT ck_usage_events_cost_status
        CHECK (cost_status IN ('pending', 'provisional', 'final', 'unresolved')),
    CONSTRAINT ck_usage_events_cost_source CHECK (
        cost_source IS NULL OR cost_source IN
        ('provider_reported', 'pricing_snapshot', 'legacy_task_log', 'none')
    ),
    CONSTRAINT ck_usage_events_multiplier_source
        CHECK (multiplier_source IN ('global_default', 'client_override')),
    CONSTRAINT ck_usage_events_provider_cost_nonnegative
        CHECK (provider_reported_cost_usd IS NULL OR provider_reported_cost_usd >= 0),
    CONSTRAINT ck_usage_events_actual_cost_nonnegative
        CHECK (actual_cost_usd IS NULL OR actual_cost_usd >= 0),
    CONSTRAINT ck_usage_events_multiplier_nonnegative CHECK (multiplier_snapshot >= 0),
    CONSTRAINT ck_usage_events_customer_charge_nonnegative
        CHECK (customer_charge_usd IS NULL OR customer_charge_usd >= 0),
    CONSTRAINT ck_usage_events_latency_nonnegative
        CHECK (latency_ms IS NULL OR latency_ms >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_events_event_key
    ON usage_events (event_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_events_provider_request
    ON usage_events (provider, provider_request_id)
    WHERE provider_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_events_source_task_log_id
    ON usage_events (source_task_log_id)
    WHERE source_task_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_usage_events_client_id ON usage_events (client_id);
CREATE INDEX IF NOT EXISTS ix_usage_events_content_item_id ON usage_events (content_item_id);
CREATE INDEX IF NOT EXISTS ix_usage_events_parent_event_id ON usage_events (parent_event_id);
CREATE INDEX IF NOT EXISTS ix_usage_events_agent_code ON usage_events (agent_code);
CREATE INDEX IF NOT EXISTS ix_usage_events_pricing_snapshot_id ON usage_events (pricing_snapshot_id);
CREATE INDEX IF NOT EXISTS ix_usage_events_client_started_at
    ON usage_events (client_id, started_at);
CREATE INDEX IF NOT EXISTS ix_usage_events_agent_started_at
    ON usage_events (agent_code, started_at);
CREATE INDEX IF NOT EXISTS ix_usage_events_status_cost_status
    ON usage_events (status, cost_status);
CREATE INDEX IF NOT EXISTS ix_usage_events_trace_id ON usage_events (trace_id);

CREATE TABLE IF NOT EXISTS usage_cost_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usage_event_id UUID NOT NULL,
    actual_cost_delta_usd NUMERIC(24, 12) NOT NULL,
    customer_charge_delta_usd NUMERIC(24, 12) NOT NULL,
    reason TEXT NOT NULL,
    approved_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(usage_event_id) REFERENCES usage_events(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_usage_cost_adjustments_usage_event_id
    ON usage_cost_adjustments (usage_event_id);

CREATE OR REPLACE FUNCTION reject_usage_ledger_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

-- next-immutability-statement
CREATE OR REPLACE FUNCTION enforce_usage_event_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Usage events cannot be deleted'
            USING ERRCODE = '55000';
    END IF;

    IF OLD.status = 'pending'
       AND NEW.status IN ('succeeded', 'failed', 'cancelled') THEN
        RETURN NEW;
    END IF;

    IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Finalized usage event cannot be updated'
            USING ERRCODE = '55000';
    END IF;

    RAISE EXCEPTION 'Usage event may only transition from pending to a terminal status'
        USING ERRCODE = '55000';
END;
$$;

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_pricing_snapshots_immutable ON pricing_snapshots;
-- next-immutability-statement
CREATE TRIGGER trg_pricing_snapshots_immutable
BEFORE UPDATE OR DELETE ON pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION reject_usage_ledger_history_mutation();

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_usage_cost_adjustments_immutable ON usage_cost_adjustments;
-- next-immutability-statement
CREATE TRIGGER trg_usage_cost_adjustments_immutable
BEFORE UPDATE OR DELETE ON usage_cost_adjustments
FOR EACH ROW EXECUTE FUNCTION reject_usage_ledger_history_mutation();

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_usage_events_immutable ON usage_events;
-- next-immutability-statement
CREATE TRIGGER trg_usage_events_immutable
BEFORE UPDATE OR DELETE ON usage_events
FOR EACH ROW EXECUTE FUNCTION enforce_usage_event_immutability();

CREATE TABLE IF NOT EXISTS audit_log (
	id UUID NOT NULL,
	client_id UUID NOT NULL,
	user_id UUID NOT NULL,
	action VARCHAR NOT NULL,
	details JSONB,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_audit_log_client_id ON audit_log (client_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_user_id ON audit_log (user_id);

CREATE TABLE IF NOT EXISTS content_item_eval_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    caption_score DOUBLE PRECISION,
    visual_score DOUBLE PRECISION,
    caption_passed BOOLEAN,
    visual_passed BOOLEAN,
    overall_passed BOOLEAN NOT NULL DEFAULT FALSE,
    failed_criteria JSONB,
    fix_instructions_caption TEXT,
    fix_instructions_visual TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_attempts_client ON content_item_eval_attempts (client_id);
CREATE INDEX IF NOT EXISTS idx_eval_attempts_item ON content_item_eval_attempts (content_item_id);
CREATE INDEX IF NOT EXISTS idx_eval_attempts_item_num ON content_item_eval_attempts (content_item_id, attempt_number);


-- --- ENABLE ROW LEVEL SECURITY (RLS) ---

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_asset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_selection_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_llm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_item_state_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_item_eval_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_multiplier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_cost_adjustments ENABLE ROW LEVEL SECURITY;

ALTER TABLE client_provider_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE client_portal_admins FORCE ROW LEVEL SECURITY;
ALTER TABLE pricing_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE charge_multiplier_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_cost_adjustments FORCE ROW LEVEL SECURITY;

-- Financial ledger tables intentionally have no anon/authenticated policies.
-- Only backend/Internal API database roles may access them directly.
REVOKE ALL PRIVILEGES ON TABLE pricing_snapshots FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE charge_multiplier_configs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE usage_events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE usage_cost_adjustments FROM anon, authenticated;

-- 1. Agency Admin Policies (Full Access for all tables)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'clients', 'brand_settings', 'brand_settings_history', 'workflow_cycles',
        'content_pillars', 'content_items', 'brand_assets', 'semantic_asset_records', 'visual_selection_decisions',
        'hitl_reviews', 'agent_memory', 'task_logs', 'audit_log', 'client_llm_configs', 'client_provider_credentials', 'client_portal_admins',
        'content_item_state_logs', 'content_item_eval_attempts'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Agency Admin has full access to ' || t, t);
        EXECUTE format('
            CREATE POLICY %I ON %I FOR ALL TO authenticated
            USING ((auth.jwt() -> ''app_metadata'' ->> ''role'')::text = ''agency_admin'')
            WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'')::text = ''agency_admin'');
        ', 'Agency Admin has full access to ' || t, t);
    END LOOP;
END $$;

-- 2. Client User Standard Policies (FOR ALL on standard mutable tenant tables)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'clients', 'brand_settings', 'brand_settings_history', 'workflow_cycles',
        'content_pillars', 'content_items', 'brand_assets',
        'agent_memory', 'task_logs', 'client_llm_configs', 'content_item_eval_attempts'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Clients can only access their own ' || t, t);
        IF t = 'clients' THEN
            EXECUTE format('
                CREATE POLICY %I ON %I FOR ALL TO authenticated
                USING (id::text = (auth.jwt() -> ''app_metadata'' ->> ''client_id'')::text)
                WITH CHECK (id::text = (auth.jwt() -> ''app_metadata'' ->> ''client_id'')::text);
            ', 'Clients can only access their own ' || t, t);
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON %I FOR ALL TO authenticated
                USING (client_id::text = (auth.jwt() -> ''app_metadata'' ->> ''client_id'')::text)
                WITH CHECK (client_id::text = (auth.jwt() -> ''app_metadata'' ->> ''client_id'')::text);
            ', 'Clients can only access their own ' || t, t);
        END IF;
    END LOOP;
END $$;

-- Semantic analysis and vectors are server-authoritative derived data.
DROP POLICY IF EXISTS "Clients can only access their own semantic_asset_records" ON semantic_asset_records;
DROP POLICY IF EXISTS "Clients can view their own semantic_asset_records" ON semantic_asset_records;
CREATE POLICY "Clients can view their own semantic_asset_records" ON semantic_asset_records
    FOR SELECT TO authenticated
    USING (client_id::text = ((select auth.jwt()) -> 'app_metadata' ->> 'client_id')::text);

DROP POLICY IF EXISTS "Clients can view their own visual_selection_decisions" ON visual_selection_decisions;
CREATE POLICY "Clients can view their own visual_selection_decisions" ON visual_selection_decisions
    FOR SELECT TO authenticated
    USING (client_id::text = ((select auth.jwt()) -> 'app_metadata' ->> 'client_id')::text);

-- 3. Append-Only RLS Policies for hitl_reviews and audit_log (SELECT + INSERT ONLY, NO UPDATE/DELETE)
DROP POLICY IF EXISTS "Clients can view their own hitl_reviews" ON hitl_reviews;
DROP POLICY IF EXISTS "Clients can insert their own hitl_reviews" ON hitl_reviews;
DROP POLICY IF EXISTS "Clients can only access their own hitl_reviews" ON hitl_reviews;

CREATE POLICY "Clients can view their own hitl_reviews" ON hitl_reviews
    FOR SELECT TO authenticated USING (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text);

CREATE POLICY "Clients can insert their own hitl_reviews" ON hitl_reviews
    FOR INSERT TO authenticated WITH CHECK (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text);


DROP POLICY IF EXISTS "Clients can view their own audit_log" ON audit_log;
DROP POLICY IF EXISTS "Clients can insert their own audit_log" ON audit_log;
DROP POLICY IF EXISTS "Clients can only access their own audit_log" ON audit_log;

CREATE POLICY "Clients can view their own audit_log" ON audit_log
    FOR SELECT TO authenticated USING (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text);

CREATE POLICY "Clients can insert their own audit_log" ON audit_log
    FOR INSERT TO authenticated WITH CHECK (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text);

DROP POLICY IF EXISTS "Clients can view their own content item state logs" ON content_item_state_logs;
CREATE POLICY "Clients can view their own content item state logs" ON content_item_state_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM content_items
            WHERE content_items.id = content_item_state_logs.content_item_id
              AND content_items.client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text
        )
    );
