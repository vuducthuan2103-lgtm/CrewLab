"""Validation and persistence helpers for immutable media-library uploads."""
from dataclasses import dataclass
from io import BytesIO
import uuid
import warnings
from typing import Optional

from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assets import BrandAsset


MIN_D02_IMAGE_SIDE = 320
MAX_DECODED_IMAGE_PIXELS = 50_000_000
_FORMAT_TO_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class ImageUploadValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ImageUploadInspection:
    width: int
    height: int
    image_format: str
    content_type: str

    @property
    def dimensions(self) -> str:
        return f"{self.width}x{self.height}"

    @property
    def is_d02_resolution(self) -> bool:
        return min(self.width, self.height) >= MIN_D02_IMAGE_SIDE


def inspect_image_upload(
    file_bytes: bytes, declared_content_type: str | None = None
) -> ImageUploadInspection:
    """Decode enough of an image to reject corrupt, spoofed and decompression-bomb files."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(file_bytes)) as image:
                image.verify()
            with Image.open(BytesIO(file_bytes)) as image:
                width, height = image.size
                image_format = (image.format or "").upper()
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageUploadValidationError(
            "invalid_image_data", "The uploaded file is not a readable safe image"
        ) from exc

    actual_content_type = _FORMAT_TO_MIME.get(image_format)
    if actual_content_type is None or (
        declared_content_type is not None and actual_content_type != declared_content_type
    ):
        raise ImageUploadValidationError(
            "image_type_mismatch", "The image bytes do not match the declared file type"
        )
    if width <= 0 or height <= 0 or width * height > MAX_DECODED_IMAGE_PIXELS:
        raise ImageUploadValidationError(
            "invalid_image_dimensions", "The decoded image dimensions are not supported"
        )
    return ImageUploadInspection(
        width=width,
        height=height,
        image_format=image_format,
        content_type=actual_content_type,
    )


async def find_duplicate_source(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    content_sha256: str,
) -> BrandAsset | None:
    """Exact-byte dedupe is deliberately tenant-local and source-only."""
    return await session.scalar(
        select(BrandAsset).where(
            BrandAsset.client_id == client_id,
            BrandAsset.content_sha256 == content_sha256,
            BrandAsset.source_asset_id.is_(None),
            BrandAsset.source.in_(("client_uploaded", "real_photo", "portal")),
        )
    )


async def save_uploaded_asset(
    session: AsyncSession,
    client_id: uuid.UUID,
    url: str,
    file_name: str,
    asset_type: Optional[str] = None,
    source: str = "portal",
    tags: Optional[list[str]] = None,
) -> BrandAsset:
    """Store an upload as an independent source awaiting normal review/indexing."""
    asset = BrandAsset(
        client_id=client_id,
        url=url,
        file_name=file_name,
        asset_type=asset_type,
        source=source,
        tags=tags or [],
        status="pending_review",
    )
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset
