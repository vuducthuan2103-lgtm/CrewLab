"""add schedule config to client

Revision ID: 0002_add_schedule_config
Revises: 0001_initial_schema
Create Date: 2026-07-26 01:03:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_add_schedule_config'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to clients table
    op.add_column('clients', sa.Column('schedule_frequency', sa.String(), server_default='weekly', nullable=False))
    op.add_column('clients', sa.Column('schedule_day', sa.Integer(), server_default='1', nullable=False))
    op.add_column('clients', sa.Column('schedule_time', sa.String(), server_default='08:00', nullable=False))


def downgrade() -> None:
    # Remove columns from clients table
    op.drop_column('clients', 'schedule_time')
    op.drop_column('clients', 'schedule_day')
    op.drop_column('clients', 'schedule_frequency')
