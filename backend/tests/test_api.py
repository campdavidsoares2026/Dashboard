import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_overview_endpoint_exists():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "alerts" in data
    assert "recommendations" in data

def test_comparacoes_endpoint_exists():
    response = client.get("/api/clusters/comparacao?clusters=sp")
    assert response.status_code == 200
    data = response.json()
    assert "clusters" in data
    assert "graficos" in data

def test_insights_endpoint_exists():
    response = client.get("/api/campanhas-por-conta")
    assert response.status_code == 200
    data = response.json()
    assert "campanhas" in data

def test_trending_endpoint():
    """Test the trending/prediction endpoint"""
    client = TestClient(app)
    response = client.get("/api/clusters/123/trending")
    assert response.status_code == 200
    data = response.json()
    assert "tendencia" in data
    assert "confianca" in data
    assert "drivers" in data
    assert "sugestao" in data
    assert isinstance(data["confianca"], int)
    assert 20 <= data["confianca"] <= 95  # Confidence bounds
