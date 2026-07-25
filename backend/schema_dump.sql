
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
	agent_code VARCHAR NOT NULL, 
	task_type VARCHAR NOT NULL, 
	model_used VARCHAR, 
	tokens_in INTEGER, 
	tokens_out INTEGER, 
	latency_ms INTEGER, 
	status VARCHAR NOT NULL, 
	eval_score FLOAT, 
	wake_reason VARCHAR NOT NULL, 
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

CREATE TABLE asset_requests (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	content_item_id UUID NOT NULL, 
	note TEXT, 
	status VARCHAR NOT NULL, 
	priority VARCHAR NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(content_item_id) REFERENCES content_items (id) ON DELETE CASCADE
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
	asset_request_id UUID, 
	url VARCHAR NOT NULL, 
	file_name VARCHAR, 
	tags JSONB, 
	asset_type VARCHAR, 
	source VARCHAR, 
	status VARCHAR NOT NULL, 
	usage_rights VARCHAR, 
	dimensions VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id) ON DELETE CASCADE, 
	FOREIGN KEY(asset_request_id) REFERENCES asset_requests (id) ON DELETE SET NULL
)

;
