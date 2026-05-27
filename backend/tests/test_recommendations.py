from app.services.recommendation_engine import RecommendationEngine


def test_recommendation_generation():
    """Test that recommendations are generated based on metric thresholds"""
    engine = RecommendationEngine()

    # Test data: cluster with CPEE change +24.4%, sentimento=78, eem=1.8
    cluster_data = {
        "cluster": "Reforma Cozinha",
        "cpee_change_percent": 24.4,
        "sentimento": 78,
        "eem": 1.8,
        "gasto": 5000,
        "leads": 25
    }

    recommendations = engine.generate(cluster_data)

    # Should return a list
    assert isinstance(recommendations, list)

    # Should have at least one recommendation (CPEE change > 20%)
    assert len(recommendations) > 0

    # Check structure of first recommendation
    rec = recommendations[0]
    assert "title" in rec
    assert "reason" in rec
    assert "type" in rec
    assert "actions" in rec
    assert isinstance(rec["actions"], list)

    # Verify CPEE rule triggered (change > 20%)
    cpee_recommendations = [r for r in recommendations if "CPEE" in r.get("title", "")]
    assert len(cpee_recommendations) > 0, "CPEE recommendation should be generated for >20% change"

    cpee_rec = cpee_recommendations[0]
    assert cpee_rec["type"] == "warning", "CPEE increase >20% should be warning type"
    assert "24.4" in cpee_rec["title"], "Title should include the percentage change"
    assert len(cpee_rec["actions"]) > 0, "Should have at least one action"


def test_recommendation_prioritization():
    """Test that recommendations are prioritized correctly"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Reforma Cozinha",
        "cpee_change_percent": -30,  # danger type
        "sentimento": 85,  # info type
        "eem": 1.5
    }

    recommendations = engine.generate(cluster_data)
    prioritized = engine.prioritize(recommendations)

    # Should be sorted by priority (danger=0 < warning=1 < info=2 < success=3)
    types_order = [r["type"] for r in prioritized]
    type_priority = {"danger": 0, "warning": 1, "info": 2, "success": 3}
    priorities = [type_priority[t] for t in types_order]

    # Check that priorities are in ascending order
    for i in range(len(priorities) - 1):
        assert priorities[i] <= priorities[i + 1], "Recommendations should be sorted by priority"


def test_cpee_increase_rule():
    """Test CPEE increase >20% generates warning"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": 25.5,
        "sentimento": 50,
        "eem": 1.5
    }

    recommendations = engine.generate(cluster_data)
    cpee_recs = [r for r in recommendations if "CPEE" in r.get("title", "")]

    assert len(cpee_recs) > 0
    assert cpee_recs[0]["type"] == "warning"
    assert "aumentou" in cpee_recs[0]["reason"].lower() or "increase" in cpee_recs[0]["reason"].lower()


def test_cpee_decrease_rule():
    """Test CPEE decrease >20% generates danger"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": -21.0,
        "sentimento": 50,
        "eem": 1.5
    }

    recommendations = engine.generate(cluster_data)
    cpee_recs = [r for r in recommendations if "CPEE" in r.get("title", "")]

    assert len(cpee_recs) > 0
    assert cpee_recs[0]["type"] == "danger"


def test_eem_hot_rule():
    """Test EEM >= 2.0 generates success recommendation"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": 5.0,
        "sentimento": 50,
        "eem": 2.0
    }

    recommendations = engine.generate(cluster_data)
    eem_recs = [r for r in recommendations if "aquecimento" in r.get("title", "").lower()]

    assert len(eem_recs) > 0
    assert eem_recs[0]["type"] == "success"


def test_sentiment_positive_rule():
    """Test positive sentiment >= 80% generates info"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": 5.0,
        "sentimento": 85,
        "eem": 1.5
    }

    recommendations = engine.generate(cluster_data)
    sentiment_recs = [r for r in recommendations if "sentimento" in r.get("reason", "").lower()]

    assert len(sentiment_recs) > 0
    assert sentiment_recs[0]["type"] == "info"


def test_sentiment_negative_rule():
    """Test negative sentiment <= 30% generates warning"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": 5.0,
        "sentimento": 25,
        "eem": 1.5
    }

    recommendations = engine.generate(cluster_data)
    sentiment_recs = [r for r in recommendations if "sentimento" in r.get("reason", "").lower()]

    assert len(sentiment_recs) > 0
    assert sentiment_recs[0]["type"] == "warning"


def test_empty_cluster_data():
    """Test handling of empty/minimal cluster data"""
    engine = RecommendationEngine()

    cluster_data = {}
    recommendations = engine.generate(cluster_data)

    # Should return empty list or handle gracefully
    assert isinstance(recommendations, list)


def test_null_values_handling():
    """Test handling of None/null values in cluster data"""
    engine = RecommendationEngine()

    cluster_data = {
        "cluster": "Test",
        "cpee_change_percent": None,
        "sentimento": None,
        "eem": None
    }

    recommendations = engine.generate(cluster_data)

    # Should not crash and return a list
    assert isinstance(recommendations, list)
