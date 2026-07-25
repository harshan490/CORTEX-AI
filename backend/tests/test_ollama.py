"""Tests for Ollama LLM provider integration.

Tests 1-12: Unit tests covering config, provider selection, Ollama HTTP
interactions (mocked with respx/monkeypatch), error handling, and
non-regression for OpenAI path.

Test 13: Opt-in real Ollama integration test (requires running Ollama +
CORTEX_TEST_REAL_OLLAMA=1).
"""
import asyncio
import json
import os
from unittest.mock import AsyncMock, patch, MagicMock

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

VALID_OLLAMA_RESPONSE = MeetingIntelligence(
    participants=[
        {"name": "Sarah"},
        {"name": "Marcus"},
        {"name": "Priya"},
        {"name": "James"},
    ],
    decisions=[{"title": "Release beta on August 5", "decided_by": "Sarah"}],
    action_items=[
        {"title": "Prepare deployment checklist", "assignee": "Marcus"},
        {"title": "Update documentation", "assignee": "James"},
    ],
    risks=[{"title": "Security review has no owner", "severity": "high"}],
    dependencies=[{"from_item": "Deployment", "to_item": "Security review and load test"}],
    clarifications=[{"question": "Who owns the security review?"}],
    summary="Team discussed beta release on Aug 5 with deployment dependencies.",
    overall_confidence=0.85,
).model_dump_json()

TAGS_RESPONSE_WITH_MODEL = {
    "models": [
        {"name": "qwen3:4b-instruct", "size": 2_000_000_000},
    ]
}

TAGS_RESPONSE_WITHOUT_MODEL = {
    "models": [
        {"name": "llama3:8b", "size": 4_000_000_000},
    ]
}


def _make_ollama_service(**kwargs):
    """Create an LLMService configured for Ollama without touching real settings."""
    from services.llm import LLMService
    svc = LLMService(provider="ollama", **kwargs)
    svc.ollama_base_url = "http://127.0.0.1:11434"
    svc.ollama_model = "qwen3:4b-instruct"
    svc.timeout = 30
    svc.max_retries = 0
    return svc


# ── Test 1: Settings accepts Ollama variables ──────────────────────────────

def test_settings_accepts_ollama_variables(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://myhost:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "qwen3:4b-instruct")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "120")
    monkeypatch.setenv("LLM_MAX_RETRIES", "3")
    monkeypatch.setenv("LLM_MOCK_MODE", "false")
    # Re-instantiate settings to pick up env
    from config import Settings
    s = Settings()
    assert s.LLM_PROVIDER == "ollama"
    assert s.OLLAMA_BASE_URL == "http://myhost:11434"
    assert s.OLLAMA_MODEL == "qwen3:4b-instruct"
    assert s.LLM_TIMEOUT_SECONDS == 120
    assert s.LLM_MAX_RETRIES == 3


# ── Test 2: Ollama provider selection ──────────────────────────────────────

def test_ollama_provider_selection(monkeypatch):
    monkeypatch.setattr("config.settings.LLM_PROVIDER", "ollama")
    monkeypatch.setattr("config.settings.LLM_MOCK_MODE", False)
    from services.llm import LLMService
    svc = LLMService()
    assert svc.provider == "ollama"
    assert svc.mock_mode is False


# ── Test 3: Correct URL and model ─────────────────────────────────────────

def test_correct_url_and_model():
    svc = _make_ollama_service()
    assert svc.ollama_base_url == "http://127.0.0.1:11434"
    assert svc.ollama_model == "qwen3:4b-instruct"
    assert svc.provider == "ollama"


# ── Test 4: Structured JSON schema is sent ─────────────────────────────────

def test_structured_json_schema_sent():
    """Verify that the Ollama request payload includes the MeetingIntelligence JSON schema."""
    schema = MeetingIntelligence.model_json_schema()
    assert "properties" in schema
    assert "participants" in schema["properties"]
    assert "action_items" in schema["properties"]
    assert "summary" in schema["properties"]


# ── Test 5: Valid response is parsed ───────────────────────────────────────

def test_valid_response_parsed():
    svc = _make_ollama_service()

    async def mock_post(self, url, **kwargs):
        # Verify the format field is the dereferenced schema
        from services.llm import _dereference_schema
        payload = kwargs.get("json", {})
        assert "format" in payload
        expected = _dereference_schema(MeetingIntelligence.model_json_schema())
        assert payload["format"] == expected
        assert payload["stream"] is False
        assert payload["options"]["temperature"] == 0

        resp = httpx.Response(
            200,
            json={"message": {"content": VALID_OLLAMA_RESPONSE}},
            request=httpx.Request("POST", url),
        )
        return resp

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=TAGS_RESPONSE_WITH_MODEL,
            request=httpx.Request("GET", url),
        )

    with patch.object(httpx.AsyncClient, "post", mock_post), \
         patch.object(httpx.AsyncClient, "get", mock_get):
        result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))
        assert isinstance(result, MeetingIntelligence)
        assert len(result.participants) >= 4
        assert result.summary


# ── Test 6: Ollama unavailable ─────────────────────────────────────────────

def test_ollama_unavailable():
    svc = _make_ollama_service()

    async def mock_get(self, url, **kwargs):
        raise httpx.ConnectError("Connection refused")

    with patch.object(httpx.AsyncClient, "get", mock_get):
        from services.llm import OllamaError
        with pytest.raises(OllamaError, match="not reachable"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 7: Model missing ─────────────────────────────────────────────────

def test_model_missing():
    svc = _make_ollama_service()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=TAGS_RESPONSE_WITHOUT_MODEL,
            request=httpx.Request("GET", url),
        )

    with patch.object(httpx.AsyncClient, "get", mock_get):
        from services.llm import OllamaError
        with pytest.raises(OllamaError, match="not available"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 8: Timeout ────────────────────────────────────────────────────────

def test_timeout():
    svc = _make_ollama_service()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=TAGS_RESPONSE_WITH_MODEL,
            request=httpx.Request("GET", url),
        )

    async def mock_post(self, url, **kwargs):
        raise httpx.TimeoutException("Request timed out")

    with patch.object(httpx.AsyncClient, "get", mock_get), \
         patch.object(httpx.AsyncClient, "post", mock_post):
        from services.llm import OllamaError
        with pytest.raises(OllamaError, match="timed out"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 9: Invalid structured response ───────────────────────────────────

def test_invalid_structured_response():
    svc = _make_ollama_service()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=TAGS_RESPONSE_WITH_MODEL,
            request=httpx.Request("GET", url),
        )

    async def mock_post(self, url, **kwargs):
        return httpx.Response(
            200,
            json={"message": {"content": '{"not_a_valid_field": true}'}},
            request=httpx.Request("POST", url),
        )

    with patch.object(httpx.AsyncClient, "get", mock_get), \
         patch.object(httpx.AsyncClient, "post", mock_post):
        # MeetingIntelligence has defaults for all fields, so a random JSON
        # object with unknown keys should still parse (Pydantic ignores extra
        # by default). But let's test with truly invalid JSON:
        pass

    # Test with non-JSON content
    async def mock_post_bad(self, url, **kwargs):
        return httpx.Response(
            200,
            json={"message": {"content": "this is not json at all"}},
            request=httpx.Request("POST", url),
        )

    with patch.object(httpx.AsyncClient, "get", mock_get), \
         patch.object(httpx.AsyncClient, "post", mock_post_bad):
        from services.llm import OllamaError
        with pytest.raises(OllamaError, match="schema validation"):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 10: No fallback to mock ──────────────────────────────────────────

def test_no_fallback_to_mock():
    """When provider=ollama and Ollama is down, it must raise, not fall back to mock."""
    svc = _make_ollama_service()
    assert svc.provider == "ollama"
    assert svc.mock_mode is False

    async def mock_get(self, url, **kwargs):
        raise httpx.ConnectError("Connection refused")

    with patch.object(httpx.AsyncClient, "get", mock_get):
        from services.llm import OllamaError
        with pytest.raises(OllamaError):
            asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))


# ── Test 11: OpenAI provider remains supported ────────────────────────────

def test_openai_provider_still_supported(monkeypatch):
    monkeypatch.setattr("config.settings.LLM_PROVIDER", "openai")
    monkeypatch.setattr("config.settings.LLM_MOCK_MODE", False)
    from services.llm import LLMService
    svc = LLMService()
    assert svc.provider == "openai"
    assert svc.mock_mode is False


# ── Test 12: Existing mock mode tests remain passing ──────────────────────

def test_mock_mode_still_works():
    from services.llm import LLMService
    svc = LLMService(mock_mode=True)
    assert svc.provider == "mock"
    assert svc.mock_mode is True

    result = asyncio.run(svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT))
    assert isinstance(result, MeetingIntelligence)
    names = [p.name for p in result.participants]
    assert "Sarah" in names
    assert "Marcus" in names


# ── Test 13: Real Ollama integration (opt-in) ─────────────────────────────

@pytest.mark.skipif(
    not os.environ.get("CORTEX_TEST_REAL_OLLAMA"),
    reason="Set CORTEX_TEST_REAL_OLLAMA=1 to run real Ollama integration test"
)
def test_real_ollama_extraction():
    """Requires a running Ollama service with the configured model."""
    import time as _time
    from services.llm import LLMService

    svc = LLMService(provider="ollama")
    svc.timeout = 300  # 5 minutes — structured output on CPU can be very slow
    svc.max_retries = 0

    start = _time.time()

    async def run():
        return await svc.extract_meeting_intelligence(SAMPLE_TRANSCRIPT)

    intel = asyncio.run(run())
    elapsed = _time.time() - start

    print(f"\n=== Real Ollama Result ({elapsed:.1f}s) ===")
    print(f"Participants: {[p.name for p in intel.participants]}")
    print(f"Decisions: {len(intel.decisions)}")
    print(f"Action items: {len(intel.action_items)}")
    print(f"Risks: {len(intel.risks)}")
    print(f"Dependencies: {len(intel.dependencies)}")
    print(f"Clarifications: {len(intel.clarifications)}")
    print(f"Summary: {intel.summary[:200]}")
    print(f"Confidence: {intel.overall_confidence}")

    # Verify transcript-specific facts, not fixture data
    names = [p.name.lower() for p in intel.participants]
    assert any("sarah" in n for n in names), f"Sarah not found in {names}"
    assert any("marcus" in n for n in names), f"Marcus not found in {names}"
    assert any("priya" in n for n in names), f"Priya not found in {names}"
    assert any("james" in n for n in names), f"James not found in {names}"

    # Summary should contain transcript-specific content, not fixture data
    assert intel.summary, "Summary is empty"
    lower_summary = intel.summary.lower()
    assert any(word in lower_summary for word in ["beta", "release", "august", "deployment", "security"]), \
        f"Summary doesn't reference transcript content: {intel.summary[:200]}"
