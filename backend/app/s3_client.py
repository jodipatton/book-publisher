"""Thin sync boto3 wrapper for the storybook-pages bucket.

Production will likely move to aioboto3, but for the scaffold we run boto3
in a thread pool when called from FastAPI handlers — image upload is rare
and not hot-path. The MinIO endpoint is S3-compatible, so the same code path
works for AWS S3 in prod by changing the env vars.
"""

from __future__ import annotations

from functools import lru_cache

import boto3
from botocore.client import Config

from app.config import get_settings


@lru_cache
def get_s3_client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4"),
    )


def public_url(key: str) -> str:
    s = get_settings()
    if s.s3_endpoint:
        # MinIO local path-style URL.
        return f"{s.s3_endpoint}/{s.s3_bucket}/{key}"
    return f"https://{s.s3_bucket}.s3.{s.s3_region}.amazonaws.com/{key}"
