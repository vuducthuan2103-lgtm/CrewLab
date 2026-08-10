
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE clients (
	id UUID NOT NULL, 
	name VARCHAR NOT NULL, 
	brand_name VARCHAR NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	industry VARCHAR, 
	timezone VARCHAR, 
	platforms JSONB, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE agent_memory (
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
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
)

;

CREATE TABLE audit_log (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	action VARCHAR NOT NULL, 
	details JSONB, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
)

;

CREATE TABLE brand_settings (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
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
)

;

CREATE TABLE task_logs (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	content_item_id UUID,
	agent_code VARCHAR NOT NULL, 
	task_type VARCHAR NOT NULL, 
	model_used VARCHAR, 
	tokens_in INTEGER, 
	tokens_out INTEGER, 
	latency_ms INTEGER, 
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
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
)

;

CREATE TABLE workflow_cycles (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	phase VARCHAR NOT NULL, 
	start_date DATE, 
	end_date DATE, 
	status VARCHAR NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE
)

;

CREATE TABLE brand_settings_history (
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
)

;

CREATE TABLE content_pillars (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	cycle_id UUID NOT NULL, 
	name VARCHAR NOT NULL, 
	description TEXT, 
	weight INTEGER, 
	updated_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(cycle_id) REFERENCES workflow_cycles (id) ON DELETE CASCADE
)

;

CREATE TABLE content_items (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	cycle_id UUID NOT NULL, 
	pillar_id UUID, 
	topic VARCHAR NOT NULL, 
	platform VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	caption TEXT, 
	image_brief JSONB, 
	image_url VARCHAR, 
	eval_score_caption FLOAT, 
	eval_score_visual FLOAT, 
	eval_retry_count INTEGER NOT NULL, 
	failed_criteria JSONB, 
	fix_instructions TEXT, 
	client_edited_caption TEXT, 
	posted_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(cycle_id) REFERENCES workflow_cycles (id) ON DELETE CASCADE, 
	FOREIGN KEY(pillar_id) REFERENCES content_pillars (id) ON DELETE SET NULL
)

;

CREATE TABLE hitl_reviews (
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
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE SET NULL
)

;

CREATE TABLE brand_assets (
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
)

;

CREATE TABLE semantic_asset_records (
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
)

;

CREATE TABLE visual_selection_decisions (
    id UUID NOT NULL,
    client_id UUID NOT NULL,
    content_item_id UUID NOT NULL,
    run_number INTEGER NOT NULL,
    wake_reason VARCHAR NOT NULL,
    source_asset_id UUID,
    derivative_asset_id UUID NOT NULL,
    generation_mode VARCHAR NOT NULL,
    selection_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    selection_rationale TEXT,
    candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligibility_exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_summary TEXT,
    technical_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (content_item_id, run_number),
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY(content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
    FOREIGN KEY(source_asset_id) REFERENCES brand_assets(id) ON DELETE RESTRICT,
    FOREIGN KEY(derivative_asset_id) REFERENCES brand_assets(id) ON DELETE RESTRICT
);
CREATE INDEX ix_visual_selection_decisions_client_id ON visual_selection_decisions(client_id);
CREATE INDEX ix_visual_selection_decisions_content_item_id ON visual_selection_decisions(content_item_id);
CREATE INDEX ix_visual_selection_decisions_source_asset_id ON visual_selection_decisions(source_asset_id);
CREATE INDEX ix_visual_selection_decisions_derivative_asset_id ON visual_selection_decisions(derivative_asset_id);
