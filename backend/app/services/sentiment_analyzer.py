from typing import Dict, List, Union
from textblob import TextBlob


class SentimentAnalyzer:
    """
    Sentiment analysis using TextBlob as fallback.
    For better accuracy, can be extended with transformers (distilbert-pt).
    """

    def __init__(self):
        self.use_transformers = False
        try:
            from transformers import pipeline
            self.transformer = pipeline(
                "sentiment-analysis",
                model="nlptown/bert-base-multilingual-uncased-sentiment"
            )
            self.use_transformers = True
        except (ImportError, ModuleNotFoundError):
            pass

    def analyze(self, text: str) -> Dict[str, Union[str, float]]:
        """Analyze sentiment of a single text"""
        if not text or not text.strip():
            return {"label": "NEUTRAL", "score": 0.0}

        if self.use_transformers:
            result = self.transformer(text[:512])[0]  # Limit to 512 chars
            return {
                "label": result["label"].upper(),
                "score": result["score"]
            }
        else:
            # TextBlob fallback
            # Note: TextBlob scores (absolute polarity) are not directly comparable
            # to transformer scores (probability). TextBlob returns polarity in range [-1, 1],
            # while transformers return probability scores in [0, 1].
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity

            if polarity > 0.1:
                label = "POSITIVE"
            elif polarity < -0.1:
                label = "NEGATIVE"
            else:
                label = "NEUTRAL"

            return {
                "label": label,
                "score": abs(polarity)
            }

    def analyze_batch(self, texts: List[str]) -> List[Dict[str, Union[str, float]]]:
        """Analyze sentiment of multiple texts"""
        return [self.analyze(text) for text in texts]

    def categorize_sentiment(self, text: str) -> str:
        """Return simple POSITIVE | NEGATIVE | NEUTRAL"""
        result = self.analyze(text)
        return result["label"]
