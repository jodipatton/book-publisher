from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.page import StorybookPage


class Storybook(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — Storybook.

    Output artifact of a session. Title, sequence of Pages, sharing status
    (a list of TrustedCircleMember ids the child chose to share with),
    metadata on which trusted circle members have viewed it.
    """

    __tablename__ = "storybooks"

    child_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(280), nullable=False)
    persona_id: Mapped[str] = mapped_column(String(64), nullable=False)
    mood: Mapped[str] = mapped_column(String(32), nullable=False)
    child_author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    shared_with: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    viewed_by: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    safety_override_zone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    safety_override_reason: Mapped[str | None] = mapped_column(String(280), nullable=True)

    pages: Mapped[list["StorybookPage"]] = relationship(
        back_populates="storybook",
        cascade="all, delete-orphan",
        order_by="StorybookPage.page_order",
    )
