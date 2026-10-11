import sys
import warnings
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent))
warnings.filterwarnings("ignore", message="Payload indexes have no effect")

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from helpers import make_pdf  # noqa: E402

ADMIN_KEY = "test-admin-key-0123456789abcdef"


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None, qdrant_url=":memory:",
        database_url=f"sqlite:///{tmp_path}/test.db", upload_dir=str(tmp_path / "uploads"), mock_external=True,
        admin_api_key=ADMIN_KEY, rate_limit_per_minute=10_000, sarvam_docai_poll_seconds=0, embedding_dim=256,
        environment="test", require_auth=True,
    )


@pytest.fixture
def app(settings):
    a = create_app(settings)
    yield a
    a.state.db.engine.dispose()


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin():
    return {"Authorization": f"Bearer {ADMIN_KEY}"}


@pytest.fixture
def services(app):
    return app.state.services


@pytest.fixture
def db(app):
    s = app.state.db.SessionLocal()
    yield s
    s.close()


@pytest.fixture
def make_user(client, admin):
    def _make(role="clinician", patient_ids=(), name=None):
        r = client.post("/api/users", json={"name": name or role.title(), "role": role, "patient_ids": list(patient_ids)}, headers=admin)
        assert r.status_code == 201, r.text
        return {"Authorization": f"Bearer {r.json()['api_key']}"}, r.json()["id"]

    return _make


@pytest.fixture
def make_patient(client, admin):
    def _make(name="Asha Rao", birth_date="1974-05-02", sex="female", headers=None):
        r = client.post("/api/patients", json={"name": name, "birth_date": birth_date, "sex": sex}, headers=headers or admin)
        assert r.status_code == 201, r.text
        return r.json()

    return _make


@pytest.fixture
def upload(client, admin):
    def _upload(patient_id, lines, filename="report.pdf", headers=None):
        r = client.post(f"/api/patients/{patient_id}/documents", headers=headers or admin,
                        files={"file": (filename, make_pdf(lines), "application/pdf")})
        assert r.status_code == 202, r.text
        # TestClient runs background tasks before returning, so processing is complete here.
        return client.get(f"/api/documents/{r.json()['id']}", headers=headers or admin).json()

    return _upload


@pytest.fixture
def no_sleep(monkeypatch):
    import app.services.http as h
    import app.services.sarvam as s

    monkeypatch.setattr(h.time, "sleep", lambda *_: None)
    monkeypatch.setattr(s.time, "sleep", lambda *_: None)
