from openai import OpenAI
from app.config import settings
from typing import Dict
import json
import tempfile
import os

client = OpenAI(api_key=settings.openai_api_key)


async def transcribe_audio(audio_data: bytes) -> str:
    """Transcribe audio using OpenAI Whisper API."""
    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        tmp_file.write(audio_data)
        tmp_file_path = tmp_file.name
    
    try:
        with open(tmp_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        return transcript.text
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


async def analyze_lecture_engagement(transcript: str, recent_minutes: int = 3) -> Dict:
    """Analyze lecture transcript for engagement, pacing, etc."""
    prompt = f"""Analyze this lecture transcript segment and provide feedback in valid JSON format:
    
    Transcript: {transcript}
    
    Return ONLY a valid JSON object with these exact keys:
    {{
        "engagement_level": "high" or "medium" or "low",
        "pacing": "too_fast" or "good" or "too_slow",
        "concept_density": "high" or "medium" or "low",
        "suggestions": ["suggestion1", "suggestion2"],
        "talk_time_ratio": 0.0 to 1.0
    }}
    
    Do not include any text outside the JSON object."""
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an AI teaching assistant. Always respond with valid JSON only, no additional text."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = response.choices[0].message.content.strip()
    # Try to extract JSON if there's extra text
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "").strip()
    elif content.startswith("```"):
        content = content.replace("```", "").strip()
    
    return json.loads(content)


async def generate_question_full(lecture_context: str) -> Dict:
    """Generate a complete multiple choice question with 4 options and correct answer."""
    prompt = f"""Based on this lecture content, create a multiple choice question in valid JSON format:
    
    Context: {lecture_context}
    
    Return ONLY a valid JSON object with these exact keys:
    {{
        "question_text": "A clear, concise question",
        "option_a": "First option",
        "option_b": "Second option",
        "option_c": "Third option",
        "option_d": "Fourth option",
        "correct_answer": "a" or "b" or "c" or "d"
    }}
    
    Make the question relevant to the recent lecture content and ensure the correct answer is accurate.
    Do not include any text outside the JSON object."""
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an educational content creator. Always respond with valid JSON only, no additional text."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = response.choices[0].message.content.strip()
    # Try to extract JSON if there's extra text
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "").strip()
    elif content.startswith("```"):
        content = content.replace("```", "").strip()
    
    return json.loads(content)


async def generate_answers_only(question_text: str, lecture_context: str) -> Dict:
    """Generate 4 multiple choice options and correct answer for a given question."""
    prompt = f"""Given this question and lecture context, generate 4 multiple choice options in valid JSON format:
    
    Question: {question_text}
    Context: {lecture_context}
    
    Return ONLY a valid JSON object with these exact keys:
    {{
        "option_a": "First option",
        "option_b": "Second option",
        "option_c": "Third option",
        "option_d": "Fourth option",
        "correct_answer": "a" or "b" or "c" or "d"
    }}
    
    Ensure one option is clearly correct based on the context, and the others are plausible but incorrect.
    Do not include any text outside the JSON object."""
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an educational content creator. Always respond with valid JSON only, no additional text."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = response.choices[0].message.content.strip()
    # Try to extract JSON if there's extra text
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "").strip()
    elif content.startswith("```"):
        content = content.replace("```", "").strip()
    
    return json.loads(content)

