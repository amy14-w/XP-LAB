"""
Whisper transcription helper for voice pipeline.

Handles audio transcription using OpenAI Whisper API.
"""

import os
import tempfile
import soundfile as sf
import numpy as np
from openai import OpenAI
from typing import Optional


def transcribe_audio_chunk(audio_data: np.ndarray, 
                          sr: int = 22050,
                          openai_api_key: Optional[str] = None) -> str:
    """
    Transcribe audio chunk using OpenAI Whisper API.
    
    Args:
        audio_data: Audio waveform as numpy array
        sr: Sample rate (default 22050 Hz)
        openai_api_key: OpenAI API key (if None, tries to get from env)
    
    Returns:
        Transcribed text string
    """
    # Get API key from env if not provided
    if openai_api_key is None:
        openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    
    # Initialize OpenAI client
    client = OpenAI(api_key=openai_api_key)
    
    # Convert numpy array to temporary WAV file
    tmp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file_path = tmp_file.name
            # Write audio data as WAV file
            sf.write(tmp_file_path, audio_data, sr, format='WAV')
        
        # Transcribe using Whisper API
        with open(tmp_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Return the transcribed text directly (Whisper returns a Transcription object with .text attribute)
        return transcript.text.strip()
    
    finally:
        # Clean up temporary file
        if tmp_file and os.path.exists(tmp_file_path):
            try:
                os.unlink(tmp_file_path)
            except:
                pass


async def transcribe_audio_chunk_async(audio_data: np.ndarray,
                                      sr: int = 22050,
                                      openai_api_key: Optional[str] = None) -> str:
    """
    Async version of transcribe_audio_chunk.
    
    Note: OpenAI API calls are synchronous, but this allows it to be awaited
    in async contexts (you may want to run it in executor for true async).
    """
    # For now, just call sync version
    # In production, you might want to run in executor for true async
    return transcribe_audio_chunk(audio_data, sr, openai_api_key)

