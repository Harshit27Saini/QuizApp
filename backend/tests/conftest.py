import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def force_mock_for_tests(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")
