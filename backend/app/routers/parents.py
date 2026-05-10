from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentParent
from app.db import get_db
from app.models.parent import ParentAccount
from app.schemas.common import ParentCreate, ParentOut

router = APIRouter(prefix="/v1/parents", tags=["parents"])


@router.post("", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
async def create_parent(payload: ParentCreate, db: AsyncSession = Depends(get_db)) -> ParentAccount:
    """Bootstrap endpoint. Unauthenticated by design — see app/auth.py.
    Production replaces this with the F-1 verifiable-consent flow."""
    parent = ParentAccount(display_name=payload.display_name, email=payload.email)
    db.add(parent)
    await db.commit()
    await db.refresh(parent)
    return parent


@router.get("/me", response_model=ParentOut)
async def me(parent: CurrentParent) -> ParentAccount:
    return parent
