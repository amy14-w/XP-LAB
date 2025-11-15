"""
Voice Pipeline Module

Fast DSP pipeline for real-time voice quality analysis.
"""

from .fast_dsp import (
    analyze_pitch_variation,
    analyze_energy,
    calculate_filler_rate,
    calculate_wpm,
    analyze_voice_chunk
)

from .sentiment_analyzer import analyze_sentiment

from .pipeline_manager import VoicePipelineManager

__all__ = [
    'analyze_pitch_variation',
    'analyze_energy',
    'calculate_filler_rate',
    'calculate_wpm',
    'analyze_voice_chunk',
    'analyze_sentiment',
    'VoicePipelineManager'
]

