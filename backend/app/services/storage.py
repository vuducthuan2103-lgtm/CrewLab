from supabase import create_client, Client
from app.core.db import settings
import logging

logger = logging.getLogger(__name__)

supabase_client: Client | None = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("SUPABASE_URL or SUPABASE_KEY is missing. Storage features will be disabled.")

BRAND_ASSETS_BUCKET = "brand-assets"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 50 * 1024 * 1024


def get_public_url(bucket_name: str, path: str) -> str:
    """Gets the public URL for a file in Supabase storage."""
    if not supabase_client:
        return ""
    try:
        res = supabase_client.storage.from_(bucket_name).get_public_url(path)
        return res
    except Exception as e:
        logger.error(f"Error getting public URL from Supabase: {e}")
        return ""


def get_signed_url(bucket_name: str, path: str, expires_in: int = 300) -> str:
    """Creates a temporary signed URL for private files in Supabase storage."""
    if not supabase_client:
        return ""
    try:
        res = supabase_client.storage.from_(bucket_name).create_signed_url(path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl") or ""
        return getattr(res, "signed_url", str(res))
    except Exception as e:
        logger.error(f"Error getting signed URL from Supabase for path={path}: {e}")
        return ""

def upload_file(bucket_name: str, path: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> bool:
    """Uploads a file to Supabase storage."""
    if not supabase_client:
        return False
    try:
        supabase_client.storage.from_(bucket_name).upload(
            path,
            file_bytes,
            file_options={"content-type": content_type}
        )
        return True
    except Exception as e:
        logger.error(f"Error uploading file to Supabase: {e}")
        return False


def client_asset_path(client_id: str, asset_id: str, content_type: str, asset_request_id: str | None = None) -> str:
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
    if asset_request_id:
        return f"{client_id}/requests/{asset_request_id}/{asset_id}.{extension}"
    return f"{client_id}/originals/{asset_id}.{extension}"
