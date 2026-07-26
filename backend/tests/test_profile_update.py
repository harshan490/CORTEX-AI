"""Tests for PUT /api/auth/me profile update endpoint and startup migration."""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
import uuid
import textwrap

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth import router
from api.dependencies import get_current_user
from database import get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_user(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "email": "test@cortex.ai",
        "name": "Test User",
        "role": None,
        "timezone": None,
        "avatar_url": None,
        "google_id": None,
        "hashed_password": "$2b$12$fakehash",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    defaults.update(overrides)
    user = MagicMock()
    for k, v in defaults.items():
        setattr(user, k, v)
    return user


@pytest.fixture
def mock_user():
    return _make_user()


@pytest.fixture
def app(mock_user):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: mock_user
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestUpdateProfile:
    """Test 1: Authenticated user can update their own profile."""

    def test_update_name(self, client, mock_user):
        updated = _make_user(id=mock_user.id, name="New Name")
        with patch("api.auth.update_user", new_callable=AsyncMock, return_value=updated):
            resp = client.put("/api/auth/me", json={"name": "New Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_update_role(self, client, mock_user):
        updated = _make_user(id=mock_user.id, role="Engineer")
        with patch("api.auth.update_user", new_callable=AsyncMock, return_value=updated):
            resp = client.put("/api/auth/me", json={"role": "Engineer"})
        assert resp.status_code == 200
        assert resp.json()["role"] == "Engineer"

    def test_update_timezone(self, client, mock_user):
        updated = _make_user(id=mock_user.id, timezone="America/New_York")
        with patch("api.auth.update_user", new_callable=AsyncMock, return_value=updated):
            resp = client.put("/api/auth/me", json={"timezone": "America/New_York"})
        assert resp.status_code == 200
        assert resp.json()["timezone"] == "America/New_York"


class TestUnauthenticated:
    """Test 2: Unauthenticated request receives 401."""

    def test_no_auth_returns_401(self):
        app = FastAPI()
        app.include_router(router)
        # Do NOT override get_current_user — let it fail naturally
        mock_db = AsyncMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        c = TestClient(app)
        resp = c.put("/api/auth/me", json={"name": "Hacker"})
        assert resp.status_code == 401


class TestInvalidTimezone:
    """Test 3: Invalid timezone is rejected."""

    def test_invalid_timezone_rejected(self, client):
        resp = client.put("/api/auth/me", json={"timezone": "Fake/Zone"})
        assert resp.status_code == 422
        assert "Invalid timezone" in resp.json()["detail"]


class TestEmptyName:
    """Test 4: Empty name is rejected."""

    def test_empty_name_rejected(self, client):
        resp = client.put("/api/auth/me", json={"name": "   "})
        assert resp.status_code == 422
        assert "empty" in resp.json()["detail"].lower()

    def test_blank_string_name_rejected(self, client):
        resp = client.put("/api/auth/me", json={"name": ""})
        assert resp.status_code == 422


class TestNoPasswordHash:
    """Test 5: Password hash is never returned."""

    def test_response_has_no_password(self, client, mock_user):
        updated = _make_user(id=mock_user.id, name="Safe User")
        with patch("api.auth.update_user", new_callable=AsyncMock, return_value=updated):
            resp = client.put("/api/auth/me", json={"name": "Safe User"})
        body = resp.json()
        assert "hashed_password" not in body
        assert "password" not in body

    def test_get_me_has_no_password(self, client):
        resp = client.get("/api/auth/me")
        body = resp.json()
        assert "hashed_password" not in body
        assert "password" not in body


class TestCannotUpdateOtherUser:
    """Test 6: One user cannot update another user's data.

    The endpoint always uses current_user.id — there is no user_id parameter.
    """

    def test_update_only_applies_to_current_user(self, client, mock_user):
        updated = _make_user(id=mock_user.id, name="My Name")
        with patch("api.auth.update_user", new_callable=AsyncMock, return_value=updated) as mock_update:
            resp = client.put("/api/auth/me", json={"name": "My Name"})
        assert resp.status_code == 200
        # The update_user call must use the current user's ID, not any other
        mock_update.assert_called_once()
        call_args = mock_update.call_args
        assert call_args[0][1] == mock_user.id  # second positional arg is user_id


class TestNullRoleTimezoneAuth:
    """User with null role/timezone can authenticate and be serialized."""

    def test_login_with_null_fields(self, mock_user):
        mock_user.role = None
        mock_user.timezone = None
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        mock_db = AsyncMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("api.auth.get_user_by_email", new_callable=AsyncMock, return_value=mock_user), \
             patch("api.auth.verify_password", return_value=True):
            c = TestClient(app)
            resp = c.post("/api/auth/login", json={"email": "test@cortex.ai", "password": "pass"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["user"]["role"] is None
        assert body["user"]["timezone"] is None

    def test_get_me_with_null_fields(self):
        user = _make_user(role=None, timezone=None)
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_current_user] = lambda: user
        mock_db = AsyncMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        c = TestClient(app)
        resp = c.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["role"] is None
        assert resp.json()["timezone"] is None


class TestStartupMigration:
    """Startup migration adds role/timezone columns idempotently."""

    def test_init_db_contains_users_role_migration(self):
        """init_db source includes ALTER TABLE users ADD COLUMN IF NOT EXISTS role."""
        import inspect
        from database import init_db
        source = inspect.getsource(init_db)
        assert "ALTER TABLE users ADD COLUMN IF NOT EXISTS role" in source

    def test_init_db_contains_users_timezone_migration(self):
        """init_db source includes ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone."""
        import inspect
        from database import init_db
        source = inspect.getsource(init_db)
        assert "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone" in source

    def test_migration_uses_if_not_exists(self):
        """Migration uses IF NOT EXISTS to be idempotent."""
        import inspect
        from database import init_db
        source = inspect.getsource(init_db)
        # Both user column migrations use IF NOT EXISTS
        lines = [l for l in source.splitlines() if "users ADD COLUMN" in l]
        assert len(lines) >= 2
        for line in lines:
            assert "IF NOT EXISTS" in line

    def test_columns_are_nullable(self):
        """role and timezone columns are nullable (no NOT NULL)."""
        import inspect
        from database import init_db
        source = inspect.getsource(init_db)
        for line in source.splitlines():
            if "users ADD COLUMN IF NOT EXISTS role" in line:
                assert "NOT NULL" not in line
            if "users ADD COLUMN IF NOT EXISTS timezone" in line:
                assert "NOT NULL" not in line
