"""add llm config table, posting frequency, schedule columns

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-01 18:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create client_llm_configs table
    op.create_table(
        'client_llm_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('agent_code', sa.String, nullable=False),
        sa.Column('provider', sa.String, nullable=False, server_default='openai'),
        sa.Column('model', sa.String, nullable=False, server_default='gpt-4o'),
        sa.Column('tier', sa.String, nullable=False, server_default='standard'),
        sa.Column('budget_usd', sa.Numeric(10, 2), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('client_id', 'agent_code', name='uq_client_llm_configs_client_agent'),
    )

    # 2. Add posting_frequency to brand_settings
    op.add_column(
        'brand_settings',
        sa.Column('posting_frequency', JSONB, nullable=True, server_default=sa.text("'{\"facebook\": 3, \"instagram\": 2}'::jsonb"))
    )

    # 3. Add scheduled_date, scheduled_time to content_items
    op.add_column('content_items', sa.Column('scheduled_date', sa.Date, nullable=True))
    op.add_column('content_items', sa.Column('scheduled_time', sa.String, nullable=True))


def downgrade() -> None:
    op.drop_column('content_items', 'scheduled_time')
    op.drop_column('content_items', 'scheduled_date')
    op.drop_column('brand_settings', 'posting_frequency')
    op.drop_table('client_llm_configs')
