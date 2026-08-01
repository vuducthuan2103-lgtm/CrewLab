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
