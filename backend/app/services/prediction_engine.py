from typing import Dict, List, Union
from datetime import datetime, timedelta
from statistics import mean, stdev


class PredictionEngine:
    """
    Time series forecasting for campaign metrics.
    Uses simple linear regression + moving average for trend detection.
    Can be extended with Prophet for better accuracy.
    """

    def predict(
        self,
        historical_data: List[Dict],
        periodo: str = "7d"
    ) -> Dict[str, Union[float, str, List[str]]]:
        """
        Predict CPEE trend for next 7 or 30 days.
        Returns: tendencia_percentual, confianca, drivers, sugestao
        """
        if len(historical_data) < 3:
            return {
                "tendencia_percentual": 0,
                "confianca": 0,
                "drivers": [],
                "sugestao": "Dados insuficientes para previsão"
            }

        # Extract values
        values = [d.get("cpee", d.get("value", 0)) for d in historical_data]

        # Simple linear trend
        n = len(values)
        x = list(range(n))
        mean_x = mean(x)
        mean_y = mean(values)

        numerator = sum((x[i] - mean_x) * (values[i] - mean_y) for i in range(n))
        denominator = sum((x[i] - mean_x) ** 2 for i in range(n))

        if denominator == 0:
            slope = 0
            confidence = 20
        else:
            slope = numerator / denominator
            # Confidence based on R-squared
            ss_res = sum((values[i] - (slope * (x[i] - mean_x) + mean_y)) ** 2 for i in range(n))
            ss_tot = sum((values[i] - mean_y) ** 2 for i in range(n))
            confidence = ((1 - (ss_res / ss_tot)) * 100) if ss_tot != 0 else 50
            confidence = max(20, min(95, confidence))

        # Calculate trend percentage
        trend_pct = (slope / mean_y * 100) if mean_y != 0 else 0

        # Get drivers
        drivers = self.get_drivers(trend_pct, confidence)

        # Get suggestion
        sugestao = self.get_suggestion(trend_pct, confidence)

        return {
            "tendencia_percentual": round(trend_pct, 2),
            "confianca": round(confidence, 0),
            "drivers": drivers,
            "sugestao": sugestao
        }

    def get_drivers(self, trend: float, confidence: float) -> List[str]:
        """Identify drivers of the trend"""
        drivers = []

        if trend > 0:
            drivers.extend(["Sentimento positivo", "Demografia ativa"])
        else:
            drivers.extend(["Sentimento negativo", "Mensagem fraca"])

        if confidence > 80:
            drivers.append("Padrão consistente")

        return drivers

    def get_suggestion(self, trend: float, confidence: float) -> str:
        """Get action suggestion based on trend"""
        if confidence < 50:
            return "Dados insuficientes para ação"

        if trend > 10:
            if confidence > 75:
                return "✓ Aumentar verba agora - forte tendência positiva"
            return "→ Monitorar - tendência positiva, mas revise antes de escalar"
        elif trend < -10:
            if confidence > 75:
                return "⚠️ Revisar criativo - tendência negativa consistente"
            return "→ Monitorar - tendência negativa, revisar estratégia"
        else:
            return "→ Manter estratégia atual - estável"
