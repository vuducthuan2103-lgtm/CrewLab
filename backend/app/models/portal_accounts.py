import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from ..core.db import Base, utcnow


class ClientPortalAdmin(Base):
    """The first Portal administrator assigned to a client in Phase 1.

    The password is intentionally not represented in this model. Supabase Auth
    stores its password hash and this table only records the secure assignment.
    """

    __tablename__ = "client_portal_admins"
    __table_args__ = (
        UniqueConstraint("client_id", name="uq_client_portal_admins_client_id"),
        UniqueConstraint("auth_user_id", name="uq_client_portal_admins_auth_user_id"),
        UniqueConstraint("email", name="uq_client_portal_admins_email"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    auth_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    email = Column(String(320), nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
