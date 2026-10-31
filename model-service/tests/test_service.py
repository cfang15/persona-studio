import pytest
from fastapi.testclient import TestClient

from app import scoring
from app.main import app, get_provider
from app.providers import MockProvider, build_system_prompt
from app.schemas import Persona

PERSONA = {
    "name": "Grumble",
    "traits": ["grumpy", "loyal"],
    "speaking_style": "Short sentences, lots of sighing.",
    "backstory": "A blacksmith who lost his forge.",
}


@pytest.fixture
def client():
    app.dependency_overrides[get_provider] = lambda: MockProvider(temperature=0.0)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "provider": "mock"}


def test_generate_stays_in_character(client):
    resp = client.post("/generate", json={"persona": PERSONA, "message": "Where is the forge?"})
    assert resp.status_code == 200
    body = resp.json()
    assert "Grumble" in body["reply"]
    assert body["provider"] == "mock"


def test_generate_rejects_empty_message(client):
    resp = client.post("/generate", json={"persona": PERSONA, "message": ""})
    assert resp.status_code == 422


def test_consistency_is_perfect_for_deterministic_provider(client):
    resp = client.post("/consistency", json={"persona": PERSONA, "probe": "Who are you?", "samples": 4})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["responses"]) == 4
    assert body["agreement"] == 1.0
    assert 0 <= body["score"] <= 100


def test_consistency_sample_limits(client):
    resp = client.post("/consistency", json={"persona": PERSONA, "probe": "Hi", "samples": 50})
    assert resp.status_code == 422


def test_agreement_scoring():
    assert scoring.agreement(["the red fox", "the red fox"]) == 1.0
    assert scoring.agreement(["red fox", "blue whale"]) == 0.0
    assert 0 < scoring.agreement(["red fox runs", "red fox sleeps"]) < 1


def test_trait_coverage():
    assert scoring.trait_coverage(["I am grumpy today"], ["grumpy", "loyal"]) == 0.5
    assert scoring.trait_coverage(["anything"], []) == 1.0


def test_overall_score_weights():
    assert scoring.overall_score(1.0, 1.0) == 100.0
    assert scoring.overall_score(0.0, 1.0) == 30.0


def test_system_prompt_includes_persona_fields():
    prompt = build_system_prompt(Persona(**PERSONA))
    for piece in ["Grumble", "grumpy", "loyal", "sighing", "blacksmith"]:
        assert piece in prompt
