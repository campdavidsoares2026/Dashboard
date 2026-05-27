from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.services.prediction_engine import PredictionEngine
from datetime import datetime, timedelta

router = APIRouter(prefix="/api", tags=["previsoes"])
engine = PredictionEngine()


@router.get("/clusters/{cluster_id}/trending")
async def get_trending(cluster_id: int, db: Session = Depends(get_db)):
    """Get trending prediction and drivers for a cluster"""
    # Mock data - in production, fetch from DB
    historical = [
        {"cpee": 45 + i * 0.5, "data": (datetime.now() - timedelta(days=i)).isoformat()}
        for i in range(14)
    ]

    prediction = engine.predict(historical, periodo="7d")

    return {
        "tendencia": prediction["tendencia_percentual"],
        "confianca": prediction["confianca"],
        "drivers": prediction["drivers"],
        "sugestao": prediction["sugestao"]
    }
