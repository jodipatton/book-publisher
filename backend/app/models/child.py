from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.parent import ParentAccount
    from app.models.session_record import Session


class ChildProfile(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — ChildProfile.

    Linked to ParentAccount. First name, age, persona selection, reading
    level (0..1 within band), session time limit (F-18), and the
    consecutive-amber counter that elevates to clinical-advisory review
    at >=5 (F-11).
    """

    __tablename__ = "child_profiles"

    parent_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("parent_accounts.id", ondelete="CASCADE"), index=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    age_years: Mapped[int] = mapped_column(Integer, nullable=False)  # 5..10
    persona_id: Mapped[str] = mapped_column(String(64), nullable=False, default="dog")
    reading_level: Mapped[float] = mapped_column(default=0.0)
    session_time_limit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    consecutive_amber_sessions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    parent: Mapped["ParentAccount"] = relationship(back_populates="children")
    sessions: Mapped[list["Session"]] = relationship(
        back_populates="child", cascade="all, delete-orphan"
    )
