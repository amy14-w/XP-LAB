"""
Test script for fast DSP pipeline components.

Tests:
- Pitch variation analysis
- Energy/RMS analysis
- Filler word detection
- WPM calculation
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import librosa
import numpy as np
from voice_pipeline.fast_dsp import (
    analyze_pitch_variation,
    analyze_energy,
    calculate_filler_rate,
    calculate_wpm,
    analyze_voice_chunk
)


def test_pitch_analysis():
    """Test pitch variation analysis."""
    print("\n=== Testing Pitch Analysis ===")
    
    # Generate test audio (sine wave at 440 Hz - A note)
    duration = 2.0  # 2 seconds
    sr = 22050
    t = np.linspace(0, duration, int(sr * duration))
    audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
    
    result = analyze_pitch_variation(audio, sr)
    print(f"Pitch Variance: {result['pitch_variance']:.2f}")
    print(f"Pitch Range: {result['pitch_range']:.2f} Hz")
    print(f"Average Pitch: {result['average_pitch']:.2f} Hz")
    print(f"Monotone Score: {result['monotone_score']:.2f}")
    print(f"Valid Pitch Ratio: {result['valid_pitch_ratio']:.2f}")
    
    assert result['pitch_variance'] >= 0
    assert result['monotone_score'] >= 0 and result['monotone_score'] <= 1
    print("✓ Pitch analysis test passed\n")


def test_energy_analysis():
    """Test energy/RMS analysis."""
    print("=== Testing Energy Analysis ===")
    
    # Generate test audio with varying amplitude
    duration = 2.0
    sr = 22050
    t = np.linspace(0, duration, int(sr * duration))
    audio = np.sin(2 * np.pi * 440 * t) * 0.5  # 50% amplitude
    
    result = analyze_energy(audio, sr)
    print(f"RMS Mean: {result['rms_mean']:.4f}")
    print(f"RMS Max: {result['rms_max']:.4f}")
    print(f"Energy Normalized: {result['energy_normalized']:.2f}")
    
    assert result['rms_mean'] >= 0
    assert result['energy_normalized'] >= 0 and result['energy_normalized'] <= 1
    print("✓ Energy analysis test passed\n")


def test_filler_detection():
    """Test filler word detection."""
    print("=== Testing Filler Detection ===")
    
    # Test transcript with fillers
    transcript = "So, um, this is a test, you know, and like, uh, we're checking for filler words."
    
    result = calculate_filler_rate(transcript)
    print(f"Filler Count: {result['filler_count']}")
    print(f"Filler Rate: {result['filler_rate']:.3f}")
    print(f"Total Words: {result['total_words']}")
    print(f"Found Fillers: {result['filler_words']}")
    
    assert result['filler_count'] > 0
    assert result['filler_rate'] > 0
    print("✓ Filler detection test passed\n")


def test_wpm_calculation():
    """Test WPM calculation."""
    print("=== Testing WPM Calculation ===")
    
    transcript = "This is a test transcript with multiple words to calculate the speaking rate."
    duration = 5.0  # 5 seconds
    
    result = calculate_wpm(transcript, duration)
    print(f"WPM: {result['wpm']}")
    print(f"Words Count: {result['words_count']}")
    print(f"Duration: {result['duration_seconds']}s")
    print(f"Words Per Second: {result['words_per_second']:.2f}")
    
    # Should be around 108-144 WPM for normal speech (this is ~12 words in 5s = ~144 WPM)
    assert result['wpm'] > 0
    assert result['words_count'] == len(transcript.split())
    print("✓ WPM calculation test passed\n")


def test_full_chunk_analysis():
    """Test complete voice chunk analysis."""
    print("=== Testing Full Chunk Analysis ===")
    
    # Generate test audio
    duration = 2.0
    sr = 22050
    t = np.linspace(0, duration, int(sr * duration))
    audio = np.sin(2 * np.pi * 440 * t) * 0.3
    
    transcript = "This is a test chunk with um some filler words like you know."
    
    result = analyze_voice_chunk(audio, transcript, duration, sr)
    
    print(f"Pitch Variance: {result['pitch']['pitch_variance']:.2f}")
    print(f"Energy RMS: {result['energy']['rms_mean']:.4f}")
    print(f"Filler Rate: {result['filler']['filler_rate']:.3f}")
    print(f"WPM: {result['wpm']['wpm']}")
    
    assert 'pitch' in result
    assert 'energy' in result
    assert 'filler' in result
    assert 'wpm' in result
    print("✓ Full chunk analysis test passed\n")


if __name__ == "__main__":
    print("Running Fast DSP Pipeline Tests\n")
    print("=" * 50)
    
    try:
        test_pitch_analysis()
        test_energy_analysis()
        test_filler_detection()
        test_wpm_calculation()
        test_full_chunk_analysis()
        
        print("=" * 50)
        print("✓ All tests passed!")
    
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

