from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.storybook import Storybook


class StorybookPage(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — Page.

    Belongs to a Storybook. Narrative text, illustration prompt used,
    generated image URL (S3 key resolved via app.s3_client.public_url),
    page order. The scaffold also persists an emoji-and-palette
    placeholder so the client can render even before real image gen
    is wired up.
    """

    __tablename__ = "storybook_pages"

    storybook_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("storybooks.id", ondelete="CASCADE"), index=True
    )
    page_order: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    image_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    illustration_emoji: Mapped[str] = mapped_column(String(8), nullable=False)
    illustration_bg: Mapped[str] = mapped_column(String(9), nullable=False)

    storybook: Mapped["Storybook"] = relationship(back_populates="pages")
