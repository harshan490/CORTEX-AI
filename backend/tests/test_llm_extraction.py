"""Tests for LLM-based meeting intelligence extraction.

Tests 1-14: Unit + integration tests against running backend.
Test 15: Opt-in real OpenAI integration test (requires OPENAI_API_KEY).
"""
import os
import pytest
import httpx

BASE_URL = "http://localhost:8000"

SAMPLE_TRANSCRIPT = [
    {"speaker": "Sarah", "text": "We will release the beta on August 5, 2026.", "start": 0, "end": 5},
    {"speaker": "Marcus", "text": "I will prepare the deployment checklist by August 2, 2026.", "start": 5, "end": 10},
    {"speaker": "Priya", "text": "The security review has no owner and must happen before deployment.", "start": 10, "end": 15},
    {"speaker": "Sarah", "text": "Marcus will run the authentication load test by August 1, 2026.", "start": 15, "end": 20},
    {"speaker": "James", "text": "I will update the documentation by August 3, 2026.", "start": 20, "end": 25},
    {"speaker": "Marcus", "text": "Deployment depends on the security review and load test.", "start": 25, "end": 30},
    {"speaker": "Sarah", "text": "No external action should happen without human approval.", "start": 30, "end": 35},
]


@pytest.fixture(scope="module")
def auth_token():
    with httpx.Client(base_url=BASE_URL) as client:
        res = client.post("/api/auth/register", json={
            "email": "llm-extraction-test@cortex.dev",
            "name": "LLM Test",
            "password": "testpass123",
        })
        if res.status_code in (400, 409):
            res = client.post("/api/auth/login", json={
                "email": "llm-extraction-test@cortex.dev",
                "password": "testpass123",
            })
        assert res.status_code in (200, 201)
        return res.json()["access_token"]


def _headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def _create_and_process(client, token, title, segments=None):
    """Helper to create, upload transcript, and process a meeting."""
    res = client.post("/api/meetings/", json={
        "title": title, "date": "2026-07-25T10:00:00Z",
    }, headers=_headers(token))
    assert res.status_code == 201
    meeting_id = res.json()["id"]

    segs = segments or SAMPLE_TRANSCRIPT
    res = client.post(
        f"/api/meetings/{meeting_id}/transcript",
        json={"segments": segs},
        headers=_headers(token),
    )
    assert res.status_code == 200

    res = client.post(f"/api/meetings/{meeting_id}/process", headers=_headers(token))
    assert res.status_code == 200
    return meeting_id, res.json()


# Test 1: MeetingIntelligence schema validates correctly
def test_schema_validation():
    from services.llm_schemas import MeetingIntelligence
    intel = MeetingIntelligence(summary="Test", overall_confidence=0.9)
    assert intel.summary == "Test"
    assert intel.overall_confidence == 0.9
    assert intel.participants == []
    assert intel.action_items == []


# Test 2: Mock mode extracts participants from transcript
def test_mock_extracts_participants():
    from services.llm import _build_mock_intelligence
    transcript = "Sarah: Hello\nMarcus: Hi\nPriya: Hey"
    intel = _build_mock_intelligence(transcript)
    names = [p.name for p in intel.participants]
    assert "Sarah" in names
    assert "Marcus" in names
    assert "Priya" in names


# Test 3: Mock mode extracts action items from action-like text
def test_mock_extracts_action_items():
    from services.llm import _build_mock_intelligence
    transcript = "Sarah: I will prepare the report.\nMarcus: We need to fix the bug."
    intel = _build_mock_intelligence(transcript)
    assert len(intel.action_items) >= 1
    titles = [a.title for a in intel.action_items]
    assert any("prepare" in t.lower() or "report" in t.lower() for t in titles)


# Test 4: Mock mode extracts risks
def test_mock_extracts_risks():
    from services.llm import _build_mock_intelligence
    transcript = "Priya: The security review has no owner and must happen."
    intel = _build_mock_intelligence(transcript)
    assert len(intel.risks) >= 1


# Test 5: Mock mode extracts dependencies
def test_mock_extracts_dependencies():
    from services.llm import _build_mock_intelligence
    transcript = "Marcus: Deployment depends on the security review."
    intel = _build_mock_intelligence(transcript)
    assert len(intel.dependencies) >= 1


# Test 6: Mock mode extracts clarifications for missing owners
def test_mock_extracts_clarifications():
    from services.llm import _build_mock_intelligence
    transcript = "Priya: The security review has no owner."
    intel = _build_mock_intelligence(transcript)
    assert len(intel.clarifications) >= 1


# Test 7: Participants are persisted and deduplicated
def test_participants_persisted_and_deduped(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Participant Dedup Test")

        res = client.get(f"/api/meetings/{mid}", headers=_headers(auth_token))
        m = res.json()
        names = [p["name"] for p in m["participants"]]
        # Sarah appears 3 times in transcript but should only be listed once
        assert names.count("Sarah") == 1
        assert "Marcus" in names
        assert "Priya" in names
        assert "James" in names


# Test 8: Risks are persisted via new endpoint
def test_risks_persisted(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Risk Persist Test")

        res = client.get(f"/api/meetings/{mid}/risks", headers=_headers(auth_token))
        assert res.status_code == 200
        risks = res.json()
        assert len(risks) > 0
        assert "title" in risks[0]
        assert "severity" in risks[0]
        assert "confidence" in risks[0]


# Test 9: Dependencies are persisted
def test_dependencies_persisted(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Dep Persist Test")

        res = client.get(f"/api/meetings/{mid}/dependencies", headers=_headers(auth_token))
        assert res.status_code == 200
        deps = res.json()
        assert len(deps) > 0
        assert "from_item" in deps[0]
        assert "to_item" in deps[0]


# Test 10: Clarifications are persisted
def test_clarifications_persisted(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Clar Persist Test")

        res = client.get(f"/api/meetings/{mid}/clarifications", headers=_headers(auth_token))
        assert res.status_code == 200
        clars = res.json()
        assert len(clars) > 0
        assert "question" in clars[0]
        assert clars[0]["status"] == "pending"


# Test 11: Processing confidence is set on meeting
def test_processing_confidence_set(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Confidence Test")

        res = client.get(f"/api/meetings/{mid}", headers=_headers(auth_token))
        m = res.json()
        assert m["processing_confidence"] is not None
        assert 0.0 < m["processing_confidence"] <= 1.0


# Test 12: MeetingResponse includes new counts
def test_response_includes_new_counts(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Count Test")

        res = client.get(f"/api/meetings/{mid}", headers=_headers(auth_token))
        m = res.json()
        assert "risk_count" in m
        assert "dependency_count" in m
        assert "clarification_count" in m
        assert m["risk_count"] >= 0
        assert m["dependency_count"] >= 0
        assert m["clarification_count"] >= 0


# Test 13: Reprocessing is idempotent (deletes old, inserts new)
def test_reprocessing_idempotent_with_new_data(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Idempotent New Test")

        res = client.get(f"/api/meetings/{mid}", headers=_headers(auth_token))
        first = res.json()
        first_risks = first["risk_count"]
        first_parts = len(first["participants"])

        # Process again
        res = client.post(f"/api/meetings/{mid}/process", headers=_headers(auth_token))
        assert res.status_code == 200

        res = client.get(f"/api/meetings/{mid}", headers=_headers(auth_token))
        second = res.json()
        assert second["risk_count"] == first_risks
        assert len(second["participants"]) == first_parts


# Test 14: Decisions include decided_by_name
def test_decisions_include_decided_by_name(auth_token):
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        mid, _ = _create_and_process(client, auth_token, "Decision Name Test")

        res = client.get(f"/api/meetings/{mid}/decisions", headers=_headers(auth_token))
        decisions = res.json()
        assert len(decisions) > 0
        # At least one decision should have a decided_by_name
        has_name = any(d.get("decided_by_name") for d in decisions)
        assert has_name, f"No decision has decided_by_name: {decisions}"


# Test 15: Real OpenAI integration (opt-in)
@pytest.mark.skipif(
    not os.environ.get("CORTEX_TEST_REAL_LLM"),
    reason="Set CORTEX_TEST_REAL_LLM=1 to run real OpenAI integration test"
)
def test_real_openai_extraction():
    """Requires OPENAI_API_KEY to be set in the environment."""
    import asyncio
    from services.llm import LLMService

    transcript = "\n".join(
        f"{seg['speaker']}: {seg['text']}" for seg in SAMPLE_TRANSCRIPT
    )

    llm = LLMService(mock_mode=False)

    async def run():
        intel = await llm.extract_meeting_intelligence(transcript)
        assert intel.summary
        assert len(intel.participants) >= 3
        assert len(intel.action_items) >= 2
        assert len(intel.decisions) >= 1
        assert 0.0 < intel.overall_confidence <= 1.0
        print(f"Real LLM result: {len(intel.participants)} participants, "
              f"{len(intel.action_items)} actions, {len(intel.decisions)} decisions, "
              f"{len(intel.risks)} risks")

    asyncio.run(run())
