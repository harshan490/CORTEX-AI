"""Tests for WorkflowState tracking during meeting processing.

Uses httpx.AsyncClient with ASGITransport against the FastAPI app.
Each test gets an isolated database transaction (rolled back after the test)
and a mocked LLM provider — no real Ollama/OpenAI is needed.

Standard suite finishes in seconds.  Real-Ollama integration is opt-in via
CORTEX_TEST_REAL_OLLAMA=1.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from config import settings
from database import get_db, Base
from database.models import User
from services.llm import _build_mock_intelligence

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import event as sa_event

from jose import jwt as jose_jwt
from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Transcript fixture data
# ---------------------------------------------------------------------------

TRANSCRIPT_SEGMENTS = [
    {"speaker": "Alice", "text": "We need to launch the beta by August 5.", "start": 0, "end": 5},
    {"speaker": "Bob", "text": "I'll prepare the deployment checklist by August 2.", "start": 5, "end": 10},
    {"speaker": "Carol", "text": "Security review is required before launch.", "start": 10, "end": 15},
]

# ---------------------------------------------------------------------------
# Deterministic LLM mock
# ---------------------------------------------------------------------------


async def _mock_extract(self, transcript_text: str):
    """Deterministic replacement for LLMService.extract_meeting_intelligence."""
    import asyncio
    await asyncio.sleep(0.01)
    return _build_mock_intelligence(transcript_text)

# ---------------------------------------------------------------------------
# Auth helpers — create tokens directly, no HTTP round-trip
# ---------------------------------------------------------------------------

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _make_token(user_id: uuid.UUID, expire_minutes: int = 120) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expire_minutes),
    }
    return jose_jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def _test_engine():
    """Create a per-test engine so the connection pool is tied to the
    current event loop (pytest-asyncio creates a new loop per test)."""
    eng = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(_test_engine):
    """Yield an AsyncSession wrapped in a transaction that is rolled back
    after the test, so nothing persists to the dev database."""
    async with _test_engine.connect() as conn:
        txn = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)

        @sa_event.listens_for(session.sync_session, "after_transaction_end")
        def _restart_savepoint(sync_session, transaction):
            if conn.closed or conn.invalidated:
                return
            if transaction.nested and not transaction._parent.nested:
                sync_session.begin_nested()

        await session.begin_nested()

        yield session

        await session.close()
        await txn.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """HTTP client talking to the FastAPI app with the DB overridden."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def user_a(db_session) -> tuple[User, str]:
    """Create test user A and return (user, token)."""
    user = User(
        email=f"wf-test-a-{uuid.uuid4().hex[:8]}@test.dev",
        name="Workflow User A",
        hashed_password=_pwd_ctx.hash("testpass"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user, _make_token(user.id)


@pytest_asyncio.fixture
async def user_b(db_session) -> tuple[User, str]:
    """Create test user B (for scoping tests)."""
    user = User(
        email=f"wf-test-b-{uuid.uuid4().hex[:8]}@test.dev",
        name="Workflow User B",
        hashed_password=_pwd_ctx.hash("testpass"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user, _make_token(user.id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_and_process(client: httpx.AsyncClient, token: str,
                              title: str, segments=None):
    """Create a meeting, upload transcript, process it.
    Returns (meeting_id, status_code)."""
    headers = _auth_headers(token)

    res = await client.post("/api/meetings/", json={
        "title": title,
        "date": "2026-07-26T10:00:00Z",
    }, headers=headers)
    assert res.status_code == 201, f"Create failed: {res.text}"
    meeting_id = res.json()["id"]

    res = await client.post(
        f"/api/meetings/{meeting_id}/transcript",
        json={"segments": segments or TRANSCRIPT_SEGMENTS},
        headers=headers,
    )
    assert res.status_code == 200, f"Transcript upload failed: {res.text}"

    res = await client.post(
        f"/api/meetings/{meeting_id}/process",
        headers=headers,
        timeout=30,
    )
    assert res.status_code in (200, 500), \
        f"Unexpected process status: {res.status_code} {res.text}"
    return meeting_id, res.status_code


async def _get_workflows(client: httpx.AsyncClient, token: str, **params):
    res = await client.get("/api/agents/workflows", params=params,
                           headers=_auth_headers(token))
    assert res.status_code == 200, f"Workflows fetch failed: {res.text}"
    return res.json()


# ---------------------------------------------------------------------------
# Tests — mocked LLM ensures deterministic, fast execution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_processing_creates_workflow(client, user_a):
    """Test 1: Meeting processing creates a WorkflowState."""
    _, token = user_a
    meeting_id, status_code = await _create_and_process(client, token, "Workflow Create Test")
    assert status_code == 200
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    assert workflows[0]["meeting_id"] == meeting_id


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_workflow_terminal_status(client, user_a):
    """Test 2: Successful processing ends in awaiting_review."""
    _, token = user_a
    meeting_id, status_code = await _create_and_process(client, token, "Workflow Status Test")
    assert status_code == 200
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    wf = workflows[0]
    assert wf["status"] == "awaiting_review"
    assert wf["current_step"] == "awaiting_review"


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_workflow_progress_monotonic(client, user_a):
    """Test 3: Progress reaches 95 on success (awaiting_review)."""
    _, token = user_a
    meeting_id, _ = await _create_and_process(client, token, "Workflow Progress Test")
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert workflows[0]["progress"] == 95


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_workflow_started_at(client, user_a):
    """Test 4: Workflow has started_at set."""
    _, token = user_a
    meeting_id, _ = await _create_and_process(client, token, "Workflow Started Test")
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert workflows[0]["started_at"] is not None


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_workflow_correct_meeting(client, user_a):
    """Test 5: Workflow references the correct meeting and title."""
    _, token = user_a
    meeting_id, _ = await _create_and_process(client, token, "Correct Meeting Test")
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    assert workflows[0]["meeting_id"] == meeting_id
    assert workflows[0]["meeting_title"] == "Correct Meeting Test"


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_retry_no_duplicate(client, user_a):
    """Test 6: Reprocessing reuses the existing workflow row (no duplicates)."""
    _, token = user_a
    meeting_id, _ = await _create_and_process(client, token, "Retry No Dup Test")

    # Reprocess the same meeting
    res = await client.post(
        f"/api/meetings/{meeting_id}/process",
        headers=_auth_headers(token),
        timeout=30,
    )
    assert res.status_code in (200, 500)

    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    assert workflows[0]["attempt"] >= 2


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_status_filter(client, user_a):
    """Test 7: Status filter returns only matching workflows."""
    _, token = user_a
    await _create_and_process(client, token, "Filter Test")

    all_wf = await _get_workflows(client, token)
    assert len(all_wf) > 0

    status = all_wf[0]["status"]
    filtered = await _get_workflows(client, token, status=status)
    assert len(filtered) > 0
    for w in filtered:
        assert w["status"] == status


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_meeting_filter(client, user_a):
    """Test 8: Meeting filter isolates workflows by meeting_id."""
    _, token = user_a
    mid1, _ = await _create_and_process(client, token, "Filter Meeting A")
    mid2, _ = await _create_and_process(client, token, "Filter Meeting B")

    wf1 = await _get_workflows(client, token, meeting_id=mid1)
    assert len(wf1) == 1
    assert wf1[0]["meeting_id"] == mid1

    wf2 = await _get_workflows(client, token, meeting_id=mid2)
    assert len(wf2) == 1
    assert wf2[0]["meeting_id"] == mid2


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_user_scoping(client, user_a, user_b):
    """Test 9: Users cannot see other users' workflows."""
    _, token_a = user_a
    _, token_b = user_b
    meeting_id, _ = await _create_and_process(client, token_a, "Scoping Test")

    other_workflows = await _get_workflows(client, token_b)
    other_meeting_ids = {w["meeting_id"] for w in other_workflows}
    assert meeting_id not in other_meeting_ids


@pytest.mark.asyncio
@patch("services.llm.LLMService.extract_meeting_intelligence", _mock_extract)
async def test_workflow_error_safe(client, user_a):
    """Test 10: Successful workflow has no sensitive data in error field."""
    _, token = user_a
    meeting_id, _ = await _create_and_process(client, token, "Error Safety Test")
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    wf = workflows[0]
    if wf["error"]:
        assert "api_key" not in wf["error"].lower()
        assert "bearer" not in wf["error"].lower()
        assert "prompt" not in wf["error"].lower()


@pytest.mark.asyncio
async def test_failed_workflow_has_completed_at(client, user_a):
    """Test 11: Failed processing sets status=failed and completed_at."""
    _, token = user_a

    async def _raise_extract(self, transcript_text):
        raise RuntimeError("Simulated LLM failure")

    with patch("services.llm.LLMService.extract_meeting_intelligence", _raise_extract):
        meeting_id, status_code = await _create_and_process(
            client, token, "Failure CompletedAt Test"
        )

    assert status_code == 500
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    wf = workflows[0]
    assert wf["status"] == "failed"
    assert wf["completed_at"] is not None
    assert wf["started_at"] is not None
    assert wf["error"] is not None


# ---------------------------------------------------------------------------
# Opt-in real Ollama test (CORTEX_TEST_REAL_OLLAMA=1)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.skipif(
    os.environ.get("CORTEX_TEST_REAL_OLLAMA") != "1",
    reason="Set CORTEX_TEST_REAL_OLLAMA=1 to run real Ollama workflow test",
)
async def test_real_ollama_workflow(client, user_a):
    """Opt-in: full processing through real Ollama (slow, CPU-bound)."""
    _, token = user_a
    meeting_id, status_code = await _create_and_process(
        client, token, "Real Ollama Workflow Test",
        segments=TRANSCRIPT_SEGMENTS,
    )
    workflows = await _get_workflows(client, token, meeting_id=meeting_id)
    assert len(workflows) == 1
    wf = workflows[0]
    if status_code == 200:
        assert wf["status"] == "awaiting_review"
        assert wf["progress"] == 95
    else:
        assert wf["status"] == "failed"
        assert wf["completed_at"] is not None
