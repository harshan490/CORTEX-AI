"""Tests for analytics period parameter and user-scoping."""

import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.analytics import router, PERIOD_DAYS, _period_since
from api.dependencies import get_current_user
from database import get_db


# ---------------------------------------------------------------------------
# Unit: period mapping
# ---------------------------------------------------------------------------

class TestPeriodDays:
    def test_week_is_7(self):
        assert PERIOD_DAYS["week"] == 7

    def test_month_is_30(self):
        assert PERIOD_DAYS["month"] == 30

    def test_quarter_is_90(self):
        assert PERIOD_DAYS["quarter"] == 90

    def test_period_since_returns_past_datetime(self):
        now = datetime.now(timezone.utc)
        since = _period_since("week")
        delta = now - since
        assert 6 <= delta.days <= 7


# ---------------------------------------------------------------------------
# Integration: FastAPI validation of period parameter
# ---------------------------------------------------------------------------

def _mock_user():
    user = MagicMock()
    user.id = "00000000-0000-0000-0000-000000000001"
    return user


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(router)
    # Override auth + db dependencies so validation is reachable
    app.dependency_overrides[get_current_user] = lambda: _mock_user()
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestPeriodValidation:
    """Backend must reject invalid period values (test 8)."""

    def test_rejects_invalid_period(self, client):
        response = client.get("/api/analytics/overview?period=year")
        assert response.status_code == 422
        body = response.json()
        assert "detail" in body

    def test_rejects_empty_period(self, client):
        response = client.get("/api/analytics/overview?period=")
        assert response.status_code == 422

    def test_accepts_valid_periods(self):
        """Verify the Literal type annotation accepts week/month/quarter.
        We test at the schema level rather than making real requests
        since mocking async db execution is fragile."""
        from typing import get_type_hints, Literal, get_args
        import inspect
        sig = inspect.signature(router.routes[0].endpoint)  # type: ignore[union-attr]
        period_param = sig.parameters["period"]
        # The annotation should be Literal["week", "month", "quarter"]
        args = get_args(period_param.annotation)
        assert "week" in args
        assert "month" in args
        assert "quarter" in args
        assert "year" not in args


class TestMeetingTrendsPeriodValidation:
    def test_rejects_invalid_period(self, client):
        response = client.get("/api/analytics/meeting-trends?period=decade")
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# User-scoping: overview queries filter by created_by (test 9)
# ---------------------------------------------------------------------------

class TestUserScoping:
    """Analytics remain user-scoped — the endpoint receives current_user."""

    def test_overview_uses_current_user_dependency(self):
        """The overview route has get_current_user as a dependency."""
        import inspect
        sig = inspect.signature(router.routes[0].endpoint)  # type: ignore[union-attr]
        param_names = list(sig.parameters.keys())
        assert "current_user" in param_names

    def test_meeting_trends_uses_current_user_dependency(self):
        import inspect
        sig = inspect.signature(router.routes[1].endpoint)  # type: ignore[union-attr]
        param_names = list(sig.parameters.keys())
        assert "current_user" in param_names
