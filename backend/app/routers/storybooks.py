import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import CurrentParent
from app.db import get_db
from app.models.child import ChildProfile
from app.models.storybook import Storybook
from app.models.trusted_circle import TrustedCircleMember
from app.schemas.common import StorybookOut, StorybookShareUpdate

router = APIRouter(prefix="/v1/storybooks", tags=["storybooks"])


async def _children_owned_by(parent_id: uuid.UUID, db: AsyncSession) -> list[uuid.UUID]:
    res = await db.execute(select(ChildProfile.id).where(ChildProfile.parent_id == parent_id))
    return [r[0] for r in res.all()]


@router.get("", response_model=list[StorybookOut])
async def list_storybooks(parent: CurrentParent, db: AsyncSession = Depends(get_db)) -> list[Storybook]:
    child_ids = await _children_owned_by(parent.id, db)
    if not child_ids:
        return []
    res = await db.execute(
        select(Storybook)
        .options(selectinload(Storybook.pages))
        .where(Storybook.child_id.in_(child_ids))
        .order_by(Storybook.created_at.desc())
    )
    return list(res.scalars())


async def _get_owned_storybook(book_id: uuid.UUID, parent, db: AsyncSession) -> Storybook:
    res = await db.execute(
        select(Storybook).options(selectinload(Storybook.pages)).where(Storybook.id == book_id)
    )
    book = res.scalar_one_or_none()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="storybook not found")
    child = await db.get(ChildProfile, book.child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="storybook not found")
    return book


@router.get("/{book_id}", response_model=StorybookOut)
async def get_storybook(
    book_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> Storybook:
    return await _get_owned_storybook(book_id, parent, db)


@router.patch("/{book_id}/share", response_model=StorybookOut)
async def update_share(
    book_id: uuid.UUID,
    payload: StorybookShareUpdate,
    parent: CurrentParent,
    db: AsyncSession = Depends(get_db),
) -> Storybook:
    book = await _get_owned_storybook(book_id, parent, db)

    # Validate every recipient is in this parent's trusted circle.
    res = await db.execute(
        select(TrustedCircleMember.id).where(TrustedCircleMember.parent_id == parent.id)
    )
    allowed = {r[0] for r in res.all()}
    requested = set(payload.shared_with)
    if not requested.issubset(allowed):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="all recipients must be in the parent's trusted circle",
        )

    book.shared_with = [str(rid) for rid in payload.shared_with]
    await db.commit()
    await db.refresh(book, attribute_names=["pages"])
    return book
