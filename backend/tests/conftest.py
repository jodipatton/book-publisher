"""Shared test fixtures.

Tests run against in-memory SQLite via aiosqlite so the suite does not
depend on a running Postgres. JSONB and UUID columns get DDL fallbacks
via @compiles so the schema can be created on SQLite; runtime values
use stdlib json (JSONB extends JSON) and string UUIDs.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles


@compiles(JSONB, "sqlite")  # type: ignore[misc]
def _jsonb_sqlite(_type, _compiler, **_kw) -> str:
    return "TEXT"


@compiles(PGUUID, "sqlite")  # type: ignore[misc]
def _uuid_sqlite(_type, _compiler, **_kw) -> str:
    return "CHAR(36)"


# PGUUID with as_uuid=True needs a bind_processor for SQLite that returns a
# string. Patch dialect_impl to fall through to the underlying CHAR(36).
_orig_pg_uuid_bind_processor = PGUUID.bind_processor


def _pg_uuid_bind_processor(self, dialect):  # type: ignore[no-untyped-def]
    if dialect.name == "sqlite":
        as_uuid = getattr(self, "as_uuid", False)

        def _proc(value):
            if value is None:
                return None
            if as_uuid and isinstance(value, uuid.UUID):
                return str(value)
            return str(value)

        return _proc
    return _orig_pg_uuid_bind_processor(self, dialect)


def _pg_uuid_result_processor(self, dialect, coltype):  # type: ignore[no-untyped-def]
    if dialect.name == "sqlite":
        as_uuid = getattr(self, "as_uuid", False)

        def _proc(value):
            if value is None:
                return None
            if as_uuid:
                return uuid.UUID(value) if not isinstance(value, uuid.UUID) else value
            return value

        return _proc
    return None


PGUUID.bind_processor = _pg_uuid_bind_processor  # type: ignore[assignment]
PGUUID.result_processor = _pg_uuid_result_processor  # type: ignore[assignment]


@pytest_asyncio.fixture
async def engine():
    from app.db import Base

    eng = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    # Force foreign-key enforcement on SQLite so the model relationships
    # behave like Postgres.
    @event.listens_for(eng.sync_engine, "connect")
    def _fk_on(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with eng.begin() as conn:
        from app import models  # noqa: F401

        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture
async def client(engine, db_session_factory) -> AsyncIterator[AsyncClient]:
    from app.db import get_db
    from app.main import app

    async def override_get_db():
        async with db_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    from app.models.persona import Persona

    async with db_session_factory() as s:
        s.add_all(
            [
                Persona(
                    id="dog",
                    display_name="Biscuit the Dog",
                    short_description="A loyal pup with floppy ears and a soft heart.",
                    emoji="🐶",
                    palette_hex="#F4B860",
                    voice_traits=["warm", "playful"],
                    tone_adaptation={},
                ),
                Persona(
                    id="aunt",
                    display_name="Auntie Wren",
                    short_description="A friendly aunt who loves stories and tea.",
                    emoji="🧕",
                    palette_hex="#C58FD9",
                    voice_traits=["warm", "attentive"],
                    tone_adaptation={},
                ),
            ]
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def headers_for():
    def _h(parent_id: str | uuid.UUID) -> dict[str, str]:
        return {"X-Parent-Id": str(parent_id)}

    return _h
