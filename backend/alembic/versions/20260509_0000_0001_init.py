"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-05-09

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_init"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "parent_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "personas",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("short_description", sa.String(280), nullable=False),
        sa.Column("emoji", sa.String(8), nullable=False),
        sa.Column("palette_hex", sa.String(9), nullable=False),
        sa.Column("voice_traits", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("visual_reference_prompt", sa.String(2000), nullable=True),
        sa.Column("tone_adaptation", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "child_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("parent_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("age_years", sa.Integer(), nullable=False),
        sa.Column("persona_id", sa.String(64), nullable=False, server_default="dog"),
        sa.Column("reading_level", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("session_time_limit_minutes", sa.Integer(), nullable=True),
        sa.Column("consecutive_amber_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_child_profiles_parent_id", "child_profiles", ["parent_id"])

    op.create_table(
        "trusted_circle_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("parent_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("relationship_label", sa.String(64), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("receives_safety_alerts", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trusted_circle_members_parent_id", "trusted_circle_members", ["parent_id"])

    op.create_table(
        "storybooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(280), nullable=False),
        sa.Column("persona_id", sa.String(64), nullable=False),
        sa.Column("mood", sa.String(32), nullable=False),
        sa.Column("child_author_name", sa.String(120), nullable=False),
        sa.Column("shared_with", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("viewed_by", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("safety_override_zone", sa.String(16), nullable=True),
        sa.Column("safety_override_reason", sa.String(280), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_storybooks_child_id", "storybooks", ["child_id"])

    op.create_table(
        "storybook_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("storybook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("storybooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_order", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("image_prompt", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(1024), nullable=True),
        sa.Column("illustration_emoji", sa.String(8), nullable=False),
        sa.Column("illustration_bg", sa.String(9), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_storybook_pages_storybook_id", "storybook_pages", ["storybook_id"])

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("persona_id", sa.String(64), nullable=False),
        sa.Column("mood", sa.String(32), nullable=False),
        sa.Column("collaborative", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("highest_safety_zone", sa.String(16), nullable=False, server_default="green"),
        sa.Column("storybook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("storybooks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sessions_child_id", "sessions", ["child_id"])

    op.create_table(
        "turns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("speaker", sa.String(16), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("safety_zone", sa.String(16), nullable=False, server_default="green"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_turns_session_id", "turns", ["session_id"])

    op.create_table(
        "safety_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storybook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("storybooks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("zone", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(280), nullable=False),
        sa.Column("triggering_text", sa.Text(), nullable=True),
        sa.Column("conversation_starters", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("parent_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("child_disclosed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_safety_events_session_id", "safety_events", ["session_id"])

    op.create_table(
        "mood_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mood", sa.String(32), nullable=False),
        sa.Column("post_session_mood", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_mood_entries_child_id", "mood_entries", ["child_id"])

    # Seed the curated personas (PRD F-2). Owl is the TBD-pending-clinical-advisory placeholder.
    op.execute(
        """
        INSERT INTO personas (id, display_name, short_description, emoji, palette_hex, voice_traits, tone_adaptation)
        VALUES
        ('dog', 'Biscuit the Dog', 'A loyal pup with floppy ears and a soft heart.', '🐶', '#F4B860',
         '["warm","playful","curious","gently brave"]'::jsonb, '{}'::jsonb),
        ('aunt', 'Auntie Wren', 'A friendly aunt who loves stories and tea.', '🧕', '#C58FD9',
         '["warm","attentive","unhurried","wise"]'::jsonb, '{}'::jsonb),
        ('plant', 'Fern the Plant', 'A tiny green friend who thinks in seasons.', '🌿', '#7FB77E',
         '["gentle","patient","observant","rooted"]'::jsonb, '{}'::jsonb),
        ('owl', 'Pip the Owl', 'A small owl who is full of questions. (placeholder — TBD)', '🦉', '#9CB4E0',
         '["curious","thoughtful","kind","a little silly"]'::jsonb, '{}'::jsonb);
        """
    )


def downgrade() -> None:
    op.drop_index("ix_mood_entries_child_id", table_name="mood_entries")
    op.drop_table("mood_entries")
    op.drop_index("ix_safety_events_session_id", table_name="safety_events")
    op.drop_table("safety_events")
    op.drop_index("ix_turns_session_id", table_name="turns")
    op.drop_table("turns")
    op.drop_index("ix_sessions_child_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_index("ix_storybook_pages_storybook_id", table_name="storybook_pages")
    op.drop_table("storybook_pages")
    op.drop_index("ix_storybooks_child_id", table_name="storybooks")
    op.drop_table("storybooks")
    op.drop_index("ix_trusted_circle_members_parent_id", table_name="trusted_circle_members")
    op.drop_table("trusted_circle_members")
    op.drop_index("ix_child_profiles_parent_id", table_name="child_profiles")
    op.drop_table("child_profiles")
    op.drop_table("personas")
    op.drop_table("parent_accounts")
