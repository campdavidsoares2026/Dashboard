from typing import Dict, List, Optional


class RecommendationEngine:
    """
    Intelligent recommendation engine that generates actionable suggestions
    based on metric changes and business thresholds.

    Recommendation types (priority order):
    - danger (0): Critical issues, immediate action required
    - warning (1): Issues that need attention
    - info (2): Informational recommendations
    - success (3): Positive opportunities
    """

    def generate(self, cluster_data: Dict) -> List[Dict]:
        """
        Generate recommendations based on metric changes and business thresholds.

        Args:
            cluster_data: Dictionary containing cluster metrics
                - cluster: str (cluster name)
                - cpee_change_percent: float (% change in CPEE)
                - sentimento: int (sentiment score 0-100)
                - eem: float (efficiency metric)
                - gasto: float (optional, spending)
                - leads: int (optional, lead count)

        Returns:
            List[Dict]: List of recommendations with structure:
                {
                    "title": str,
                    "reason": str,
                    "type": str (danger|warning|info|success),
                    "actions": [
                        {"label": str, "action": str},
                        ...
                    ]
                }
        """
        recommendations = []

        # Rule 1: CPEE Change (>20%)
        cpee_change = cluster_data.get("cpee_change_percent")
        if cpee_change is not None:
            cpee_rec = self._check_cpee_rule(cpee_change)
            if cpee_rec:
                recommendations.append(cpee_rec)

        # Rule 2: EEM Threshold (>=2.0)
        eem = cluster_data.get("eem")
        if eem is not None:
            eem_rec = self._check_eem_rule(eem)
            if eem_rec:
                recommendations.append(eem_rec)

        # Rule 3: Sentiment Threshold
        sentimento = cluster_data.get("sentimento")
        if sentimento is not None:
            sentiment_rec = self._check_sentiment_rule(sentimento)
            if sentiment_rec:
                recommendations.append(sentiment_rec)

        return recommendations

    def _check_cpee_rule(self, cpee_change_percent: float) -> Optional[Dict]:
        """
        CPEE Change Rule: Monitor cost efficiency changes

        - If CPEE increased >20%: Type="warning"
        - If CPEE decreased >20%: Type="danger"
        """
        if cpee_change_percent > 20:
            return {
                "title": f"CPEE aumentou {cpee_change_percent:.1f}%",
                "reason": "Custo por engajamento aumentou significativamente. Revisar criativo ou detectar anomalia",
                "type": "warning",
                "actions": [
                    {
                        "label": "Revisar Criativo",
                        "action": "review_creative"
                    },
                    {
                        "label": "Detectar Anomalia",
                        "action": "detect_anomaly"
                    }
                ]
            }
        elif cpee_change_percent < -20:
            return {
                "title": f"CPEE diminuiu {abs(cpee_change_percent):.1f}%",
                "reason": "Possível degradação de audiência",
                "type": "danger",
                "actions": [
                    {
                        "label": "Investigar",
                        "action": "investigate_drop"
                    }
                ]
            }

        return None

    def _check_eem_rule(self, eem: float) -> Optional[Dict]:
        """
        EEM Threshold Rule: Monitor engagement efficiency metric

        - If EEM >= 2.0 (HOT): Type="success"
        """
        if eem >= 2.0:
            return {
                "title": "Aquecimento Detectado",
                "reason": "EEM muito alto - prioridade de escala",
                "type": "success",
                "actions": [
                    {
                        "label": "Aumentar R$5k",
                        "action": "increase_budget_5k"
                    },
                    {
                        "label": "Monitorar",
                        "action": "monitor_closely"
                    }
                ]
            }

        return None

    def _check_sentiment_rule(self, sentiment: float) -> Optional[Dict]:
        """
        Sentiment Threshold Rule: Monitor audience sentiment

        - If Sentiment >= 80% (positive): Type="info"
        - If Sentiment <= 30% (negative): Type="warning"
        """
        if sentiment >= 80:
            return {
                "title": "Sentimento Muito Positivo",
                "reason": "Sentimento positivo muito elevado (>= 80%). Excelente resposta do público",
                "type": "info",
                "actions": [
                    {
                        "label": "Escalar",
                        "action": "scale_campaign"
                    },
                    {
                        "label": "Replicar",
                        "action": "replicate_success"
                    }
                ]
            }
        elif sentiment <= 30:
            return {
                "title": "Sentimento Negativo",
                "reason": "Sentimento negativo detectado (<= 30%). Ação imediata necessária",
                "type": "warning",
                "actions": [
                    {
                        "label": "Pausar",
                        "action": "pause_campaign"
                    },
                    {
                        "label": "Revisar Criativo",
                        "action": "review_creative"
                    }
                ]
            }

        return None

    def prioritize(self, recommendations: List[Dict]) -> List[Dict]:
        """
        Sort recommendations by priority level.

        Priority order: danger(0) < warning(1) < info(2) < success(3)

        Args:
            recommendations: List of recommendation dicts

        Returns:
            List[Dict]: Sorted recommendations (lowest priority first)
        """
        priority_map = {
            "danger": 0,
            "warning": 1,
            "info": 2,
            "success": 3
        }

        return sorted(
            recommendations,
            key=lambda r: priority_map.get(r.get("type", "info"), 2)
        )
