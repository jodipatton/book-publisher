from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.session_record import Session


class Turn(Base, UUIDMixin, TimestampMixin):
    """One conversation turn within a session.

    speaker: 'child' | 'companion' | 'system'.
    """

    __tablename__ = "turns"

    session_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    speaker: Mapped[str] = mapped_column(String(16), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    safety_zone: Mapped[str] = mapped_column(String(16), default="green", nullable=False)

    session: Mapped["Session"] = relationship(back_populates="turns")
