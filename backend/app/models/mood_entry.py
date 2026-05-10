from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.session_record import Session


class MoodEntry(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — MoodEntry.

    Lightweight record linked to ChildProfile and Session. Emoji selection,
    timestamp, optional post-conversation mood. Powers longitudinal pattern
    detection feeding the safety system.
    """

    __tablename__ = "mood_entries"

    child_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True
    )
    mood: Mapped[str] = mapped_column(String(32), nullable=False)
    post_session_mood: Mapped[str | None] = mapped_column(String(32), nullable=True)

    session: Mapped["Session | None"] = relationship(back_populates="mood_entries")
