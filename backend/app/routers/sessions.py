import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.provider import (
    CompanionReplyInput,
    StorybookInput,
    TurnInput,
    get_provider,
)
from app.auth import CurrentParent
from app.db import get_db
from app.models.child import ChildProfile
from app.models.mood_entry import MoodEntry
from app.models.page import StorybookPage
from app.models.persona import Persona
from app.models.safety_event import SafetyEvent
from app.models.session_record import Session
from app.models.storybook import Storybook
from app.models.turn import Turn
from app.safety import classify, conversation_starters, max_zone
from app.schemas.common import (
    CompanionReplyOut,
    SessionCreate,
    SessionOut,
    StorybookOut,
    TurnIn,
    TurnOut,
)

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])


async def _get_owned_child(child_id: uuid.UUID, parent, db: AsyncSession) -> ChildProfile:
    child = await db.get(ChildProfile, child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="child not found")
    return child


async def _get_owned_session(session_id: uuid.UUID, parent, db: AsyncSession) -> Session:
    res = await db.execute(
        select(Session).options(selectinload(Session.turns), selectinload(Session.child)).where(Session.id == session_id)
    )
    sess = res.scalar_one_or_none()
    if sess is None or sess.child.parent_id != parent.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return sess


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> Session:
    child = await _get_owned_child(payload.child_id, parent, db)

    sess = Session(
        child_id=child.id,
        persona_id=payload.persona_id,
        mood=payload.mood,
    )
    db.add(sess)
    await db.flush()

    # MoodEntry for longitudinal pattern detection (PRD §Data Model).
    db.add(MoodEntry(child_id=child.id, session_id=sess.id, mood=payload.mood))

    # Companion opener turn.
    persona = await db.get(Persona, payload.persona_id)
    if persona is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown persona")

    provider = get_provider()
    opener = await provider.companion_reply(
        CompanionReplyInput(
            persona_id=persona.id,
            persona_emoji=persona.emoji,
            persona_display_name=persona.display_name,
            child_display_name=child.display_name,
            child_age_years=child.age_years,
            mood=payload.mood,
            history=[],
            latest_child_text="",
        )
    )
    db.add(Turn(session_id=sess.id, speaker="companion", text=opener))

    await db.commit()
    await db.refresh(sess)

    res = await db.execute(
        select(Session).options(selectinload(Session.turns)).where(Session.id == sess.id)
    )
    return res.scalar_one()


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> Session:
    return await _get_owned_session(session_id, parent, db)


@router.post("/{session_id}/turns", response_model=CompanionReplyOut)
async def append_child_turn(
    session_id: uuid.UUID,
    payload: TurnIn,
    parent: CurrentParent,
    db: AsyncSession = Depends(get_db),
) -> CompanionReplyOut:
    """Child sends a turn; server runs safety classification, persists the
    child turn, asks the AI provider for a reply, persists that, and returns
    both turns plus the safety classification.

    On red-zone, the companion reply is overridden with the F-10 in-persona
    "someone who loves you is going to help" line and a SafetyEvent is
    created with conversation starters and parent_notified_at set NOW
    (real product also fires push/email/SMS — stubbed here).
    """
    sess = await _get_owned_session(session_id, parent, db)
    persona = await db.get(Persona, sess.persona_id)
    if persona is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown persona")

    signal = classify(payload.text)
    child_turn = Turn(
        session_id=sess.id,
        speaker="child",
        text=payload.text,
        safety_zone=signal.zone,
    )
    db.add(child_turn)
    sess.highest_safety_zone = max_zone(sess.highest_safety_zone, signal.zone)  # type: ignore[arg-type]
    await db.flush()

    if signal.zone == "red":
        reply_text = (
            f"{persona.emoji} {sess.child.display_name}, what you said matters a lot. "
            "I am going to make sure someone who loves you knows, so they can help. "
            "You are not in trouble. I am right here."
        )
        starters = conversation_starters(signal.reason or "", sess.child.display_name)
        db.add(
            SafetyEvent(
                session_id=sess.id,
                zone="red",
                reason=signal.reason or "red-zone threshold",
                triggering_text=payload.text,
                conversation_starters=starters,
                parent_notified_at=datetime.now(timezone.utc),
                child_disclosed_at=datetime.now(timezone.utc),
            )
        )
    else:
        provider = get_provider()
        # Reload turns so the AI has the up-to-date history.
        await db.refresh(sess, attribute_names=["turns"])
        history = [TurnInput(speaker=t.speaker, text=t.text) for t in sess.turns]  # type: ignore[arg-type]
        reply_text = await provider.companion_reply(
            CompanionReplyInput(
                persona_id=persona.id,
                persona_emoji=persona.emoji,
                persona_display_name=persona.display_name,
                child_display_name=sess.child.display_name,
                child_age_years=sess.child.age_years,
                mood=sess.mood,
                history=history,
                latest_child_text=payload.text,
            )
        )

    companion_turn = Turn(session_id=sess.id, speaker="companion", text=reply_text)
    db.add(companion_turn)
    await db.commit()
    await db.refresh(child_turn)
    await db.refresh(companion_turn)

    return CompanionReplyOut(
        child_turn=TurnOut.model_validate(child_turn),
        companion_turn=TurnOut.model_validate(companion_turn),
        safety_zone=signal.zone,
        safety_reason=signal.reason,
    )


@router.post("/{session_id}/storybook", response_model=StorybookOut, status_code=status.HTTP_201_CREATED)
async def generate_storybook(
    session_id: uuid.UUID, parent: CurrentParent, db: AsyncSession = Depends(get_db)
) -> Storybook:
    sess = await _get_owned_session(session_id, parent, db)
    if sess.storybook_id is not None:
        # Idempotent: return the existing book if the client retries.
        existing = await db.get(Storybook, sess.storybook_id)
        if existing is not None:
            await db.refresh(existing, attribute_names=["pages"])
            return existing

    persona = await db.get(Persona, sess.persona_id)
    if persona is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown persona")

    provider = get_provider()
    turns = [TurnInput(speaker=t.speaker, text=t.text) for t in sess.turns]  # type: ignore[arg-type]
    draft = await provider.generate_storybook(
        StorybookInput(
            persona_id=persona.id,
            persona_display_name=persona.display_name,
            child_display_name=sess.child.display_name,
            child_age_years=sess.child.age_years,
            mood=sess.mood,
            turns=turns,
        )
    )

    # Final transcript-wide safety pass (matches client behavior).
    transcript = " \n ".join(t.text for t in turns if t.speaker == "child")
    final_signal = classify(transcript)
    overall_zone = max_zone(sess.highest_safety_zone, final_signal.zone)  # type: ignore[arg-type]

    book = Storybook(
        child_id=sess.child_id,
        title=draft.title,
        persona_id=persona.id,
        mood=sess.mood,
        child_author_name=sess.child.display_name,
        shared_with=[],
        viewed_by={},
        safety_override_zone=final_signal.zone if overall_zone == "red" else None,
        safety_override_reason=(final_signal.reason if overall_zone == "red" else None),
    )
    db.add(book)
    await db.flush()

    for i, p in enumerate(draft.pages):
        db.add(
            StorybookPage(
                storybook_id=book.id,
                page_order=i,
                text=p.text,
                image_prompt=p.image_prompt,
                illustration_emoji=p.illustration_emoji,
                illustration_bg=p.illustration_bg,
            )
        )

    sess.storybook_id = book.id

    if overall_zone == "red":
        starters = conversation_starters(final_signal.reason or "", sess.child.display_name)
        db.add(
            SafetyEvent(
                session_id=sess.id,
                storybook_id=book.id,
                zone="red",
                reason=final_signal.reason or "red-zone threshold (transcript)",
                triggering_text=transcript[:1000] if transcript else None,
                conversation_starters=starters,
                parent_notified_at=datetime.now(timezone.utc),
                child_disclosed_at=datetime.now(timezone.utc),
            )
        )

    # F-11 amber-session counter on the child profile.
    if overall_zone == "amber":
        sess.child.consecutive_amber_sessions += 1
    elif overall_zone == "green":
        sess.child.consecutive_amber_sessions = 0

    await db.commit()
    await db.refresh(book, attribute_names=["pages"])
    return book
