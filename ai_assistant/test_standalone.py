"""
Standalone test script for voice pipeline.

Run this to quickly test the voice pipeline without needing a real audio file.

Usage:
    python ai_assistant/test_standalone.py
"""

import asyncio
import numpy as np
from datetime import datetime
from voice_pipeline.pipeline_manager import VoicePipelineManager


async def main():
    """Test the voice pipeline with synthetic audio."""
    print("=" * 60)
    print("AI Assistant Voice Pipeline - Standalone Test")
    print("=" * 60)
    print()
    
    # Initialize pipeline
    pipeline = VoicePipelineManager(sentiment_interval=5.0)  # 5s for quick testing
    
    # Track received metrics
    fast_metrics_count = 0
    sentiment_count = 0
    
    def on_fast_metrics(metrics):
        nonlocal fast_metrics_count
        fast_metrics_count += 1
        print(f"[Chunk {fast_metrics_count}] "
              f"Pitch Var: {metrics['pitch']['pitch_variance']:.1f} | "
              f"Energy: {metrics['energy']['rms_mean']:.3f} | "
              f"WPM: {metrics['wpm']['wpm']} | "
              f"Fillers: {metrics['filler']['filler_rate']:.2%}")
    
    def on_sentiment(sentiment):
        nonlocal sentiment_count
        sentiment_count += 1
        print(f"\n[Sentiment Checkpoint {sentiment_count}]")
        print(f"  Score: {sentiment['sentiment_score']:.2f} ({sentiment['sentiment_label']})")
        print(f"  Tone: {sentiment.get('tone_description', 'N/A')}")
        print()
    
    pipeline.on_fast_metrics = on_fast_metrics
    pipeline.on_sentiment = on_sentiment
    
    # Generate and process 6 chunks (12 seconds total)
    # This will trigger 2 sentiment checkpoints (every 5 seconds)
    print("Processing 6 audio chunks (2s each = 12s total)...\n")
    
    sr = 22050
    chunk_duration = 2.0
    chunk_size = int(sr * chunk_duration)
    
    for i in range(6):
        # Generate varying audio (different frequencies to simulate pitch variation)
        t = np.linspace(0, chunk_duration, chunk_size)
        frequency = 200 + (i * 20)  # Varying frequency: 200, 220, 240, etc.
        audio_chunk = np.sin(2 * np.pi * frequency * t) * 0.3
        
        # Mock transcript with varying filler rates
        if i % 2 == 0:
            transcript = f"Chunk {i+1}: This is clear speech without many fillers."
        else:
            transcript = f"Chunk {i+1}: So, um, this has like, you know, some fillers."
        
        # Process chunk
        metrics = pipeline.process_audio_chunk(
            audio_data=audio_chunk,
            transcript=transcript,
            duration_seconds=chunk_duration,
            sr=sr,
            timestamp=datetime.utcnow()
        )
        
        # Small delay to simulate real-time
        await asyncio.sleep(0.1)
    
    # Wait for any pending sentiment analysis
    await asyncio.sleep(1)
    
    # Print summary
    print("\n" + "=" * 60)
    print("Pipeline Summary")
    print("=" * 60)
    summary = pipeline.get_metrics_summary()
    print(f"Total Chunks: {summary['total_chunks']}")
    print(f"Average Pitch Variance: {summary['average_pitch_variance']:.2f}")
    print(f"Average Energy: {summary['average_energy']:.4f}")
    print(f"Average Filler Rate: {summary['average_filler_rate']:.2%}")
    print(f"Average WPM: {summary['average_wpm']:.0f}")
    print(f"Sentiment Checkpoints: {summary['sentiment_checkpoints']}")
    print("=" * 60)
    print("\n✓ Test completed successfully!")
    print("\nNote: Sentiment analysis requires OPENAI_API_KEY in .env")
    print("      Without it, sentiment will fail but fast DSP metrics will work.\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
    except Exception as e:
        print(f"\n\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

