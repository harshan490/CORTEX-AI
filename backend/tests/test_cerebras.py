"""Tests for Cerebras LLM provider integration.

Tests 1-12: Unit tests covering config, provider selection, Cerebras HTTP
interactions (mocked), error handling, and security.

Test 13: Opt-in real Cerebras integration test (requires valid API key +
CORTEX_TEST_REAL_CEREBRAS=1).
"""
import asyncio
import json
import os
from unittest.mock import patch

import httpx
import pytest

from services.llm_schemas import MeetingIntelligence


SAMPLE_TRANSCRIPT = (
    "Sarah: We will release the beta on August 5, 2026.\n"
    "Marcus: I will prepare the deployment checklist by August 2, 2026.\n"
    "Priya: The security review has no owner and must happen before deployment.\n"
    "Sarah: Marcus will run the authentication load test by August 1, 2026.\n"
    "James: I will update the documentation by August 3, 2026.\n"
    "Marcus: Deployment depends on the security review and load test.\n"
    "Sarah: No external action should happen without human approval."
)

# A well-formed Cerebras-style response (objects for structured fields)
VALID_CEREBRAS_RESPONSE = json.dumps({
    "participants": [
        {"name": "Sarah", "role": "Project Lead"},
        {"name": "Marcus", "role": None},
        {"name": "Priya", "role": None},
        {"name": "James", "role": None},
    ],
    "decisions": [
        {"title": "Release beta on August 5", "description": "Beta release planned", "decided_by": "Sarah", "evidence": "Sarah: We will release the beta", "confidence": 0.9},
    ],
    "action_items": [
        {"title": "Prepare deployment checklist", "description": "By August 2", "assignee": "Marcus", "deadline": "August 2, 2026", "priority": "high", "evidence": "Marcus: I will prepare", "confidence": 0.9},
        {"title": "Update documentation", "description": "By August 3", "assignee": "James", "deadline": "August 3, 2026", "priority": "medium", "evidence": "James: I will update", "confidence": 0.85},
    ],
    "risks": [
        {"title": "Security review has no owner", "description": "Unowned review", "severity": "high", "likelihood": "medium", "owner": None, "evidence": "Priya: The security review has no owner", "confidence": 0.9},
    ],
    "dependencies": [
        {"from_item": "Deployment", "to_item": "Security review and load test", "dependency_type": "requires", "description": "Deployment blocked"},
    ],
    "clarifications": [
        {"question": "Who owns the security review?", "context": "Unassigned task", "evidence": "Priya: has no owner"},
    ],
    "summary": "Team discussed beta release on Aug 5 with deployment dependencies.",
    "overall_confidence": 0.88,
})

# Cerebras may also return participants/decisions as plain strings
VALID_CEREBRAS_RESPONSE_FLAT = json.dumps({
    "participants": ["Sarah", "Marcus", "Priya", "James"],
    "decisions": ["Release beta on August 5, conditional on security approval"],
    "action_items": [
        {"task": "Prepare deployment checklist", "owner": "Marcus", "deadline": "August 2"},
    ],
    "risks": ["Security review has no owner"],
    "dependencies": ["Deployment depends on security review"],
    "clarifications": [],
    "summary": "Beta release planned for August 5.",
    "overall_confidence": 0.85,
})


def _cerebras_http_response(status_code, body):
    """Build a mock httpx.Response for Cerebras chat/completions."""
    if isinstance(body, str):
        # body is the assistant message content
        json_body = {
            "choices": [{"message": {"content": body}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
        }
    else:
        json_body = body
    return httpx.Response(
        status_code,
        json=json_body,
        request=httpx.Request("POST", "https://api.cerebras.ai/v1/chat/completions"),
    )


def _make_cerebras_service(**kwargs):
    """Create an LLMService configured for Cerebras without touching real settings."""
    from services.llm import LLMService
    svc = LLMService(provider="cerebras", **kwargs)
    svc.cerebras_api_key = "test-key-not-real"
    svc.cerebras_model = "gemma-4-31b"
    svc.cerebras_base_url = "https://api.cerebras.ai/v1"
    svc.timeout = 30
    svc.max_retries = 0
    return svc


# ── Test 1: Cerebras provider selection ───────────────────────────────────

def test_cerebras_provider_selection(monkeypatch):
    monkeypatch.setattr("config.settings.LLM_PROVIDER", "cerebras")
    monkeypatch.setattr("config.settings.LLM_MOCK_MODE", False)
    from services.llm import LLMService
    svc = LLMService()
    assert svc.provider == "cerebras"
    assert svc.mock_mode is False


# ── Test 2: Correct base URL and model ────────────────────────────────────

def test_correct_url_and_model():
    svc = _make_cerebras_service()
    assert svc.cerebras_base_url == "https://api.cerebras.ai/v1"
    assert svc.cerebras_model == "gemma-4-31b"
    assert svc.provider == "cerebras"


# ── Test 3: API key sent only through Authorization header ────────────────

def test_api_key_in_authorization_header():
    svc = _make_cerebras_service()
    captured_headers = {}

    async def mock_post(self, url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return _cerebras_http_response(200, VALID_CEREBRAS_RESPONSE)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    assert "Authorization" in captured_headers
    assert captured_headers["Authorization"] == "Bearer test-key-not-real"
    # Verify key is NOT in the JSON payload
    captured_payload = {}

    async def mock_post_capture(self, url, **kwargs):
        captured_payload.update(kwargs.get("json", {}))
        return _cerebras_http_response(200, VALID_CEREBRAS_RESPONSE)

    with patch.object(httpx.AsyncClient, "post", mock_post_capture):
        svc._cache.clear()
        asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT + " extra"))

    payload_str = json.dumps(captured_payload)
    assert "test-key-not-real" not in payload_str


# ── Test 4: Successful structured response (object-style) ────────────────

def test_valid_response_parsed():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, VALID_CEREBRAS_RESPONSE)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    assert isinstance(result, MeetingIntelligence)
    assert len(result.participants) == 4
    names = [p.name for p in result.participants]
    assert "Sarah" in names
    assert "Marcus" in names
    assert result.summary
    assert len(result.action_items) == 2
    assert len(result.decisions) == 1
    assert len(result.risks) == 1
    assert len(result.dependencies) == 1
    assert len(result.clarifications) == 1
    assert 0.0 <= result.overall_confidence <= 1.0


# ── Test 5: Flat string-style response also parses ────────────────────────

def test_flat_response_parsed():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, VALID_CEREBRAS_RESPONSE_FLAT)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    assert isinstance(result, MeetingIntelligence)
    assert len(result.participants) == 4
    assert len(result.action_items) == 1
    assert result.action_items[0].title == "Prepare deployment checklist"


# ── Test 6: Response schema validation — final output validated ───────────

def test_response_validated_against_schema():
    """The final MeetingIntelligence object must pass schema validation."""
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, VALID_CEREBRAS_RESPONSE)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    # Re-validate via Pydantic — must not raise
    validated = MeetingIntelligence.model_validate(result.model_dump())
    assert validated.summary == result.summary
    for ai in validated.action_items:
        assert 0.0 <= ai.confidence <= 1.0


# ── Test 7: 401 authentication failure ────────────────────────────────────

def test_auth_failure_401():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        resp = httpx.Response(
            401,
            json={"error": {"message": "Invalid API key"}},
            request=httpx.Request("POST", url),
        )
        resp.raise_for_status()

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="authentication failed"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 8: 429 rate-limit response ───────────────────────────────────────

def test_rate_limit_429():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        resp = httpx.Response(
            429,
            json={"error": {"message": "Rate limit exceeded"}},
            request=httpx.Request("POST", url),
        )
        resp.raise_for_status()

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="rate limit"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 9: Timeout ───────────────────────────────────────────────────────

def test_timeout():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        raise httpx.TimeoutException("Request timed out")

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="timed out"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 10: Unavailable endpoint (connect error) ─────────────────────────

def test_unavailable_endpoint():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        raise httpx.ConnectError("Connection refused")

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="not reachable"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 11: Malformed JSON ───────────────────────────────────────────────

def test_malformed_json():
    svc = _make_cerebras_service()

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, json.dumps({
            "choices": [{"message": {"content": "this is not json {"}, "finish_reason": "stop"}],
        }))

    # Need to return a raw response, not using the helper
    async def mock_post_raw(self, url, **kwargs):
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "this is not json {"}, "finish_reason": "stop"}]},
            request=httpx.Request("POST", url),
        )

    with patch.object(httpx.AsyncClient, "post", mock_post_raw):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="not valid JSON"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 12: Missing required fields ──────────────────────────────────────

def test_missing_required_fields():
    """A response with no summary and no participants should be rejected."""
    svc = _make_cerebras_service()

    # JSON is valid but structurally empty — no summary, no participants
    empty_response = json.dumps({"foo": "bar"})

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, empty_response)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError, match="missing required fields"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 13: No fallback to mock after real-provider failure ──────────────

def test_no_fallback_to_mock():
    """When provider=cerebras and API fails, it must raise, not fall back to mock."""
    svc = _make_cerebras_service()
    assert svc.provider == "cerebras"
    assert svc.mock_mode is False

    async def mock_post(self, url, **kwargs):
        raise httpx.ConnectError("Connection refused")

    with patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import CerebrasError
        with pytest.raises(CerebrasError):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 14: Error messages never expose secrets ──────────────────────────

def test_errors_never_expose_secrets():
    """Verify that CerebrasError messages do not contain API keys or transcripts."""
    svc = _make_cerebras_service()
    svc.cerebras_api_key = "csk-super-secret-key-12345"

    error_messages = []

    # Collect error messages from various failure modes
    failure_scenarios = [
        # Connect error
        lambda self, url, **kw: (_ for _ in ()).throw(httpx.ConnectError("refused")),
        # Timeout
        lambda self, url, **kw: (_ for _ in ()).throw(httpx.TimeoutException("timeout")),
    ]

    for scenario_fn in failure_scenarios:
        async def mock_post(self, url, **kwargs):
            raise httpx.ConnectError("refused")

        with patch.object(httpx.AsyncClient, "post", mock_post):
            from services.llm import CerebrasError
            try:
                svc._cache.clear()
                asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))
            except CerebrasError as e:
                error_messages.append(str(e))

    for msg in error_messages:
        assert "csk-super-secret-key-12345" not in msg
        assert "Bearer" not in msg
        assert SAMPLE_TRANSCRIPT[:50] not in msg


# ── Test 15: Empty items in arrays are filtered out ───────────────────────

def test_empty_items_filtered():
    svc = _make_cerebras_service()

    response_with_empties = json.dumps({
        "participants": ["Sarah", "", "   ", {"name": ""}, {"name": "Marcus"}],
        "decisions": ["Valid decision", ""],
        "action_items": [{"title": "", "assignee": "X"}, {"title": "Real task"}],
        "risks": [],
        "dependencies": [],
        "clarifications": [],
        "summary": "A meeting happened.",
        "overall_confidence": 0.7,
    })

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, response_with_empties)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    # Only non-empty items should survive
    assert len(result.participants) == 2
    assert result.participants[0].name == "Sarah"
    assert result.participants[1].name == "Marcus"
    assert len(result.decisions) == 1
    assert len(result.action_items) == 1


# ── Test 16: Confidence clamped to [0, 1] ─────────────────────────────────

def test_confidence_clamped():
    svc = _make_cerebras_service()

    response = json.dumps({
        "participants": [{"name": "Alice"}],
        "decisions": [{"title": "Go ahead", "confidence": 5.0}],
        "action_items": [{"title": "Do thing", "confidence": -1.0}],
        "risks": [],
        "dependencies": [],
        "clarifications": [],
        "summary": "Meeting summary.",
        "overall_confidence": 99.0,
    })

    async def mock_post(self, url, **kwargs):
        return _cerebras_http_response(200, response)

    with patch.object(httpx.AsyncClient, "post", mock_post):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))

    assert result.overall_confidence == 1.0
    assert result.decisions[0].confidence == 1.0
    assert result.action_items[0].confidence == 0.0


# ── Test 17: Other providers still work ───────────────────────────────────

def test_other_providers_still_work(monkeypatch):
    monkeypatch.setattr("config.settings.LLM_PROVIDER", "ollama")
    from services.llm import LLMService
    svc = LLMService()
    assert svc.provider == "ollama"

    monkeypatch.setattr("config.settings.LLM_PROVIDER", "mock")
    monkeypatch.setattr("config.settings.LLM_MOCK_MODE", True)
    svc2 = LLMService()
    assert svc2.provider == "mock"

    result = asyncio.run(svc2.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))
    assert isinstance(result, MeetingIntelligence)


# ── Test 18: Settings accepts Cerebras variables ──────────────────────────

def test_settings_accepts_cerebras_variables(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "cerebras")
    monkeypatch.setenv("CEREBRAS_API_KEY", "test-placeholder")
    monkeypatch.setenv("CEREBRAS_MODEL", "gemma-4-31b")
    monkeypatch.setenv("CEREBRAS_BASE_URL", "https://api.cerebras.ai/v1")
    from config import Settings
    s = Settings()
    assert s.LLM_PROVIDER == "cerebras"
    assert s.CEREBRAS_API_KEY == "test-placeholder"
    assert s.CEREBRAS_MODEL == "gemma-4-31b"
    assert s.CEREBRAS_BASE_URL == "https://api.cerebras.ai/v1"


# ── Test 19: Opt-in real Cerebras integration (guarded) ───────────────────

@pytest.mark.skipif(
    not os.environ.get("CORTEX_TEST_REAL_CEREBRAS"),
    reason="Set CORTEX_TEST_REAL_CEREBRAS=1 to run real Cerebras integration test"
)
def test_real_cerebras_extraction():
    """Requires a valid CEREBRAS_API_KEY in environment."""
    import time as _time
    from services.llm import LLMService

    svc = LLMService(provider="cerebras")
    svc.timeout = 60

    start = _time.time()

    async def run():
        return await svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT)

    intel = asyncio.run(run())
    elapsed = _time.time() - start

    print(f"\n=== Real Cerebras Result ({elapsed:.1f}s) ===")
    print(f"Participants: {[p.name for p in intel.participants]}")
    print(f"Decisions: {len(intel.decisions)}")
    print(f"Action items: {len(intel.action_items)}")
    print(f"Risks: {len(intel.risks)}")
    print(f"Dependencies: {len(intel.dependencies)}")
    print(f"Clarifications: {len(intel.clarifications)}")
    print(f"Summary: {intel.summary[:200]}")
    print(f"Confidence: {intel.overall_confidence}")

    assert isinstance(intel, MeetingIntelligence)
    names = [p.name.lower() for p in intel.participants]
    assert any("sarah" in n for n in names), f"Sarah not found in {names}"
    assert any("marcus" in n for n in names), f"Marcus not found in {names}"
    assert intel.summary, "Summary is empty"

    # Verify final object passes schema validation
    MeetingIntelligence.model_validate(intel.model_dump())
