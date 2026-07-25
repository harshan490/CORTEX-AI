"""Tests for meeting processing flow.

Tests against the running backend server at localhost:8000.
Requires: backend running, postgres running.
"""
import pytest
import httpx

BASE_URL = "http://localhost:8000"


@pytest.fixture(scope="module")
def auth_token():
    """Register or login a test user and return the token."""
    with httpx.Client(base_url=BASE_URL) as client:
        res = client.post("/api/auth/register", json={
            "email": "pytest-proc2@cortex.dev",
            "name": "Pytest User",
            "password": "testpass123",
        })
        if res.status_code in (400, 409):
            res = client.post("/api/auth/login", json={
                "email": "pytest-proc2@cortex.dev",
                "password": "testpass123",
            })
        assert res.status_code in (200, 201), f"Auth failed: {res.text}"
        return res.json()["access_token"]


def _headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def _create_meeting(client: httpx.Client, token: str, title: str) -> str:
    res = client.post("/api/meetings/", json={
        "title": title,
        "date": "2026-07-25T10:00:00Z",
    }, headers=_headers(token))
    assert res.status_code == 201
    return res.json()["id"]


def _upload_transcript(client: httpx.Client, token: str, meeting_id: str, segments: list):
    res = client.post(
        f"/api/meetings/{meeting_id}/transcript",
        json={"segments": segments},
        headers=_headers(token),
    )
    assert res.status_code == 200
    return res


# Test 8: Backend rejects processing without transcript
def test_process_without_transcript_returns_400(auth_token: str):
    with httpx.Client(base_url=BASE_URL) as client:
        meeting_id = _create_meeting(client, auth_token, "Empty Meeting Test")
        res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(auth_token))
        assert res.status_code == 400
        assert "transcript" in res.json()["detail"].lower()


# Test: Transcript persisted
def test_transcript_persisted(auth_token: str):
    with httpx.Client(base_url=BASE_URL) as client:
        meeting_id = _create_meeting(client, auth_token, "Transcript Test")
        _upload_transcript(client, auth_token, meeting_id, [
            {"speaker": "Sarah", "text": "Beta on August 5.", "start": 0, "end": 5},
            {"speaker": "Marcus", "text": "Checklist by August 2.", "start": 5, "end": 10},
        ])

        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        assert res.status_code == 200
        meeting = res.json()
        assert meeting["transcript"] is not None
        assert len(meeting["transcript"]["segments"]) == 2
        assert meeting["transcript"]["segments"][0]["speaker"] == "Sarah"


# Test 9: Processing succeeds and sets awaiting_review
def test_process_with_transcript_succeeds(auth_token: str):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        meeting_id = _create_meeting(client, auth_token, "Process Test")
        _upload_transcript(client, auth_token, meeting_id, [
            {"speaker": "Sarah", "text": "Release beta August 5.", "start": 0, "end": 5},
            {"speaker": "Marcus", "text": "Checklist ready.", "start": 5, "end": 10},
            {"speaker": "Priya", "text": "Security review needed.", "start": 10, "end": 15},
        ])

        res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(auth_token))
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "awaiting_review"

        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        meeting = res.json()
        assert meeting["status"] == "awaiting_review"
        assert meeting["summary"] is not None
        assert len(meeting["summary"]) > 0
        assert meeting["action_item_count"] > 0
        assert meeting["decision_count"] > 0


# Test 11: Reprocessing does not duplicate
def test_reprocessing_idempotent(auth_token: str):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        meeting_id = _create_meeting(client, auth_token, "Idempotent Test")
        _upload_transcript(client, auth_token, meeting_id, [
            {"speaker": "A", "text": "Do thing one.", "start": 0, "end": 5},
            {"speaker": "B", "text": "Do thing two.", "start": 5, "end": 10},
        ])

        # Process first time
        res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(auth_token))
        assert res.status_code == 200

        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        first_ai = res.json()["action_item_count"]
        first_dc = res.json()["decision_count"]

        # Process second time
        res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(auth_token))
        assert res.status_code == 200

        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        assert res.json()["action_item_count"] == first_ai
        assert res.json()["decision_count"] == first_dc


# Test: Status transitions
def test_status_transitions(auth_token: str):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        meeting_id = _create_meeting(client, auth_token, "Status Test")

        # Before processing: scheduled
        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        assert res.json()["status"] == "scheduled"

        # Upload transcript
        _upload_transcript(client, auth_token, meeting_id, [
            {"speaker": "X", "text": "Test.", "start": 0, "end": 5},
        ])

        # After processing: awaiting_review
        res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(auth_token))
        assert res.status_code == 200

        res = client.get(f"/api/meetings/{meeting_id}", headers=_headers(auth_token))
        assert res.json()["status"] == "awaiting_review"
