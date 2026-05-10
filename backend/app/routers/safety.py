import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentParent
from app.db import get_db
from app.models.child import ChildProfile
from app.models.safety_event import SafetyEvent
from app.models.session_record import Session
from app.schemas.common import SafetyEventOut

router = APIRouter(prefix="/v1/safety-events", tags=["safety"])


@router.get("", response_model=list[SafetyEventOut])
async def list_safety_events(
    parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> list[SafetyEvent]:
    """List red-zone events surfaced to this parent.

    Yellow / amber tracking is intentionally NOT exposed to the parent
    (PRD §NFR-1 sanctuary model). The clinical-advisory review queue
    consumes amber data on a separate, restricted surface that is not
    yet built (F-11).
    """
    res = await db.execute(
        select(SafetyEvent)
        .join(Session, SafetyEvent.session_id == Session.id)
        .join(ChildProfile, Session.child_id == ChildProfile.id)
        .where(ChildProfile.parent_id == parent.id)
        .where(SafetyEvent.zone == "red")
        .order_by(SafetyEvent.created_at.desc())
    )
    return list(res.scalars())


@router.post("/{event_id}/acknowledge", response_model=SafetyEventOut)
async def acknowledge(
    event_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> SafetyEvent:
    res = await db.execute(
        select(SafetyEvent)
        .join(Session, SafetyEvent.session_id == Session.id)
        .join(ChildProfile, Session.child_id == ChildProfile.id)
        .where(SafetyEvent.id == event_id)
        .where(ChildProfile.parent_id == parent.id)
    )
    event = res.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event not found")
    event.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event
