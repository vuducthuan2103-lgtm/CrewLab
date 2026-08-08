"""add brand asset fields and storage

Revision ID: 0002_add_brand_assets
Revises: 0002_add_schedule_config
Create Date: 2026-07-27 20:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0002_add_brand_assets'
down_revision: Union[str, None] = '0002_add_schedule_config'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update brand_assets table
    op.add_column('brand_assets', sa.Column('storage_path', sa.String(), server_default="", nullable=False))
    op.add_column('brand_assets', sa.Column('format', sa.String(), nullable=True))
    op.add_column('brand_assets', sa.Column('usage_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('brand_assets', sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True))
    # Update default status
    op.alter_column('brand_assets', 'status',
               existing_type=sa.VARCHAR(),
               server_default='pending_review')

    # 2. Setup Supabase Storage
    op.execute(
        "INSERT INTO storage.buckets (id, name, public) "
        "VALUES ('brand_assets', 'brand_assets', false) "
        "ON CONFLICT (id) DO NOTHING"
    )
    op.execute(
        'DROP POLICY IF EXISTS "CrewLab service role manages brand assets" '
        "ON storage.objects"
    )
    op.execute(
        'CREATE POLICY "CrewLab service role manages brand assets" ON storage.objects '
        "FOR ALL TO service_role USING (bucket_id = 'brand_assets') "
        "WITH CHECK (bucket_id = 'brand_assets')"
    )


def downgrade() -> None:
    op.drop_column('brand_assets', 'last_used_at')
    op.drop_column('brand_assets', 'usage_count')
    op.drop_column('brand_assets', 'format')
    op.drop_column('brand_assets', 'storage_path')
    
    op.alter_column('brand_assets', 'status',
               existing_type=sa.VARCHAR(),
               server_default='approved')

    op.execute("""
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Service Role Access" ON storage.objects;
    DELETE FROM storage.buckets WHERE id = 'brand_assets';
    """)
