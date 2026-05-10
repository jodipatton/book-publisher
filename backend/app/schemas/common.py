from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

SafetyZone = Literal["green", "amber", "red"]
Mood = Literal["heart", "sunshine", "cloud", "storm"]
Speaker = Literal["child", "companion", "system"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- ParentAccount ---


class ParentCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None


class ParentOut(ORMModel):
    id: uuid.UUID
    display_name: str
    email: str | None
    created_at: datetime


# --- ChildProfile ---


class ChildCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    age_years: int = Field(ge=5, le=10)
    persona_id: str = "dog"
    session_time_limit_minutes: int | None = Field(default=15, ge=5, le=60)


class ChildUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    age_years: int | None = Field(default=None, ge=5, le=10)
    persona_id: str | None = None
    session_time_limit_minutes: int | None = Field(default=None, ge=5, le=60)


class ChildOut(ORMModel):
    id: uuid.UUID
    parent_id: uuid.UUID
    display_name: str
    age_years: int
    persona_id: str
    reading_level: float
    session_time_limit_minutes: int | None
    consecutive_amber_sessions: int
    created_at: datetime


# --- Persona ---


class PersonaOut(ORMModel):
    id: str
    display_name: str
    short_description: str
    emoji: str
    palette_hex: str
    voice_traits: list[str]


# --- TrustedCircleMember ---


class TrustedCircleMemberCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    relationship_label: str = Field(min_length=1, max_length=64)
    email: EmailStr
    receives_safety_alerts: bool = False


class TrustedCircleMemberOut(ORMModel):
    id: uuid.UUID
    parent_id: uuid.UUID
    display_name: str
    relationship_label: str
    email: str
    receives_safety_alerts: bool


# --- Session / Turn ---


class SessionCreate(BaseModel):
    child_id: uuid.UUID
    persona_id: str
    mood: Mood


class TurnIn(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


class TurnOut(ORMModel):
    id: uuid.UUID
    session_id: uuid.UUID
    speaker: Speaker
    text: str
    safety_zone: SafetyZone
    created_at: datetime


class CompanionReplyOut(BaseModel):
    child_turn: TurnOut
    companion_turn: TurnOut
    safety_zone: SafetyZone
    safety_reason: str | None = None


class SessionOut(ORMModel):
    id: uuid.UUID
    child_id: uuid.UUID
    persona_id: str
    mood: Mood
    collaborative: bool
    highest_safety_zone: SafetyZone
    storybook_id: uuid.UUID | None
    created_at: datetime
    turns: list[TurnOut] = []


# --- Storybook / Page ---


class StorybookPageOut(ORMModel):
    id: uuid.UUID
    page_order: int
    text: str
    image_prompt: str
    image_url: str | None
    illustration_emoji: str
    illustration_bg: str


class StorybookOut(ORMModel):
    id: uuid.UUID
    child_id: uuid.UUID
    title: str
    persona_id: str
    mood: Mood
    child_author_name: str
    shared_with: list[str]
    safety_override_zone: SafetyZone | None
    safety_override_reason: str | None
    created_at: datetime
    pages: list[StorybookPageOut] = []


class StorybookShareUpdate(BaseModel):
    shared_with: list[uuid.UUID]


# --- SafetyEvent ---


class SafetyEventOut(ORMModel):
    id: uuid.UUID
    session_id: uuid.UUID
    storybook_id: uuid.UUID | None
    zone: SafetyZone
    reason: str
    triggering_text: str | None
    conversation_starters: list[str]
    parent_notified_at: datetime | None
    child_disclosed_at: datetime | None
    acknowledged_at: datetime | None
    created_at: datetime


# --- MoodEntry ---


class MoodEntryOut(ORMModel):
    id: uuid.UUID
    child_id: uuid.UUID
    session_id: uuid.UUID | None
    mood: Mood
    post_session_mood: Mood | None
    created_at: datetime
