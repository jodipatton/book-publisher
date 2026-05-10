from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven config for the backend.

    All vars are prefixed BSC_ (Bedtime Storybook Companion). Sourced from the
    environment at process start. See docker-compose.yml for the local-dev
    values; in production these come from secret managers per NFR-3.
    """

    model_config = SettingsConfigDict(env_prefix="BSC_", case_sensitive=False)

    # Postgres (asyncpg driver). Format: postgresql+asyncpg://user:pass@host:port/db
    database_url: str = "postgresql+asyncpg://bsc:bsc_dev@localhost:5432/bsc"

    # Redis. Used for session-state caching + rate limiting per PRD §Tech Architecture.
    redis_url: str = "redis://localhost:6379/0"

    # S3 / MinIO. Used to store generated storybook page illustrations.
    s3_endpoint: str | None = "http://localhost:9000"
    s3_access_key: str = "bsc_minio"
    s3_secret_key: str = "bsc_minio_dev"
    s3_bucket: str = "storybook-pages"
    s3_region: str = "us-east-1"

    # Dev-only stub auth. When true, the API trusts an X-Parent-Id header
    # without verifying it. Real Sign in with Apple + COPPA verifiable
    # parental consent (NFR-2, NFR-3) replace this for production.
    dev_auth_enabled: bool = True

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
