"""Dev-only stub auth.

In production this is replaced by Sign in with Apple (NFR-2) and the F-1
COPPA verifiable parental consent flow. For the scaffold the API trusts
an `X-Parent-Id` header. If `BSC_DEV_AUTH_ENABLED` is false, every
authenticated route returns 401.

Convenience: `POST /v1/parents` is the unauthenticated bootstrap that
returns a parent id to use as the X-Parent-Id header thereafter.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.parent import ParentAccount


async def current_parent(
    x_parent_id: Annotated[str | None, Header(alias="X-Parent-Id")] = None,
    db: AsyncSession = Depends(get_db),
) -> ParentAccount:
    settings = get_settings()
    if not settings.dev_auth_enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth disabled")
    if not x_parent_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing X-Parent-Id")
    try:
        pid = uuid.UUID(x_parent_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid X-Parent-Id") from e
    parent = await db.get(ParentAccount, pid)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="parent not found")
    return parent


CurrentParent = Annotated[ParentAccount, Depends(current_parent)]
