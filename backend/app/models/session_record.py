from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.child import ChildProfile
    from app.models.mood_entry import MoodEntry
    from app.models.safety_event import SafetyEvent
    from app.models.storybook import Storybook
    from app.models.turn import Turn


class Session(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — Session.

    One nightly interaction. Mood, persona, conversation transcript (turns),
    collaborative-mode flag, link to generated storybook, highest safety
    zone observed across the session.
    """

    __tablename__ = "sessions"

    child_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), index=True
    )
    persona_id: Mapped[str] = mapped_column(String(64), nullable=False)
    mood: Mapped[str] = mapped_column(String(32), nullable=False)
    collaborative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    highest_safety_zone: Mapped[str] = mapped_column(String(16), default="green", nullable=False)
    storybook_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("storybooks.id", ondelete="SET NULL"), nullable=True
    )

    child: Mapped["ChildProfile"] = relationship(back_populates="sessions")
    turns: Mapped[list["Turn"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="Turn.created_at"
    )
    storybook: Mapped["Storybook | None"] = relationship(
        foreign_keys=[storybook_id], post_update=True
    )
    mood_entries: Mapped[list["MoodEntry"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    safety_events: Mapped[list["SafetyEvent"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
