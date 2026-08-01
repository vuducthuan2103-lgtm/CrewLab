import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.assets import BrandAsset, AssetRequest

async def save_uploaded_asset(
    session: AsyncSession,
    client_id: uuid.UUID,
    url: str,
    file_name: str,
    asset_type: Optional[str] = None,
    source: str = "portal",
    asset_request_id: Optional[uuid.UUID] = None,
    tags: Optional[List[str]] = None
) -> BrandAsset:
    """
    Saves metadata for an asset that has been uploaded to Supabase Storage (usually by the frontend).
    If asset_request_id is provided, it marks the status as 'pending_review', otherwise 'approved'.
    """
    
    status = "pending_review" if asset_request_id else "approved"
    
    new_asset = BrandAsset(
        client_id=client_id,
        url=url,
        file_name=file_name,
        asset_type=asset_type,
        source=source,
        asset_request_id=asset_request_id,
        tags=tags or [],
        status=status
    )
    
    session.add(new_asset)
    
    # If this asset fulfills a request, we might want to check and update the request status
    # but for now we just link it.
    
    await session.commit()
    await session.refresh(new_asset)
    
    return new_asset
