from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.redis_client import ping_redis
from app.routers import children, parents, personas, safety, sessions, storybooks, trusted_circle


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Best-effort Redis ping at boot; we don't fail startup on miss because
    # the scaffold tolerates Redis being unavailable for the basic flow.
    try:
        await ping_redis()
    except Exception:
        pass
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Bedtime Storybook Companion API",
        version="0.1.0",
        description="Backend for the iPad bedtime storybook companion (working title).",
        lifespan=lifespan,
    )

    # The Expo dev server runs on a different origin (localhost:8081) than
    # the API (localhost:8000). Open it up for local dev only — production
    # CORS policy must be tighter.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.dev_auth_enabled else [],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(parents.router)
    app.include_router(children.router)
    app.include_router(personas.router)
    app.include_router(trusted_circle.router)
    app.include_router(sessions.router)
    app.include_router(storybooks.router)
    app.include_router(safety.router)

    return app


app = create_app()
