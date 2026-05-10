import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentParent
from app.db import get_db
from app.models.trusted_circle import TrustedCircleMember
from app.schemas.common import TrustedCircleMemberCreate, TrustedCircleMemberOut

router = APIRouter(prefix="/v1/trusted-circle", tags=["trusted-circle"])


@router.get("", response_model=list[TrustedCircleMemberOut])
async def list_members(parent: CurrentParent, db: AsyncSession = Depends(get_db)) -> list[TrustedCircleMember]:
    res = await db.execute(
        select(TrustedCircleMember).where(TrustedCircleMember.parent_id == parent.id).order_by(TrustedCircleMember.created_at)
    )
    return list(res.scalars())


@router.post("", response_model=TrustedCircleMemberOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    payload: TrustedCircleMemberCreate,
    parent: CurrentParent,
    db: AsyncSession = Depends(get_db),
) -> TrustedCircleMember:
    member = TrustedCircleMember(
        parent_id=parent.id,
        display_name=payload.display_name,
        relationship_label=payload.relationship_label,
        email=payload.email,
        receives_safety_alerts=payload.receives_safety_alerts,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    # F-15 production: send invitation email here, create lightweight account.
    # The scaffold only persists the member record.
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> None:
    member = await db.get(TrustedCircleMember, member_id)
    if member is None or member.parent_id != parent.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
    await db.delete(member)
    await db.commit()
