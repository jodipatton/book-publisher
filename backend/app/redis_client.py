from redis.asyncio import Redis

from app.config import get_settings

_settings = get_settings()
redis: Redis = Redis.from_url(_settings.redis_url, decode_responses=True)


async def ping_redis() -> bool:
    return bool(await redis.ping())
