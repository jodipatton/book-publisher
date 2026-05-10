from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.session_record import Session


class SafetyEvent(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — SafetyEvent.

    Created on safety threshold trigger. Trigger classification
    (zone + reason), triggering content (the offending turn text),
    timestamp, parent notification status, child disclosure status,
    AI-generated conversation starters delivered to parent.

    Per F-10, red-zone events MUST surface to the parent within 60s.
    The parent notification status (`parent_notified_at`) is the audit
    trail for that SLA.
    """

    __tablename__ = "safety_events"

    session_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    storybook_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("storybooks.id", ondelete="SET NULL"), nullable=True
    )

    zone: Mapped[str] = mapped_column(String(16), nullable=False)  # 'amber' | 'red'
    reason: Mapped[str] = mapped_column(String(280), nullable=False)
    triggering_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    conversation_starters: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    parent_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    child_disclosed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    session: Mapped["Session"] = relationship(back_populates="safety_events")
