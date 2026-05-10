from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.persona import Persona
from app.schemas.common import PersonaOut

router = APIRouter(prefix="/v1/personas", tags=["personas"])


@router.get("", response_model=list[PersonaOut])
async def list_personas(db: AsyncSession = Depends(get_db)) -> list[Persona]:
    """Public-ish: persona catalog is not child-data and is read-only."""
    res = await db.execute(select(Persona).order_by(Persona.id))
    return list(res.scalars())
