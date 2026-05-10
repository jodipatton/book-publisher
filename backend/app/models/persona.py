from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models._base import TimestampMixin


class Persona(Base, TimestampMixin):
    """PRD §Data Model — Persona.

    Template definition for each curated companion. Name, personality
    description, visual reference prompt for illustration consistency
    (F-6), conversation style parameters, tone-adaptation map keyed by
    Mood. The id is a stable string slug ("dog", "aunt", "plant", "owl")
    so the client and server agree without UUID translation.
    """

    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    short_description: Mapped[str] = mapped_column(String(280), nullable=False)
    emoji: Mapped[str] = mapped_column(String(8), nullable=False)
    palette_hex: Mapped[str] = mapped_column(String(9), nullable=False)
    voice_traits: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    visual_reference_prompt: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    tone_adaptation: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
