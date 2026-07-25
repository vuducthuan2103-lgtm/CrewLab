-- CrewLab Database DDL & RLS Setup (Phase 1 MVP - Spec 0001)

CREATE TABLE IF NOT EXISTS clients (
	id UUID NOT NULL, 
	name VARCHAR NOT NULL, 
	brand_name VARCHAR NOT NULL, 
	is_active BOOLEAN NOT NULL DEFAULT TRUE, 
	industry VARCHAR, 
	timezone VARCHAR DEFAULT 'Asia/Ho_Chi_Minh', 
	platforms JSONB, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
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
	CONSTRAINT ck_content_items_status CHECK (status IN ('planned', 'ready_for_generation', 'caption_generating', 'visual_matching', 'waiting_asset', 'asset_blocked', 'visual_generating', 'evaluating', 'eval_failed', 'pending_content_approval', 'approved_ready_to_post', 'posted', 'rejected', 'archived'))
);

CREATE INDEX IF NOT EXISTS ix_content_items_client_id ON content_items (client_id);
CREATE INDEX IF NOT EXISTS ix_content_items_cycle_id ON content_items (cycle_id);
CREATE INDEX IF NOT EXISTS ix_content_items_pillar_id ON content_items (pillar_id);
CREATE INDEX IF NOT EXISTS ix_content_items_status ON content_items (status);

CREATE TABLE IF NOT EXISTS asset_requests (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	content_item_id UUID NOT NULL, 
	note TEXT, 
	status VARCHAR NOT NULL DEFAULT 'pending', 
	priority VARCHAR NOT NULL DEFAULT 'normal', 
	expires_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE CASCADE,
	CONSTRAINT ck_asset_requests_status CHECK (status IN ('pending', 'fulfilled', 'expired')),
	CONSTRAINT ck_asset_requests_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS ix_asset_requests_client_id ON asset_requests (client_id);
CREATE INDEX IF NOT EXISTS ix_asset_requests_content_item_id ON asset_requests (content_item_id);
CREATE INDEX IF NOT EXISTS ix_asset_requests_expires_at ON asset_requests (expires_at);

CREATE TABLE IF NOT EXISTS brand_assets (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	asset_request_id UUID, 
	url VARCHAR NOT NULL, 
	file_name VARCHAR, 
	tags JSONB, 
	asset_type VARCHAR, 
	source VARCHAR, 
	status VARCHAR NOT NULL DEFAULT 'approved', 
	usage_rights VARCHAR, 
	dimensions VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(asset_request_id) REFERENCES asset_requests (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_brand_assets_client_id ON brand_assets (client_id);
CREATE INDEX IF NOT EXISTS ix_brand_assets_asset_request_id ON brand_assets (asset_request_id);

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
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE,
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL,
	CONSTRAINT ck_task_logs_wake_reason CHECK (wake_reason IN ('scheduled', 'task_assigned', 'manual', 'retry'))
);

CREATE INDEX IF NOT EXISTS ix_task_logs_client_id ON task_logs (client_id);
CREATE INDEX IF NOT EXISTS ix_task_logs_content_item_id ON task_logs (content_item_id);
CREATE INDEX IF NOT EXISTS ix_task_logs_agent_code ON task_logs (agent_code);

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


-- --- ENABLE ROW LEVEL SECURITY (RLS) --- 

DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'clients', 'brand_settings', 'brand_settings_history', 'workflow_cycles',
        'content_pillars', 'content_items', 'brand_assets', 'asset_requests',
        'hitl_reviews', 'agent_memory', 'task_logs', 'audit_log'
    ]) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 1. Agency Admin Policies (Full Access for all tables)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'clients', 'brand_settings', 'brand_settings_history', 'workflow_cycles',
        'content_pillars', 'content_items', 'brand_assets', 'asset_requests',
        'hitl_reviews', 'agent_memory', 'task_logs', 'audit_log'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Agency Admin has full access to ' || t, t);
        EXECUTE format('
            CREATE POLICY %I ON %I FOR ALL USING (
                (auth.jwt() ->> ''role'')::text = ''agency_admin'' OR 
                (auth.jwt() -> ''user_metadata'' ->> ''role'')::text = ''agency_admin''
            );
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
        'content_pillars', 'content_items', 'brand_assets', 'asset_requests',
        'agent_memory', 'task_logs'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Clients can only access their own ' || t, t);
        IF t = 'clients' THEN
            EXECUTE format('
                CREATE POLICY %I ON %I FOR ALL 
                USING (id::text = (auth.jwt() ->> ''client_id'')::text)
                WITH CHECK (id::text = (auth.jwt() ->> ''client_id'')::text);
            ', 'Clients can only access their own ' || t, t);
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON %I FOR ALL 
                USING (client_id::text = (auth.jwt() ->> ''client_id'')::text)
                WITH CHECK (client_id::text = (auth.jwt() ->> ''client_id'')::text);
            ', 'Clients can only access their own ' || t, t);
        END IF;
    END LOOP;
END $$;

-- 3. Append-Only RLS Policies for hitl_reviews and audit_log (SELECT + INSERT ONLY, NO UPDATE/DELETE)
DROP POLICY IF EXISTS "Clients can view their own hitl_reviews" ON hitl_reviews;
DROP POLICY IF EXISTS "Clients can insert their own hitl_reviews" ON hitl_reviews;
DROP POLICY IF EXISTS "Clients can only access their own hitl_reviews" ON hitl_reviews;

CREATE POLICY "Clients can view their own hitl_reviews" ON hitl_reviews
    FOR SELECT USING (client_id::text = (auth.jwt() ->> 'client_id')::text);

CREATE POLICY "Clients can insert their own hitl_reviews" ON hitl_reviews
    FOR INSERT WITH CHECK (client_id::text = (auth.jwt() ->> 'client_id')::text);


DROP POLICY IF EXISTS "Clients can view their own audit_log" ON audit_log;
DROP POLICY IF EXISTS "Clients can insert their own audit_log" ON audit_log;
DROP POLICY IF EXISTS "Clients can only access their own audit_log" ON audit_log;

CREATE POLICY "Clients can view their own audit_log" ON audit_log
    FOR SELECT USING (client_id::text = (auth.jwt() ->> 'client_id')::text);

CREATE POLICY "Clients can insert their own audit_log" ON audit_log
    FOR INSERT WITH CHECK (client_id::text = (auth.jwt() ->> 'client_id')::text);
