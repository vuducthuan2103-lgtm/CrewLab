"""add state log

Revision ID: 0003
Revises: 0002_add_brand_assets
Create Date: 2026-07-27 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002_add_brand_assets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create content_item_state_logs table
    op.create_table(
        'content_item_state_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('content_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_code', sa.String(), nullable=True),
        sa.Column('previous_state', sa.String(), nullable=True),
        sa.Column('new_state', sa.String(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['content_item_id'], ['content_items.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_content_item_state_logs_content_item_id'), 'content_item_state_logs', ['content_item_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_content_item_state_logs_content_item_id'), table_name='content_item_state_logs')
    op.drop_table('content_item_state_logs')
