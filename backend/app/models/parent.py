from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.child import ChildProfile
    from app.models.trusted_circle import TrustedCircleMember


class ParentAccount(Base, UUIDMixin, TimestampMixin):
    """PRD §Data Model — ParentAccount.

    Authentication credentials, email, subscription status, consent records
    are scoped to this entity. The scaffold stores only display name and
    email; real auth and consent records arrive when Sign in with Apple
    (NFR-2) and the F-1 verifiable-consent flow are implemented.
    """

    __tablename__ = "parent_accounts"

    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    children: Mapped[list["ChildProfile"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    trusted_circle: Mapped[list["TrustedCircleMember"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
