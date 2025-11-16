"""
Sentiment Analyzer - GPT-4 based sentiment analysis (10-15s checkpoints)

Analyzes transcript segments for emotional tone and delivery quality.
"""

from openai import OpenAI
from typing import Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


async def analyze_sentiment(transcript_segment: str) -> Dict:
    """
    Analyze sentiment of transcript segment using GPT-4.
    
    Args:
        transcript_segment: Combined transcript from last 10-15 seconds
    
    Returns:
        Dictionary with sentiment metrics:
        - sentiment_score: -1 to 1 (negative to positive)
        - sentiment_label: 'positive', 'negative', or 'neutral'
        - confidence: Confidence score (0-1)
        - tone_description: Brief description of delivery tone
        - engagement_indicators: List of engagement-related observations
    """
    if not transcript_segment or not transcript_segment.strip():
        return {
            'sentiment_score': 0.0,
            'sentiment_label': 'neutral',
            'confidence': 0.0,
            'tone_description': 'No content to analyze',
            'engagement_indicators': []
        }
    
    prompt = f"""Analyze the sentiment and delivery tone of this lecture transcript segment.

Transcript: {transcript_segment}

Return ONLY a valid JSON object with these exact keys:
{{
    "sentiment_score": float between -1.0 and 1.0 (negative to positive),
    "sentiment_label": "positive" or "negative" or "neutral",
    "confidence": float between 0.0 and 1.0,
    "tone_description": "Brief description of the delivery tone (e.g., 'Enthusiastic and engaging', 'Monotone and disengaged', 'Clear and confident')",
    "engagement_indicators": ["List of", "engagement-related", "observations"]
}}

Do not include any text outside the JSON object."""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI teaching assistant that analyzes lecture delivery. Always respond with valid JSON only, no additional text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent analysis
            max_tokens=200
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON if wrapped in code blocks
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        import json
        sentiment_data = json.loads(content)
        
        return sentiment_data
    
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return {
            'sentiment_score': 0.0,
            'sentiment_label': 'neutral',
            'confidence': 0.0,
            'tone_description': f'Error analyzing sentiment: {str(e)}',
            'engagement_indicators': [],
            'error': str(e)
        }

