"""
Full pipeline test - Tests complete voice pipeline with sample audio.

Usage:
    python -m ai_assistant.tests.test_full_pipeline --audio-file samples/lecture.wav
"""

import sys
import os
import argparse
import asyncio
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import librosa
import numpy as np
from voice_pipeline.pipeline_manager import VoicePipelineManager


def load_audio_file(file_path: str):
    """Load audio file using librosa."""
    try:
        audio, sr = librosa.load(file_path, sr=22050)
        return audio, sr
    except Exception as e:
        print(f"Error loading audio file: {e}")
        return None, None


async def test_pipeline_with_audio(audio_file: str):
    """Test complete pipeline with audio file."""
    print(f"\n=== Testing Full Pipeline with: {audio_file} ===\n")
    
    # Load audio
    audio, sr = load_audio_file(audio_file)
    if audio is None:
        print("✗ Failed to load audio file")
        return
    
    duration = len(audio) / sr
    print(f"Audio loaded: {duration:.2f} seconds, Sample rate: {sr} Hz\n")
    
    # Initialize pipeline manager
    pipeline = VoicePipelineManager(sentiment_interval=5.0)  # 5s for testing
    
    # Track metrics
    fast_metrics_received = []
    sentiment_received = []
    
    def on_fast_metrics(metrics):
        fast_metrics_received.append(metrics)
        print(f"[Fast DSP] Pitch Variance: {metrics['pitch']['pitch_variance']:.2f}, "
              f"Energy: {metrics['energy']['rms_mean']:.4f}, "
              f"WPM: {metrics['wpm']['wpm']}, "
              f"Filler Rate: {metrics['filler']['filler_rate']:.3f}")
    
    def on_sentiment(sentiment):
        sentiment_received.append(sentiment)
        print(f"\n[Sentiment] Score: {sentiment['sentiment_score']:.2f}, "
              f"Label: {sentiment['sentiment_label']}, "
              f"Tone: {sentiment.get('tone_description', 'N/A')}\n")
    
    pipeline.on_fast_metrics = on_fast_metrics
    pipeline.on_sentiment = on_sentiment
    
    # Process audio in 2-second chunks
    chunk_duration = 2.0
    chunk_size = int(sr * chunk_duration)
    
    print("Processing audio chunks...\n")
    
    for i in range(0, len(audio), chunk_size):
        chunk = audio[i:i + chunk_size]
        
        if len(chunk) < chunk_size:
            # Pad last chunk if needed
            chunk = np.pad(chunk, (0, chunk_size - len(chunk)), mode='constant')
        
        # Mock transcript (in real usage, this would come from Whisper)
        transcript = f"This is chunk {i // chunk_size + 1} of the audio file."
        
        # Process chunk
        metrics = pipeline.process_audio_chunk(
            audio_data=chunk,
            transcript=transcript,
            duration_seconds=chunk_duration,
            sr=sr,
            timestamp=datetime.utcnow()
        )
        
        # Wait a bit to simulate real-time processing
        await asyncio.sleep(0.1)
    
    # Wait for any pending sentiment analysis
    await asyncio.sleep(2)
    
    # Print summary
    print("\n" + "=" * 50)
    print("Pipeline Summary:")
    print("=" * 50)
    summary = pipeline.get_metrics_summary()
    print(f"Total Chunks Processed: {summary['total_chunks']}")
    print(f"Average Pitch Variance: {summary['average_pitch_variance']:.2f}")
    print(f"Average Energy: {summary['average_energy']:.4f}")
    print(f"Average Filler Rate: {summary['average_filler_rate']:.3f}")
    print(f"Average WPM: {summary['average_wpm']:.0f}")
    print(f"Sentiment Checkpoints: {summary['sentiment_checkpoints']}")
    print(f"\nFast Metrics Received: {len(fast_metrics_received)}")
    print(f"Sentiment Analyses Received: {len(sentiment_received)}")
    print("=" * 50)


async def test_pipeline_with_mock_data():
    """Test pipeline with mock data (no audio file needed)."""
    print("\n=== Testing Pipeline with Mock Data ===\n")
    
    pipeline = VoicePipelineManager(sentiment_interval=5.0)
    
    # Generate mock audio chunks
    sr = 22050
    chunk_duration = 2.0
    chunk_size = int(sr * chunk_duration)
    
    for i in range(5):  # 5 chunks = 10 seconds
        # Generate test audio (sine wave)
        t = np.linspace(0, chunk_duration, chunk_size)
        frequency = 440 + (i * 10)  # Varying pitch
        audio_chunk = np.sin(2 * np.pi * frequency * t) * 0.3
        
        # Mock transcript with some fillers
        transcript = f"Chunk {i+1} with um some filler words like you know."
        
        metrics = pipeline.process_audio_chunk(
            audio_data=audio_chunk,
            transcript=transcript,
            duration_seconds=chunk_duration,
            sr=sr
        )
        
        print(f"Chunk {i+1}: Pitch Variance={metrics['pitch']['pitch_variance']:.2f}, "
              f"WPM={metrics['wpm']['wpm']}")
    
    # Process sentiment checkpoint
    await pipeline._process_sentiment_checkpoint()
    
    summary = pipeline.get_metrics_summary()
    print(f"\nSummary: {summary['total_chunks']} chunks, "
          f"{summary['sentiment_checkpoints']} sentiment checkpoints")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Test voice pipeline')
    parser.add_argument('--audio-file', type=str, help='Path to audio file for testing')
    
    args = parser.parse_args()
    
    if args.audio_file:
        if not os.path.exists(args.audio_file):
            print(f"✗ Audio file not found: {args.audio_file}")
            sys.exit(1)
        asyncio.run(test_pipeline_with_audio(args.audio_file))
    else:
        print("No audio file provided. Running mock data test...\n")
        asyncio.run(test_pipeline_with_mock_data())

