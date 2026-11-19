import pytest
from app.core.config import settings
from app.core.database import db

@pytest.fixture(autouse=True)
def force_mock_for_tests(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")
    monkeypatch.setattr(db, "supabase", None)


