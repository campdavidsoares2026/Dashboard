import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.models.database import get_db
from app.models.models import CampaignData
from datetime import datetime


def mock_campaigns():
    c1 = CampaignData()
    c1.account_id = "act_111"
    c1.campaign_id = "camp_001"
    c1.campaign_name = "SP_CAPITAL_REELS"
    c1.spend = 1000.0
    c1.clicks = 200
    c1.impressions = 10000
    c1.leads = 15
    c1.ctr = 2.0
    c1.cpc = 5.0
    c1.frequency = 2.5
    c1.cpee = 5.0
    c1.date_fetched = datetime.now()

    c2 = CampaignData()
    c2.account_id = "act_222"
    c2.campaign_id = "camp_002"
    c2.campaign_name = "INTERIOR_NORTE"
    c2.spend = 500.0
    c2.clicks = 50
    c2.impressions = 5000
    c2.leads = 8
    c2.ctr = 1.0
    c2.cpc = 10.0
    c2.frequency = 1.8
    c2.cpee = 10.0
    c2.date_fetched = datetime.now()

    return [c1, c2]


def override_db():
    class FakeDB:
        def query(self, model):
            return self
        def filter(self, *args):
            return self
        def all(self):
            return mock_campaigns()
    yield FakeDB()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)
API_KEY = "test-key-123"


def test_export_requires_auth():
    response = client.get("/api/export/municipios-cpee")
    # FastAPI returns 422 (not 401) when a required Header(...) param is absent
    assert response.status_code == 422


def test_export_rejects_wrong_key():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": "Bearer wrong"}
        )
    assert response.status_code == 401


def test_export_returns_data_with_valid_key():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "municipios" in data
    assert "total_municipios" in data
    assert data["total_municipios"] == 2


def test_export_cpee_calculation():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    municipios = response.json()["municipios"]
    sp = next(m for m in municipios if m["municipio"] == "act_111")
    # CPEE = spend / clicks = 1000 / 200 = 5.0
    assert sp["cpee"] == 5.0
    assert sp["engaj"] == 200


def test_export_accepts_periodo_param():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee?periodo=7d",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["periodo"] == "7d"


def test_export_cluster_temperatura():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    municipios = response.json()["municipios"]
    # act_111: cpee=5.0, act_222: cpee=10.0 → median=7.5
    # quente: cpee < 7.5*0.9=6.75 → act_111 (5.0 < 6.75)
    # frio: cpee > 7.5*1.1=8.25 → act_222 (10.0 > 8.25)
    sp = next(m for m in municipios if m["municipio"] == "act_111")
    interior = next(m for m in municipios if m["municipio"] == "act_222")
    assert sp["cluster_temperatura"] == "quente"
    assert interior["cluster_temperatura"] == "frio"
