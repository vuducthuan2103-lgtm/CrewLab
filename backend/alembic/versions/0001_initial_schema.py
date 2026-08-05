"""Initial Database Schema Migration for CrewLab Phase 1 MVP (Spec 0001)

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-07-25 21:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. clients
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('brand_name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('industry', sa.String(), nullable=True),
        sa.Column('timezone', sa.String(), server_default='Asia/Ho_Chi_Minh', nullable=True),
        sa.Column('platforms', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. brand_settings
    op.create_table(
        'brand_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_current', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('brand_voice_short', sa.Text(), nullable=True),
        sa.Column('tone_of_voice', sa.String(), nullable=True),
        sa.Column('target_audience', sa.Text(), nullable=True),
        sa.Column('avoid_phrases', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('brand_colors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('personality_keywords', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('writing_style', sa.Text(), nullable=True),
        sa.Column('sample_captions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_brand_settings_client_id', 'brand_settings', ['client_id'], unique=False)
    op.create_index(
        'ix_brand_settings_client_current',
        'brand_settings',
        ['client_id'],
        unique=True,
        postgresql_where=sa.text('is_current = true')
    )

    # 3. brand_settings_history
    op.create_table(
        'brand_settings_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('brand_setting_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('brand_voice_short', sa.Text(), nullable=True),
        sa.Column('tone_of_voice', sa.String(), nullable=True),
        sa.Column('target_audience', sa.Text(), nullable=True),
        sa.Column('avoid_phrases', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('brand_colors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('personality_keywords', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('writing_style', sa.Text(), nullable=True),
        sa.Column('sample_captions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['brand_setting_id'], ['brand_settings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_brand_settings_history_client_id', 'brand_settings_history', ['client_id'], unique=False)
    op.create_index('ix_brand_settings_history_brand_setting_id', 'brand_settings_history', ['brand_setting_id'], unique=False)

    # 4. workflow_cycles
    op.create_table(
        'workflow_cycles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('phase', sa.String(), server_default='strategy', nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("phase IN ('strategy', 'content_production', 'done')", name='ck_workflow_cycles_phase'),
        sa.CheckConstraint("status IN ('active', 'completed')", name='ck_workflow_cycles_status'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_workflow_cycles_client_id', 'workflow_cycles', ['client_id'], unique=False)

    # 5. content_pillars
    op.create_table(
        'content_pillars',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cycle_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('weight', sa.Integer(), server_default='1', nullable=True),
        sa.Column('updated_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cycle_id'], ['workflow_cycles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_content_pillars_client_id', 'content_pillars', ['client_id'], unique=False)
    op.create_index('ix_content_pillars_cycle_id', 'content_pillars', ['cycle_id'], unique=False)

    # 6. content_items
    op.create_table(
        'content_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cycle_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pillar_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='planned', nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('image_brief', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('eval_score_caption', sa.Float(), nullable=True),
        sa.Column('eval_score_visual', sa.Float(), nullable=True),
        sa.Column('eval_retry_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failed_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('fix_instructions', sa.Text(), nullable=True),
        sa.Column('client_edited_caption', sa.Text(), nullable=True),
        sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('planned', 'ready_for_generation', 'caption_generating', 'visual_matching', 'waiting_asset', 'asset_blocked', 'visual_generating', 'evaluating', 'eval_failed', 'pending_content_approval', 'approved_ready_to_post', 'posted', 'rejected', 'archived')",
            name='ck_content_items_status'
        ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cycle_id'], ['workflow_cycles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pillar_id'], ['content_pillars.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_content_items_client_id', 'content_items', ['client_id'], unique=False)
    op.create_index('ix_content_items_cycle_id', 'content_items', ['cycle_id'], unique=False)
    op.create_index('ix_content_items_pillar_id', 'content_items', ['pillar_id'], unique=False)
    op.create_index('ix_content_items_status', 'content_items', ['status'], unique=False)

    # 7. asset_requests
    op.create_table(
        'asset_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        sa.Column('priority', sa.String(), server_default='normal', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'fulfilled', 'expired')", name='ck_asset_requests_status'),
        sa.CheckConstraint("priority IN ('low', 'normal', 'high', 'urgent')", name='ck_asset_requests_priority'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_asset_requests_client_id', 'asset_requests', ['client_id'], unique=False)
    op.create_index('ix_asset_requests_content_item_id', 'asset_requests', ['content_item_id'], unique=False)
    op.create_index('ix_asset_requests_expires_at', 'asset_requests', ['expires_at'], unique=False)

    # 8. brand_assets
    op.create_table(
        'brand_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('asset_request_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('asset_type', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='approved', nullable=False),
        sa.Column('usage_rights', sa.String(), nullable=True),
        sa.Column('dimensions', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['asset_request_id'], ['asset_requests.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_brand_assets_asset_request_id', 'brand_assets', ['asset_request_id'], unique=False)
    op.create_index('ix_brand_assets_client_id', 'brand_assets', ['client_id'], unique=False)

    # 9. hitl_reviews
    op.create_table(
        'hitl_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('gate_type', sa.String(), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('reject_reason', sa.String(), nullable=True),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('edited_caption', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("gate_type IN ('pillar', 'plan', 'content')", name='ck_hitl_reviews_gate'),
        sa.CheckConstraint("action IN ('approved', 'rejected', 'edited')", name='ck_hitl_reviews_action'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_hitl_reviews_client_id', 'hitl_reviews', ['client_id'], unique=False)
    op.create_index('ix_hitl_reviews_content_item_id', 'hitl_reviews', ['content_item_id'], unique=False)
    op.create_index('ix_hitl_reviews_target_id', 'hitl_reviews', ['target_id'], unique=False)

    # 10. agent_memory
    op.create_table(
        'agent_memory',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('agent_code', sa.String(), nullable=False),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('input_summary', sa.Text(), nullable=False),
        sa.Column('output_summary', sa.Text(), nullable=False),
        sa.Column('human_feedback', sa.Text(), nullable=True),
        sa.Column('eval_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_memory_agent_code', 'agent_memory', ['agent_code'], unique=False)
    op.create_index('ix_agent_memory_client_id', 'agent_memory', ['client_id'], unique=False)
    op.create_index('ix_agent_memory_content_item_id', 'agent_memory', ['content_item_id'], unique=False)

    # 11. task_logs
    op.create_table(
        'task_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('agent_code', sa.String(), nullable=False),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('model_used', sa.String(), nullable=True),
        sa.Column('tokens_in', sa.Integer(), server_default='0', nullable=True),
        sa.Column('tokens_out', sa.Integer(), server_default='0', nullable=True),
        sa.Column('latency_ms', sa.Integer(), server_default='0', nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('eval_score', sa.Float(), nullable=True),
        sa.Column('wake_reason', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("wake_reason IN ('scheduled', 'task_assigned', 'manual', 'retry')", name='ck_task_logs_wake_reason'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_task_logs_agent_code', 'task_logs', ['agent_code'], unique=False)
    op.create_index('ix_task_logs_client_id', 'task_logs', ['client_id'], unique=False)
    op.create_index('ix_task_logs_content_item_id', 'task_logs', ['content_item_id'], unique=False)

    # 12. audit_log
    op.create_table(
        'audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_log_client_id', 'audit_log', ['client_id'], unique=False)
    op.create_index('ix_audit_log_user_id', 'audit_log', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_audit_log_user_id', table_name='audit_log')
    op.drop_index('ix_audit_log_client_id', table_name='audit_log')
    op.drop_table('audit_log')
    
    op.drop_index('ix_task_logs_content_item_id', table_name='task_logs')
    op.drop_index('ix_task_logs_client_id', table_name='task_logs')
    op.drop_index('ix_task_logs_agent_code', table_name='task_logs')
    op.drop_table('task_logs')
    
    op.drop_index('ix_agent_memory_content_item_id', table_name='agent_memory')
    op.drop_index('ix_agent_memory_client_id', table_name='agent_memory')
    op.drop_index('ix_agent_memory_agent_code', table_name='agent_memory')
    op.drop_table('agent_memory')
    
    op.drop_index('ix_hitl_reviews_target_id', table_name='hitl_reviews')
    op.drop_index('ix_hitl_reviews_content_item_id', table_name='hitl_reviews')
    op.drop_index('ix_hitl_reviews_client_id', table_name='hitl_reviews')
    op.drop_table('hitl_reviews')
    
    op.drop_index('ix_brand_assets_client_id', table_name='brand_assets')
    op.drop_index('ix_brand_assets_asset_request_id', table_name='brand_assets')
    op.drop_table('brand_assets')
    
    op.drop_index('ix_asset_requests_expires_at', table_name='asset_requests')
    op.drop_index('ix_asset_requests_content_item_id', table_name='asset_requests')
    op.drop_index('ix_asset_requests_client_id', table_name='asset_requests')
    op.drop_table('asset_requests')
    
    op.drop_index('ix_content_items_status', table_name='content_items')
    op.drop_index('ix_content_items_pillar_id', table_name='content_items')
    op.drop_index('ix_content_items_cycle_id', table_name='content_items')
    op.drop_index('ix_content_items_client_id', table_name='content_items')
    op.drop_table('content_items')
    
    op.drop_index('ix_content_pillars_cycle_id', table_name='content_pillars')
    op.drop_index('ix_content_pillars_client_id', table_name='content_pillars')
    op.drop_table('content_pillars')
    
    op.drop_index('ix_workflow_cycles_client_id', table_name='workflow_cycles')
    op.drop_table('workflow_cycles')
    
    op.drop_index('ix_brand_settings_history_brand_setting_id', table_name='brand_settings_history')
    op.drop_index('ix_brand_settings_history_client_id', table_name='brand_settings_history')
    op.drop_table('brand_settings_history')
    
    op.drop_index('ix_brand_settings_client_current', table_name='brand_settings')
    op.drop_index('ix_brand_settings_client_id', table_name='brand_settings')
    op.drop_table('brand_settings')
    
    op.drop_table('clients')
