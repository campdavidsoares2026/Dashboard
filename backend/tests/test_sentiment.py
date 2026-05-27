from app.services.sentiment_analyzer import SentimentAnalyzer


def test_sentiment_analyzer_positive():
    analyzer = SentimentAnalyzer()
    # Note: Using English text for TextBlob fallback - TextBlob doesn't support Portuguese
    # When transformers are available, Portuguese text will work properly
    text = "Great work! Very good indeed! Excellent job."
    result = analyzer.analyze(text)

    assert result["label"] == "POSITIVE", f"Expected POSITIVE for positive text, got {result['label']}"
    assert result["score"] > 0, f"Expected positive score, got {result['score']}"


def test_sentiment_batch():
    analyzer = SentimentAnalyzer()
    texts = [
        "Muito bom!",
        "Discordo completamente",
        "Talvez"
    ]
    results = analyzer.analyze_batch(texts)

    assert len(results) == 3
    assert all("label" in r and "score" in r for r in results)


def test_sentiment_empty_string():
    analyzer = SentimentAnalyzer()
    result = analyzer.analyze("")
    assert result["label"] == "NEUTRAL"
    assert result["score"] == 0.0


def test_sentiment_whitespace():
    analyzer = SentimentAnalyzer()
    result = analyzer.analyze("   ")
    assert result["label"] == "NEUTRAL"
    assert result["score"] == 0.0


def test_categorize_sentiment():
    analyzer = SentimentAnalyzer()
    result = analyzer.categorize_sentiment("Muito bom!")
    assert result in ["POSITIVE", "NEGATIVE", "NEUTRAL"]


def test_sentiment_large_batch():
    analyzer = SentimentAnalyzer()
    texts = ["Muito bom!"] * 100
    results = analyzer.analyze_batch(texts)
    assert len(results) == 100
