from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.parent import ParentAccount


class TrustedCircleMember(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — TrustedCircleMember.

    Linked to ParentAccount. Per F-15 the production system also creates
    a lightweight account for the member with a view-only entitlement
    on shared storybooks; that account is not yet modeled.
    """

    __tablename__ = "trusted_circle_members"

    parent_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("parent_accounts.id", ondelete="CASCADE"), index=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    relationship_label: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    receives_safety_alerts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    parent: Mapped["ParentAccount"] = relationship(back_populates="trusted_circle")
