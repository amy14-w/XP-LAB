"""
Real-time microphone recording and voice pipeline processing.

Captures audio from microphone in 3.5-second chunks and processes through voice pipeline.
Whisper transcription is batched every 10 seconds for better quality and efficiency.

Usage:
    python ai_assistant/test_mic_realtime.py
"""

import asyncio
import sounddevice as sd
import numpy as np
from datetime import datetime
import sys
import os
from concurrent.futures import ThreadPoolExecutor
from voice_pipeline.pipeline_manager import VoicePipelineManager
from voice_pipeline.whisper_transcriber import transcribe_audio_chunk
from voice_pipeline.fast_dsp import calculate_filler_rate, calculate_wpm


# Audio settings (must match pipeline expectations)
SAMPLE_RATE = 22050  # Hz
CHUNK_DURATION = 3.5  # seconds
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)  # samples per chunk

# Transcription batching settings
TRANSCRIPTION_BATCH_DURATION = 10.0  # seconds - batch transcription every 10s


def print_metrics_header():
    """Print header for metrics display."""
    print("\n" + "=" * 80)
    print("REAL-TIME VOICE ANALYSIS")
    print("=" * 80)
    print(f"Sample Rate: {SAMPLE_RATE} Hz")
    print(f"Chunk Duration: {CHUNK_DURATION} seconds")
    print("Press Ctrl+C to stop recording")
    print("=" * 80 + "\n")


def print_fast_metrics(chunk_num: int, metrics: dict, transcript: str = ""):
    """Print fast DSP metrics for a chunk."""
    pitch = metrics.get('pitch', {})
    energy = metrics.get('energy', {})
    filler = metrics.get('filler', {})
    wpm = metrics.get('wpm', {})
    
    print(f"[Chunk {chunk_num}] " + "-" * 70)
    # Pitch metrics
    pitch_var = pitch.get('pitch_variance', 0)
    monotone = pitch.get('monotone_score', 1.0)
    avg_pitch = pitch.get('average_pitch', 0)
    print(f"  Pitch Variance:  {pitch_var:.2f} Hz²")
    print(f"                   (Typical: 50-500 Hz² | Higher = more varied)")
    print(f"  Monotone Score:  {monotone:.2f} (0.0 = varied, 1.0 = monotone)")
    print(f"                   (Good: <0.3 | Monotone: >0.7)")
    print(f"  Average Pitch:   {avg_pitch:.1f} Hz")
    print(f"                   (Male: ~85-180 Hz | Female: ~165-255 Hz)")
    
    # Energy metrics
    rms_mean = energy.get('rms_mean', 0)
    energy_norm = energy.get('energy_normalized', 0)
    print(f"  Energy (RMS):    {rms_mean:.4f} (raw)")
    print(f"                   Normalized: {energy_norm:.2f} (0.0 = quiet, 1.0 = loud)")
    print(f"                   (Typical speech: 0.01-0.5 raw | Good: 0.1-0.3 raw)")
    
    # Filler metrics
    filler_rate = filler.get('filler_rate', 0)
    filler_count = filler.get('filler_count', 0)
    total_words = filler.get('total_words', 0)
    print(f"  Filler Rate:     {filler_rate:.2%} ({filler_count}/{total_words} words)")
    print(f"                   (Excellent: <2% | Good: 2-5% | High: >10%)")
    
    # WPM metrics
    wpm_val = wpm.get('wpm', 0)
    print(f"  WPM:             {wpm_val} words/min")
    print(f"                   (Slow: <120 | Normal: 120-160 | Fast: >180 | Very Fast: >200)")
    
    if transcript:
        transcript_preview = transcript[:60]
        if len(transcript) > 60:
            transcript_preview += "..."
        print(f"  Transcript:      {transcript_preview}")
        print(f"                   (via OpenAI Whisper API)")
    print()


def print_sentiment(sentiment: dict):
    """Print sentiment analysis results."""
    print("\n" + "=" * 80)
    print("SENTIMENT CHECKPOINT")
    print("=" * 80)
    print(f"  Label:     {sentiment.get('sentiment_label', 'N/A')}")
    print(f"  Score:     {sentiment.get('sentiment_score', 0):.2f}")
    print(f"  Tone:      {sentiment.get('tone_description', 'N/A')}")
    if sentiment.get('transcript_segment'):
        transcript_preview = sentiment['transcript_segment'][:100]
        if len(sentiment['transcript_segment']) > 100:
            transcript_preview += "..."
        print(f"  Transcript: {transcript_preview}")
    print("=" * 80 + "\n")


async def record_and_process():
    """Main function to record from microphone and process in real-time."""
    pipeline = VoicePipelineManager(sentiment_interval=10.0)  # 10s for testing
    
    # Check for OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY")
    use_whisper = openai_key is not None
    
    if not use_whisper:
        print("⚠ WARNING: OPENAI_API_KEY not found in environment.")
        print("   Whisper transcription disabled - filler rate and WPM will be 0.")
        print("   Set OPENAI_API_KEY in .env file to enable transcription.\n")
    else:
        print("✓ Whisper transcription enabled - full metrics will be calculated.")
        print(f"   Transcription batching: every {TRANSCRIPTION_BATCH_DURATION}s for better quality.\n")
    
    # Thread pool for running Whisper transcription (since it's blocking)
    executor = ThreadPoolExecutor(max_workers=1)
    
    # Track chunk count and transcripts
    chunk_count = 0
    chunk_transcripts = {}  # Store transcripts per chunk for display
    chunk_metric_indices = {}  # Track which metric index corresponds to each chunk
    
    # Transcription batching buffer
    audio_buffer = []  # Accumulate audio chunks for batching
    batch_chunk_indices = []  # Track which chunk indices belong to current batch
    accumulated_duration = 0.0  # Track accumulated duration in buffer
    
    def on_fast_metrics(metrics):
        nonlocal chunk_count
        chunk_count += 1
        # Get transcript for this chunk if available
        transcript = chunk_transcripts.get(chunk_count, "")
        print_fast_metrics(chunk_count, metrics, transcript)
    
    def on_sentiment(sentiment):
        print_sentiment(sentiment)
    
    pipeline.on_fast_metrics = on_fast_metrics
    pipeline.on_sentiment = on_sentiment
    
    print_metrics_header()
    
    try:
        print("Starting microphone recording...")
        print("Speak into your microphone!\n")
        
        # Record audio in chunks
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,  # Mono
            dtype='float32',
            blocksize=CHUNK_SIZE
        ) as stream:
            
            while True:
                # Read 3.5 seconds of audio
                audio_chunk, overflowed = stream.read(CHUNK_SIZE)
                
                if overflowed:
                    print("⚠ Warning: Audio buffer overflowed")
                
                # Convert to numpy array (flatten if needed)
                if audio_chunk.ndim > 1:
                    audio_chunk = audio_chunk[:, 0]  # Take first channel if stereo
                
                # Current chunk index
                current_chunk_idx = chunk_count + 1
                
                # Add to transcription buffer
                audio_buffer.append(audio_chunk.copy())
                batch_chunk_indices.append(current_chunk_idx)
                accumulated_duration += CHUNK_DURATION
                
                # Use transcript if available, otherwise empty (will be filled on next batch)
                transcript = chunk_transcripts.get(current_chunk_idx, "")
                
                # Process chunk through pipeline
                # This runs synchronously for fast metrics, async for sentiment
                metrics = pipeline.process_audio_chunk(
                    audio_data=audio_chunk,
                    transcript=transcript,
                    duration_seconds=CHUNK_DURATION,
                    sr=SAMPLE_RATE,
                    timestamp=datetime.utcnow()
                )
                
                # Track metric index for this chunk (for later updates)
                metric_index = len(pipeline.fast_metrics_history) - 1
                chunk_metric_indices[current_chunk_idx] = metric_index
                
                # Check if we've accumulated enough for transcription batch
                if use_whisper and accumulated_duration >= TRANSCRIPTION_BATCH_DURATION:
                    try:
                        # Concatenate all audio chunks in buffer
                        batched_audio = np.concatenate(audio_buffer)
                        
                        # Transcribe the batch
                        print(f"\n🔄 Transcribing {accumulated_duration:.1f}s batch...")
                        loop = asyncio.get_event_loop()
                        batch_transcript = await loop.run_in_executor(
                            executor,
                            transcribe_audio_chunk,
                            batched_audio,
                            SAMPLE_RATE,
                            openai_key
                        )
                        
                        # Calculate filler_rate from batch transcript (same for all chunks in batch)
                        filler_metrics = calculate_filler_rate(batch_transcript)
                        
                        # Calculate WPM from batch transcript using batch duration
                        # (This gives the actual speaking rate, which applies to all chunks in the batch)
                        wpm_metrics = calculate_wpm(batch_transcript, accumulated_duration)
                        
                        # Update metrics for all chunks in this batch
                        for chunk_idx in batch_chunk_indices:
                            chunk_transcripts[chunk_idx] = batch_transcript
                            
                            # Update the stored metric with new filler_rate and WPM
                            if chunk_idx in chunk_metric_indices:
                                metric_idx = chunk_metric_indices[chunk_idx]
                                if metric_idx < len(pipeline.fast_metrics_history):
                                    metric = pipeline.fast_metrics_history[metric_idx]
                                    # Update filler and WPM metrics
                                    metric['filler'] = filler_metrics.copy()
                                    metric['wpm'] = wpm_metrics.copy()
                        
                        print(f"✓ Transcription complete: \"{batch_transcript[:60]}{'...' if len(batch_transcript) > 60 else ''}\"\n")
                        print(f"   ↳ Updated filler_rate ({filler_metrics['filler_rate']:.1%}) and WPM ({wpm_metrics['wpm']}) for chunks {batch_chunk_indices[0]}-{batch_chunk_indices[-1]}\n")
                        
                    except Exception as e:
                        print(f"⚠ Transcription error: {e}")
                        # Leave transcripts as empty for this batch
                    
                    # Reset buffer for next batch
                    audio_buffer = []
                    batch_chunk_indices = []
                    accumulated_duration = 0.0
                
                # Process any pending sentiment analysis
                try:
                    await asyncio.sleep(0.1)  # Allow async tasks to run
                except asyncio.CancelledError:
                    # Task was cancelled (likely due to KeyboardInterrupt)
                    break  # Exit the loop cleanly
            
            # Transcribe any remaining audio in buffer before exiting
            if audio_buffer and use_whisper:
                try:
                    print(f"\n🔄 Transcribing final {accumulated_duration:.1f}s batch...")
                    batched_audio = np.concatenate(audio_buffer)
                    loop = asyncio.get_event_loop()
                    batch_transcript = await loop.run_in_executor(
                        executor,
                        transcribe_audio_chunk,
                        batched_audio,
                        SAMPLE_RATE,
                        openai_key
                    )
                    
                    # Calculate filler_rate and WPM from final batch transcript
                    filler_metrics = calculate_filler_rate(batch_transcript)
                    wpm_metrics = calculate_wpm(batch_transcript, accumulated_duration)
                    
                    # Update metrics for remaining chunks
                    for chunk_idx in batch_chunk_indices:
                        chunk_transcripts[chunk_idx] = batch_transcript
                        
                        # Update the stored metric with new filler_rate and WPM
                        if chunk_idx in chunk_metric_indices:
                            metric_idx = chunk_metric_indices[chunk_idx]
                            if metric_idx < len(pipeline.fast_metrics_history):
                                metric = pipeline.fast_metrics_history[metric_idx]
                                metric['filler'] = filler_metrics.copy()
                                metric['wpm'] = wpm_metrics.copy()
                    
                    print(f"✓ Final transcription complete: \"{batch_transcript[:60]}{'...' if len(batch_transcript) > 60 else ''}\"\n")
                    print(f"   ↳ Updated filler_rate ({filler_metrics['filler_rate']:.1%}) and WPM ({wpm_metrics['wpm']}) for chunks {batch_chunk_indices[0]}-{batch_chunk_indices[-1]}\n")
                except Exception as e:
                    print(f"⚠ Final transcription error: {e}")
                
    except (KeyboardInterrupt, asyncio.CancelledError):
        # Transcribe any remaining audio in buffer before exiting
        if 'audio_buffer' in locals() and audio_buffer and 'use_whisper' in locals() and use_whisper:
            try:
                print(f"\n🔄 Transcribing final {accumulated_duration:.1f}s batch...")
                batched_audio = np.concatenate(audio_buffer)
                loop = asyncio.get_event_loop()
                batch_transcript = await loop.run_in_executor(
                    executor,
                    transcribe_audio_chunk,
                    batched_audio,
                    SAMPLE_RATE,
                    openai_key
                )
                
                # Calculate filler_rate and WPM from final batch transcript
                filler_metrics = calculate_filler_rate(batch_transcript)
                wpm_metrics = calculate_wpm(batch_transcript, accumulated_duration)
                
                # Update metrics for remaining chunks
                for chunk_idx in batch_chunk_indices:
                    chunk_transcripts[chunk_idx] = batch_transcript
                    
                    # Update the stored metric with new filler_rate and WPM
                    if chunk_idx in chunk_metric_indices:
                        metric_idx = chunk_metric_indices[chunk_idx]
                        if metric_idx < len(pipeline.fast_metrics_history):
                            metric = pipeline.fast_metrics_history[metric_idx]
                            metric['filler'] = filler_metrics.copy()
                            metric['wpm'] = wpm_metrics.copy()
                
                print(f"✓ Final transcription complete: \"{batch_transcript[:60]}{'...' if len(batch_transcript) > 60 else ''}\"\n")
                print(f"   ↳ Updated filler_rate ({filler_metrics['filler_rate']:.1%}) and WPM ({wpm_metrics['wpm']}) for chunks {batch_chunk_indices[0]}-{batch_chunk_indices[-1]}\n")
            except Exception as e:
                print(f"⚠ Final transcription error: {e}")
        pass  # Will handle in finally block
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # Shutdown executor
        if 'executor' in locals():
            executor.shutdown(wait=False)
        
        # Always print summary, even on interrupt
        print("\n\n" + "=" * 80)
        print("Recording stopped by user")
        print("=" * 80)
        
        # Print final summary
        summary = pipeline.get_metrics_summary()
        print("\nFINAL SUMMARY")
        print("=" * 80)
        print(f"Total Chunks Processed: {summary['total_chunks']}")
        print(f"Average Pitch Variance: {summary['average_pitch_variance']:.2f} Hz²")
        print(f"Average Energy: {summary['average_energy']:.4f}")
        print(f"Average Filler Rate: {summary['average_filler_rate']:.2%}")
        print(f"Average WPM: {summary['average_wpm']:.0f} words/min")
        print(f"Sentiment Checkpoints: {summary['sentiment_checkpoints']}")
        print("=" * 80)
        print("\n✓ Processing complete!\n")


def list_audio_devices():
    """List available audio input devices."""
    print("\nAvailable audio input devices:")
    print("-" * 80)
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        if device['max_input_channels'] > 0:
            default = " (DEFAULT)" if i == sd.default.device[0] else ""
            print(f"  [{i}] {device['name']}{default}")
            print(f"      Channels: {device['max_input_channels']}, "
                  f"Sample Rate: {device['default_samplerate']:.0f} Hz")
    print("-" * 80 + "\n")


if __name__ == "__main__":
    # Check if user wants to list devices
    if len(sys.argv) > 1 and sys.argv[1] == "--list-devices":
        list_audio_devices()
        sys.exit(0)
    
    # Run main recording loop
    # KeyboardInterrupt is handled inside record_and_process()
    asyncio.run(record_and_process())

