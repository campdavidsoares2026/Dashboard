import pytest
from app.services.prediction_engine import PredictionEngine
from datetime import datetime, timedelta


def test_prediction_engine_7d():
    engine = PredictionEngine()

    # Mock historical data
    historical = [
        {"date": (datetime.now() - timedelta(days=i)).isoformat(), "cpee": 45 + i * 0.5}
        for i in range(14)
    ]

    prediction = engine.predict(historical, periodo="7d")

    assert "tendencia_percentual" in prediction
    assert "confianca" in prediction
    assert 0 <= prediction["confianca"] <= 100


def test_prediction_drivers():
    engine = PredictionEngine()
    prediction = {"drivers": engine.get_drivers(0.15, 0.78)}

    assert isinstance(prediction["drivers"], list)
    assert len(prediction["drivers"]) > 0
