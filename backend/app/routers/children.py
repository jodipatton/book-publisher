import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentParent
from app.db import get_db
from app.models.child import ChildProfile
from app.schemas.common import ChildCreate, ChildOut, ChildUpdate

router = APIRouter(prefix="/v1/children", tags=["children"])


@router.get("", response_model=list[ChildOut])
async def list_children(parent: CurrentParent, db: AsyncSession = Depends(get_db)) -> list[ChildProfile]:
    res = await db.execute(select(ChildProfile).where(ChildProfile.parent_id == parent.id))
    return list(res.scalars())


@router.post("", response_model=ChildOut, status_code=status.HTTP_201_CREATED)
async def create_child(
    payload: ChildCreate, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> ChildProfile:
    child = ChildProfile(
        parent_id=parent.id,
        display_name=payload.display_name,
        age_years=payload.age_years,
        persona_id=payload.persona_id,
        session_time_limit_minutes=payload.session_time_limit_minutes,
        # Crude initial reading-level estimate: linear in age within the band.
        reading_level=max(0.0, min(1.0, (payload.age_years - 5) / 5)),
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return child


async def _get_owned_child(child_id: uuid.UUID, parent, db: AsyncSession) -> ChildProfile:
    child = await db.get(ChildProfile, child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="child not found")
    return child


@router.get("/{child_id}", response_model=ChildOut)
async def get_child(
    child_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> ChildProfile:
    return await _get_owned_child(child_id, parent, db)


@router.patch("/{child_id}", response_model=ChildOut)
async def update_child(
    child_id: uuid.UUID,
    payload: ChildUpdate,
    parent: CurrentParent,
    db: AsyncSession = Depends(get_db),
) -> ChildProfile:
    child = await _get_owned_child(child_id, parent, db)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(child, k, v)
    await db.commit()
    await db.refresh(child)
    return child
