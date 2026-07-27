"""add brand asset fields and storage

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-27 20:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update brand_assets table
    op.add_column('brand_assets', sa.Column('storage_path', sa.String(), server_default="", nullable=False))
    op.add_column('brand_assets', sa.Column('format', sa.String(), nullable=True))
    op.add_column('brand_assets', sa.Column('usage_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('brand_assets', sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('brand_assets', sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('brand_assets', sa.Column('campaign_restricted', sa.Boolean(), server_default='false', nullable=False))
    
    op.create_index(op.f('ix_brand_assets_campaign_id'), 'brand_assets', ['campaign_id'], unique=False)
    
    # Optional: adjust `url` to be nullable
    op.alter_column('brand_assets', 'url',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Update default status
    op.alter_column('brand_assets', 'status',
               existing_type=sa.VARCHAR(),
               server_default='pending_review')

    # 2. Setup Supabase Storage
    op.execute("""
    -- Ensure bucket exists
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('brand_assets', 'brand_assets', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
    
    -- Drop existing policies if any to prevent errors during re-runs
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Service Role Access" ON storage.objects;
    
    -- Create policies for storage.objects
    -- Allow public read access to brand_assets
    CREATE POLICY "Public Access" ON storage.objects 
    FOR SELECT USING ( bucket_id = 'brand_assets' );
    
    -- Allow service role to do everything
    CREATE POLICY "Service Role Access" ON storage.objects 
    FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_brand_assets_campaign_id'), table_name='brand_assets')
    op.drop_column('brand_assets', 'campaign_restricted')
    op.drop_column('brand_assets', 'campaign_id')
    op.drop_column('brand_assets', 'last_used_at')
    op.drop_column('brand_assets', 'usage_count')
    op.drop_column('brand_assets', 'format')
    op.drop_column('brand_assets', 'storage_path')
    
    op.alter_column('brand_assets', 'url',
               existing_type=sa.VARCHAR(),
               nullable=False)
               
    op.alter_column('brand_assets', 'status',
               existing_type=sa.VARCHAR(),
               server_default='approved')

    op.execute("""
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Service Role Access" ON storage.objects;
    DELETE FROM storage.buckets WHERE id = 'brand_assets';
    """)
