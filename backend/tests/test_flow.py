"""End-to-end smoke tests for the core flow.

Covers the unhappy-path the PRD cares about most — F-10 red-zone surface —
plus the green-path: parent setup → child profile → persona pick →
session → conversation → storybook → share.
"""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_personas_listed(client):
    r = await client.get("/v1/personas")
    assert r.status_code == 200
    ids = {p["id"] for p in r.json()}
    assert {"dog", "aunt"}.issubset(ids)


@pytest.mark.asyncio
async def test_full_green_flow(client, headers_for):
    # Parent setup (bootstrap).
    r = await client.post("/v1/parents", json={"display_name": "Jordan", "email": "j@example.com"})
    assert r.status_code == 201, r.text
    parent_id = r.json()["id"]
    h = headers_for(parent_id)

    # Add trusted-circle member.
    r = await client.post(
        "/v1/trusted-circle",
        headers=h,
        json={
            "display_name": "Aunt Jody",
            "relationship_label": "Aunt",
            "email": "jody@example.com",
            "receives_safety_alerts": False,
        },
    )
    assert r.status_code == 201, r.text
    member_id = r.json()["id"]

    # Create child profile.
    r = await client.post(
        "/v1/children",
        headers=h,
        json={"display_name": "Camille", "age_years": 7, "persona_id": "dog"},
    )
    assert r.status_code == 201, r.text
    child = r.json()
    child_id = child["id"]
    assert child["session_time_limit_minutes"] == 15

    # Create session with mood=sunshine (light tone).
    r = await client.post(
        "/v1/sessions",
        headers=h,
        json={"child_id": child_id, "persona_id": "dog", "mood": "sunshine"},
    )
    assert r.status_code == 201, r.text
    session = r.json()
    sid = session["id"]
    # Companion opener turn was created.
    assert any(t["speaker"] == "companion" for t in session["turns"])

    # Append a benign child turn.
    r = await client.post(
        f"/v1/sessions/{sid}/turns",
        headers=h,
        json={"text": "We caught a frog at the lake today!"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["safety_zone"] == "green"
    assert body["child_turn"]["speaker"] == "child"
    assert body["companion_turn"]["speaker"] == "companion"

    # Generate storybook — must produce 5..8 pages per F-5.
    r = await client.post(f"/v1/sessions/{sid}/storybook", headers=h)
    assert r.status_code == 201, r.text
    book = r.json()
    assert 5 <= len(book["pages"]) <= 8
    assert book["safety_override_zone"] is None

    # Share with the trusted circle member.
    r = await client.patch(
        f"/v1/storybooks/{book['id']}/share",
        headers=h,
        json={"shared_with": [member_id]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["shared_with"] == [member_id]

    # No red-zone events should exist for a happy-path session.
    r = await client.get("/v1/safety-events", headers=h)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_red_zone_surfaces_to_parent(client, headers_for):
    r = await client.post("/v1/parents", json={"display_name": "Jordan"})
    assert r.status_code == 201
    parent_id = r.json()["id"]
    h = headers_for(parent_id)

    r = await client.post(
        "/v1/children",
        headers=h,
        json={"display_name": "Camille", "age_years": 7, "persona_id": "dog"},
    )
    child_id = r.json()["id"]

    r = await client.post(
        "/v1/sessions",
        headers=h,
        json={"child_id": child_id, "persona_id": "dog", "mood": "cloud"},
    )
    sid = r.json()["id"]

    # Red-zone phrase. The companion reply must be the F-10 in-persona line,
    # and a SafetyEvent must surface to the parent immediately.
    r = await client.post(
        f"/v1/sessions/{sid}/turns",
        headers=h,
        json={"text": "I want to die"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["safety_zone"] == "red"
    assert "someone who loves you" in body["companion_turn"]["text"].lower()

    # Storybook generation still works and inherits the red override.
    r = await client.post(f"/v1/sessions/{sid}/storybook", headers=h)
    assert r.status_code == 201
    book = r.json()
    assert book["safety_override_zone"] == "red"

    # Parent dashboard surfaces the event with conversation starters and a
    # parent_notified_at timestamp (per F-10's 60s SLA).
    r = await client.get("/v1/safety-events", headers=h)
    assert r.status_code == 200
    events = r.json()
    assert len(events) >= 1
    ev = events[0]
    assert ev["zone"] == "red"
    assert ev["parent_notified_at"] is not None
    assert ev["child_disclosed_at"] is not None
    assert len(ev["conversation_starters"]) >= 1


@pytest.mark.asyncio
async def test_share_rejects_unknown_recipients(client, headers_for):
    """A child cannot share a book with someone outside the parent's circle."""
    r = await client.post("/v1/parents", json={"display_name": "Jordan"})
    parent_id = r.json()["id"]
    h = headers_for(parent_id)

    r = await client.post(
        "/v1/children",
        headers=h,
        json={"display_name": "Camille", "age_years": 7},
    )
    child_id = r.json()["id"]

    r = await client.post(
        "/v1/sessions",
        headers=h,
        json={"child_id": child_id, "persona_id": "dog", "mood": "sunshine"},
    )
    sid = r.json()["id"]
    r = await client.post(
        f"/v1/sessions/{sid}/turns",
        headers=h,
        json={"text": "Today was amazing!"},
    )
    assert r.status_code == 200
    r = await client.post(f"/v1/sessions/{sid}/storybook", headers=h)
    book_id = r.json()["id"]

    bogus = "00000000-0000-0000-0000-000000000001"
    r = await client.patch(
        f"/v1/storybooks/{book_id}/share",
        headers=h,
        json={"shared_with": [bogus]},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_auth_rejects_missing_header(client):
    r = await client.get("/v1/children")
    assert r.status_code == 401
