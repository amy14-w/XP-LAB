"""
Audio WebSocket Handler - Uses ai_assistant logic directly

This handler receives audio from the browser (WebM format) and processes it
using the exact same logic as ai_assistant/test_mic_realtime.py
"""

from fastapi import WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK, ConnectionClosedError
from app.database import supabase
from uuid import uuid4
from datetime import datetime
from typing import Dict, Optional, Tuple
import asyncio
import base64
import json
import tempfile
import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor

# AI Assistant Voice Pipeline imports - USE THE EXACT LOGIC FROM ai_assistant
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ai_assistant.voice_pipeline.pipeline_manager import VoicePipelineManager
from ai_assistant.voice_pipeline.fast_dsp import calculate_filler_rate, calculate_wpm
from ai_assistant.voice_pipeline.whisper_transcriber import transcribe_audio_chunk

# Audio processing
import librosa

# Store active lecture transcripts and AI suggestion timers
lecture_transcripts: Dict[str, str] = {}  # lecture_id -> accumulated transcript
ai_suggestion_timers: Dict[str, asyncio.Task] = {}  # lecture_id -> timer task
last_question_time: Dict[str, datetime] = {}  # lecture_id -> last question time
rejection_delays: Dict[str, float] = {}  # lecture_id -> additional delay in seconds
lecture_talk_time: Dict[str, float] = {}  # lecture_id -> total talk time in seconds (from audio chunks)

# Store voice pipelines per lecture (using EXACT same structure as test_mic_realtime.py)
voice_pipelines: Dict[str, VoicePipelineManager] = {}  # lecture_id -> VoicePipelineManager
voice_pipeline_executors: Dict[str, ThreadPoolExecutor] = {}  # lecture_id -> ThreadPoolExecutor

# Transcription batching (EXACT same as test_mic_realtime.py)
transcription_buffers: Dict[str, list] = {}  # lecture_id -> list of audio chunks
batch_chunk_indices: Dict[str, list] = {}  # lecture_id -> list of chunk indices
accumulated_duration: Dict[str, float] = {}  # lecture_id -> accumulated seconds
chunk_transcripts: Dict[str, dict] = {}  # lecture_id -> {chunk_idx: transcript}
chunk_metric_indices: Dict[str, dict] = {}  # lecture_id -> {chunk_idx: metric_idx}

# Queue for sentiment messages (to send in main loop)
sentiment_queues: Dict[str, asyncio.Queue] = {}  # lecture_id -> Queue for sentiment messages

# Track first chunk for each lecture (to check magic bytes only once)
first_chunk_received: Dict[str, bool] = {}  # lecture_id -> whether first chunk was received

# Store PCM metadata for each lecture (from JSON messages, used when binary PCM arrives)
pcm_metadata_queue: Dict[str, dict] = {}  # lecture_id -> PCM metadata dict

# Settings (matching test_mic_realtime.py)
SAMPLE_RATE = 22050  # Hz
CHUNK_DURATION = 2.0  # seconds (from frontend - 2 second chunks)
TRANSCRIPTION_BATCH_DURATION = 10.0  # seconds - batch transcription every 10s


def convert_pcm_bytes_to_audio(pcm_bytes: bytes, sample_rate: int = 16000) -> Tuple[np.ndarray, int]:
    """
    Convert PCM bytes (Int16) directly to numpy array.
    This replaces WebM conversion for real-time PCM streaming.
    
    Args:
        pcm_bytes: Raw PCM audio data as bytes (Int16 format)
        sample_rate: Sample rate in Hz (default 16000)
    
    Returns:
        Tuple of (audio_array, sample_rate)
    """
    try:
        if not pcm_bytes or len(pcm_bytes) == 0:
            print("❌ ERROR: Empty PCM bytes received")
            return np.array([]), sample_rate
        
        # Convert bytes to Int16 array, then to Float32 numpy array
        # Int16 range: -32768 to 32767
        # Float32 range: -1.0 to 1.0
        int16_array = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_array = int16_array.astype(np.float32) / 32768.0
        
        # Clip to [-1, 1] range (safety check)
        audio_array = np.clip(audio_array, -1.0, 1.0)
        
        print(f"✓ Converted PCM: {len(pcm_bytes)} bytes → {len(audio_array)} samples ({len(audio_array)/sample_rate:.2f}s)")
        return audio_array, sample_rate
    
    except Exception as e:
        print(f"❌ ERROR: Failed to convert PCM bytes: {e}")
        import traceback
        traceback.print_exc()
        return np.array([]), sample_rate


def convert_webm_base64_to_audio(audio_base64: str, check_magic_bytes: bool = True) -> Tuple[np.ndarray, int]:
    """
    Convert base64-encoded WebM audio to numpy array.
    This replaces the microphone input from test_mic_realtime.py
    
    Uses multiple methods to handle WebM:
    1. Try librosa with ffmpeg backend (if ffmpeg is available)
    2. Try pydub to convert WebM to WAV, then load with librosa
    3. Fall back to error handling
    
    Args:
        audio_base64: Base64-encoded WebM audio data
    
    Returns:
        Tuple of (audio_array, sample_rate)
    """
    try:
        # Validate base64 input
        if not audio_base64 or len(audio_base64) == 0:
            print("❌ ERROR: Empty base64 audio data received")
            return np.array([]), SAMPLE_RATE
        
        # Validate base64 format (basic check - should only contain base64 characters)
        import re
        base64_pattern = re.compile(r'^[A-Za-z0-9+/]*={0,2}$')
        if not base64_pattern.match(audio_base64):
            print(f"❌ ERROR: Invalid base64 format (first 50 chars: {audio_base64[:50]})")
            return np.array([]), SAMPLE_RATE
        
        # Decode base64 to bytes
        try:
            audio_bytes = base64.b64decode(audio_base64, validate=True)
        except Exception as decode_error:
            print(f"❌ ERROR: Failed to decode base64: {decode_error}")
            print(f"   Base64 length: {len(audio_base64)} chars")
            print(f"   First 100 chars: {audio_base64[:100]}")
            return np.array([]), SAMPLE_RATE
        
        # Validate decoded bytes are not empty
        if len(audio_bytes) == 0:
            print("❌ ERROR: Decoded audio bytes are empty")
            return np.array([]), SAMPLE_RATE
        
        # Validate minimum file size (WebM header is typically > 100 bytes)
        if len(audio_bytes) < 100:
            print(f"⚠ WARNING: Suspiciously small audio file: {len(audio_bytes)} bytes (expected > 100 bytes)")
        
        # Check for WebM magic bytes (first 4 bytes should be: 1A 45 DF A3)
        # NOTE: Only check magic bytes if requested (for first chunk).
        # MediaRecorder with timeslice produces fragmented WebM segments - only the 
        # first chunk has the header, subsequent chunks are continuation segments without magic bytes.
        webm_magic = audio_bytes[:4]
        expected_magic = b'\x1a\x45\xdf\xa3'
        
        # Log magic bytes for debugging
        if webm_magic == expected_magic:
            print(f"✓ WebM magic bytes detected: {webm_magic.hex()}")
        else:
            if check_magic_bytes:
                # For first chunk, warn but still try to process (some encodings might be different)
                print(f"⚠ WARNING: First chunk doesn't start with expected WebM magic bytes")
                print(f"   Expected: {expected_magic.hex()}, Got: {webm_magic.hex()}")
                print(f"   Attempting to process anyway (might be valid WebM with different encoding)")
            else:
                # For continuation segments, no magic bytes is normal
                print(f"ℹ Continuation segment (no magic bytes - this is normal): {webm_magic.hex()}")
        
        # Note: We no longer reject chunks based on magic bytes alone.
        # Let ffmpeg/pydub decide if the chunk is valid - it's better at handling
        # various WebM encodings and continuation segments.
        
        print(f"✓ Received audio: {len(audio_bytes)} bytes (base64: {len(audio_base64)} chars)")
        
        # Save to temporary file (WebM format)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_file.flush()  # Ensure data is written
            os.fsync(tmp_file.fileno())  # Ensure data is flushed to disk
            tmp_file_path = tmp_file.name
        
        # Verify file was written correctly
        if not os.path.exists(tmp_file_path):
            print(f"❌ ERROR: Temporary file was not created: {tmp_file_path}")
            return np.array([]), SAMPLE_RATE
        
        file_size = os.path.getsize(tmp_file_path)
        if file_size != len(audio_bytes):
            print(f"⚠ WARNING: File size mismatch. Expected: {len(audio_bytes)}, Got: {file_size}")
        else:
            print(f"✓ Temporary file created: {tmp_file_path} ({file_size} bytes)")
        
        try:
            # Use pydub to convert WebM to numpy array (pydub handles WebM with ffmpeg)
            from pydub import AudioSegment
            from pydub.utils import which
            import shutil
            
            # Try to find ffmpeg in PATH or common Windows locations
            ffmpeg_path = which("ffmpeg") or shutil.which("ffmpeg")
            
            # If not in PATH, check common Windows installation locations
            if ffmpeg_path is None:
                common_paths = [
                    r"C:\ffmpeg\bin\ffmpeg.exe",
                    r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                    r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
                    os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\ffmpeg*\bin\ffmpeg.exe"),
                    os.path.expanduser(r"~\AppData\Local\ffmpeg\bin\ffmpeg.exe"),
                ]
                
                for path in common_paths:
                    # Handle wildcard expansion
                    if "*" in path:
                        import glob
                        matches = glob.glob(path)
                        if matches:
                            ffmpeg_path = matches[0]
                            break
                    elif os.path.exists(path):
                        ffmpeg_path = path
                        break
                
                # If found, set it for pydub
                if ffmpeg_path:
                    # Set ffmpeg path for pydub
                    AudioSegment.converter = ffmpeg_path
                    AudioSegment.ffmpeg = ffmpeg_path
                    AudioSegment.ffprobe = ffmpeg_path.replace("ffmpeg.exe", "ffprobe.exe") if "ffmpeg.exe" in ffmpeg_path else ffmpeg_path
                    print(f"✓ Found ffmpeg at: {ffmpeg_path}")
            
            try:
                # Load WebM with pydub (uses ffmpeg under the hood)
                audio_segment = AudioSegment.from_file(tmp_file_path, format="webm")
                
                # Convert to WAV format (temp file) with proper sample rate and mono
                wav_temp_path = tmp_file_path.replace(".webm", ".wav")
                audio_segment.export(
                    wav_temp_path, 
                    format="wav",
                    parameters=["-ac", "1", "-ar", str(SAMPLE_RATE)]  # Mono, sample rate
                )
                
                try:
                    # Load WAV with librosa (this works since WAV is supported)
                    audio_array, sr = librosa.load(wav_temp_path, sr=SAMPLE_RATE, mono=True)
                    return audio_array, sr
                except Exception as librosa_error:
                    # If librosa fails, convert AudioSegment directly to numpy array
                    print(f"⚠ librosa failed to load WAV, converting AudioSegment directly: {librosa_error}")
                    
                    # Get raw audio data from AudioSegment
                    raw_audio = np.array(audio_segment.get_array_of_samples(), dtype=np.float32)
                    
                    # Convert to mono if stereo
                    if audio_segment.channels == 2:
                        raw_audio = raw_audio.reshape((-1, 2)).mean(axis=1)
                    
                    # Normalize to [-1, 1] range based on sample width
                    if audio_segment.sample_width == 2:  # 16-bit
                        raw_audio = raw_audio / 32768.0
                    elif audio_segment.sample_width == 4:  # 32-bit
                        raw_audio = raw_audio / 2147483648.0
                    else:  # 8-bit
                        raw_audio = (raw_audio - 128) / 128.0
                    
                    # Resample to target sample rate if needed
                    if audio_segment.frame_rate != SAMPLE_RATE:
                        from scipy import signal
                        num_samples = int(len(raw_audio) * SAMPLE_RATE / audio_segment.frame_rate)
                        raw_audio = signal.resample(raw_audio, num_samples)
                    
                    return raw_audio, SAMPLE_RATE
                finally:
                    # Clean up WAV temp file
                    if os.path.exists(wav_temp_path):
                        try:
                            os.unlink(wav_temp_path)
                        except:
                            pass
                            
            except FileNotFoundError as ffmpeg_error:
                # ffmpeg not found
                print(f"❌ ERROR: ffmpeg not found. Cannot process WebM audio.")
                print(f"   Error: {ffmpeg_error}")
                print(f"\n   To fix this:")
                print(f"   1. Install ffmpeg:")
                print(f"      Windows: winget install ffmpeg")
                print(f"      Or download from: https://www.gyan.dev/ffmpeg/builds/")
                print(f"      Or: https://ffmpeg.org/download.html")
                print(f"   2. Add ffmpeg to your PATH:")
                print(f"      - Find where ffmpeg.exe was installed")
                print(f"      - Add that folder to your system PATH")
                print(f"   3. Restart your terminal and backend server")
                print(f"   4. Verify: ffmpeg -version")
                raise
            except Exception as pydub_error:
                # Other pydub errors
                error_msg = str(pydub_error).lower()
                if "ffmpeg" in error_msg:
                    print(f"❌ ERROR: ffmpeg issue. Cannot process WebM audio.")
                    print(f"   Error: {pydub_error}")
                    print(f"\n   Please install ffmpeg (see instructions above)")
                    raise
                else:
                    print(f"❌ Error loading WebM with pydub: {pydub_error}")
                    import traceback
                    traceback.print_exc()
                    raise
        finally:
            # Clean up temp file
            if os.path.exists(tmp_file_path):
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass
    except Exception as e:
        print(f"Error converting audio: {e}")
        import traceback
        traceback.print_exc()
        # Return empty audio array on error
        return np.array([]), SAMPLE_RATE


def map_ai_metrics_to_frontend(metrics: Dict) -> Dict:
    """
    Map AI assistant metrics to frontend format.
    
    Frontend expects: { volume, clarity, pace, pitch } (all 0-100%)
    
    Our metrics (from ai_assistant):
    - Energy (RMS): 0-1 -> volume (0-100%)
    - Filler rate: 0-1 -> clarity (inverse: 1 - filler_rate) * 100
    - WPM: words/min -> pace (normalized to 0-100%, optimal around 150 WPM)
    - Monotone score: 0-1 -> pitch (inverse: 1 - monotone_score) * 100 (varied = good)
    
    Args:
        metrics: Metrics from VoicePipelineManager (same format as test_mic_realtime.py)
    
    Returns:
        Dict with { volume, clarity, pace, pitch } (0-100%)
    """
    pitch_metrics = metrics.get('pitch', {})
    energy_metrics = metrics.get('energy', {})
    filler_metrics = metrics.get('filler', {})
    wpm_metrics = metrics.get('wpm', {})
    
    # Volume: Energy (RMS) normalized to 0-100%
    # Energy normalized is already 0-1, multiply by 100
    energy_normalized = energy_metrics.get('energy_normalized', 0.0)
    volume = min(max(energy_normalized * 100, 0), 100)
    
    # Clarity: Inverse of filler rate (less fillers = more clarity)
    # Filler rate 0 = 100% clarity, filler rate 1 = 0% clarity
    filler_rate = filler_metrics.get('filler_rate', 0.0)
    clarity = min(max((1.0 - filler_rate) * 100, 0), 100)
    
    # Pace: Normalize WPM to 0-100% (optimal around 150 WPM)
    # Too slow (< 120) or too fast (> 200) = lower score
    # Optimal range: 120-180 WPM = 70-100%
    wpm = wpm_metrics.get('wpm', 0)
    if wpm == 0:
        pace = 0
    elif wpm < 120:
        pace = (wpm / 120) * 70  # 0-70% for slow speech
    elif wpm <= 180:
        # Optimal range: 120-180 WPM maps to 70-100%
        pace = 70 + ((wpm - 120) / 60) * 30
    else:
        # Too fast: 180+ WPM starts decreasing from 100%
        pace = max(100 - ((wpm - 180) / 20) * 20, 0)  # Decrease gradually
    
    # Pitch Variation: Inverse of monotone score (varied = good)
    # Monotone score 0 (varied) = 100% pitch, monotone score 1 (monotone) = 0%
    monotone_score = pitch_metrics.get('monotone_score', 1.0)
    pitch = min(max((1.0 - monotone_score) * 100, 0), 100)
    
    return {
        'volume': round(volume, 1),
        'clarity': round(clarity, 1),
        'pace': round(pace, 1),
        'pitch': round(pitch, 1)
    }


async def audio_websocket_handler(websocket: WebSocket, lecture_id: str, professor_id: str):
    """
    Handle WebSocket connection for audio streaming from professor.
    
    This uses the EXACT same logic as ai_assistant/test_mic_realtime.py,
    but adapted for WebSocket and browser audio instead of microphone.
    """
    await websocket.accept()
    
    # Initialize voice pipeline for this lecture (EXACT same as test_mic_realtime.py)
    if lecture_id not in voice_pipelines:
        pipeline = VoicePipelineManager(sentiment_interval=12.0)  # 12s for sentiment
        voice_pipelines[lecture_id] = pipeline
        voice_pipeline_executors[lecture_id] = ThreadPoolExecutor(max_workers=1)
        # Reset first chunk flag for new connection
        first_chunk_received[lecture_id] = False
        
        # Check for OpenAI API key
        from app.config import settings
        openai_key = settings.openai_api_key if hasattr(settings, 'openai_api_key') else os.getenv('OPENAI_API_KEY')
        use_whisper = openai_key is not None
        
        if not use_whisper:
            print(f"⚠ WARNING: OPENAI_API_KEY not found for lecture {lecture_id}")
            print("   Whisper transcription disabled - filler rate and WPM will be 0.")
        else:
            print(f"✓ Whisper transcription enabled for lecture {lecture_id}")
            print(f"   Transcription batching: every {TRANSCRIPTION_BATCH_DURATION}s for better quality.")
        
        # Create queue for sentiment messages
        sentiment_queues[lecture_id] = asyncio.Queue()
        
        # Set up callbacks (EXACT same as test_mic_realtime.py)
        def on_fast_metrics(metrics: Dict):
            """Callback when fast metrics are ready - metrics sent directly after processing."""
            # Metrics are sent directly in the main loop after processing
            # This callback is kept for compatibility but we send metrics directly
            pass
        
        def on_sentiment(sentiment: Dict):
            """Callback when sentiment analysis is ready - queue for sending."""
            try:
                # Queue sentiment message to send in main loop
                # Defensive check: ensure sentiment_queues exists for this lecture
                if lecture_id not in sentiment_queues:
                    sentiment_queues[lecture_id] = asyncio.Queue()
                
                try:
                    sentiment_queues[lecture_id].put_nowait({
                        "type": "ai_feedback",
                        "feedback": {
                            "sentiment": sentiment.get('sentiment_label', 'neutral'),
                            "sentiment_score": sentiment.get('sentiment_score', 0.0),
                            "tone": sentiment.get('tone_description', ''),
                            "engagement_indicators": sentiment.get('engagement_indicators', []),
                            "confidence": sentiment.get('confidence', 0.0)
                        }
                    })
                except asyncio.QueueFull:
                    pass  # Skip if queue is full
            except Exception as e:
                print(f"Error queuing sentiment: {e}")
        
        pipeline.on_fast_metrics = on_fast_metrics
        pipeline.on_sentiment = on_sentiment
    
    pipeline = voice_pipelines[lecture_id]
    executor = voice_pipeline_executors[lecture_id]
    
    # Initialize transcription batching buffers (EXACT same as test_mic_realtime.py)
    if lecture_id not in transcription_buffers:
        transcription_buffers[lecture_id] = []
        batch_chunk_indices[lecture_id] = []
        accumulated_duration[lecture_id] = 0.0
        chunk_transcripts[lecture_id] = {}
        chunk_metric_indices[lecture_id] = {}
    
    # Initialize transcript for this lecture
    if lecture_id not in lecture_transcripts:
        lecture_transcripts[lecture_id] = ""
        last_question_time[lecture_id] = datetime.utcnow()
    
    # Start AI suggestion timer
    if lecture_id not in ai_suggestion_timers:
        ai_suggestion_timers[lecture_id] = asyncio.create_task(
            ai_question_suggestion_timer(lecture_id, professor_id, websocket)
        )
    
    # Track chunk count (EXACT same as test_mic_realtime.py)
    chunk_count = 0
    
    # Get OpenAI key
    from app.config import settings
    openai_key = settings.openai_api_key if hasattr(settings, 'openai_api_key') else os.getenv('OPENAI_API_KEY')
    use_whisper = openai_key is not None
    
    try:
        while True:
            # Check for sentiment messages to send (non-blocking)
            try:
                # Defensive check: ensure sentiment_queues exists for this lecture
                if lecture_id in sentiment_queues:
                    while True:
                        sentiment_msg = sentiment_queues[lecture_id].get_nowait()
                        try:
                            await websocket.send_json(sentiment_msg)
                        except (ConnectionClosed, ConnectionClosedOK, ConnectionClosedError, WebSocketDisconnect):
                            # Client disconnected; stop processing
                            raise WebSocketDisconnect()
            except asyncio.QueueEmpty:
                pass
            except KeyError:
                # Initialize if missing (shouldn't happen, but handle gracefully)
                if lecture_id not in sentiment_queues:
                    sentiment_queues[lecture_id] = asyncio.Queue()
                pass
            
            # Receive message (can be JSON with metadata or binary PCM data)
            # Since we send JSON first, then binary, we need to handle both types
            try:
                # Try to receive message (could be text or binary)
                raw_message = await asyncio.wait_for(websocket.receive(), timeout=0.1)
                
                # Check message type and handle accordingly
                if "text" in raw_message:
                    # Text message (JSON metadata)
                    message = raw_message["text"]
                    
                    try:
                        data = json.loads(message)
                        
                        # Check if this is PCM metadata (expects binary data next)
                        if data.get('type') == 'audio_chunk_pcm':
                            # Store metadata for next binary message
                            pcm_metadata_queue[lecture_id] = {
                                'sample_rate': data.get('sample_rate', 16000),
                                'samples': data.get('samples', 0),
                                'duration': data.get('duration', 0.0),
                                'chunk_index': data.get('chunk_index', 0),
                                'format': data.get('format', 'pcm_int16'),
                                'is_final': data.get('is_final', False)
                            }
                            # Wait for binary PCM data (continue loop)
                            continue
                        elif data.get('type') == 'audio_chunk':
                            # Legacy WebM support (for backwards compatibility)
                            audio_base64 = data.get('data', '')
                            expected_size = data.get('size', 0)
                            chunk_index = data.get('chunk_index', 0)
                            
                            if not audio_base64:
                                print("⚠ WARNING: Received audio_chunk with empty data field")
                                continue
                            
                            # Convert base64 WebM to numpy array
                            is_first_chunk = not first_chunk_received.get(lecture_id, False)
                            if is_first_chunk:
                                first_chunk_received[lecture_id] = True
                            
                            try:
                                loop = asyncio.get_event_loop()
                                audio_array, sr = await loop.run_in_executor(
                                    executor,
                                    convert_webm_base64_to_audio,
                                    audio_base64,
                                    is_first_chunk
                                )
                                
                                if len(audio_array) == 0:
                                    if is_first_chunk:
                                        first_chunk_received[lecture_id] = False
                                    continue
                                
                                # Set chunk_duration for WebM (fixed)
                                chunk_duration = CHUNK_DURATION
                            except Exception as e:
                                print(f"Error converting WebM audio: {e}")
                                if is_first_chunk:
                                    first_chunk_received[lecture_id] = False
                                continue
                        else:
                            continue  # Unknown message type
                    except json.JSONDecodeError:
                        continue  # Not valid JSON
                        
                elif "bytes" in raw_message:
                    # Binary message (PCM data)
                    pcm_bytes = raw_message["bytes"]
                    
                    # Check if we have metadata stored (from previous JSON message)
                    if lecture_id in pcm_metadata_queue:
                        metadata = pcm_metadata_queue.pop(lecture_id)  # Remove after use
                        chunk_index = metadata.get('chunk_index', 0)
                        sample_rate = metadata.get('sample_rate', 16000)
                        expected_samples = metadata.get('samples', 0)
                        duration = metadata.get('duration', 0.0)
                        
                        print(f"📥 Received PCM chunk #{chunk_index}: {len(pcm_bytes)} bytes ({expected_samples} samples, {duration:.2f}s)")
                        
                        # Convert PCM bytes directly to numpy array (fast, no file I/O)
                        audio_array, sr = convert_pcm_bytes_to_audio(pcm_bytes, sample_rate)
                        
                        if len(audio_array) == 0:
                            continue
                        
                        # Use duration from metadata instead of fixed CHUNK_DURATION
                        chunk_duration = duration if duration > 0 else CHUNK_DURATION
                    else:
                        # No metadata, assume default format (shouldn't happen normally)
                        print(f"⚠ Received PCM chunk without metadata, using defaults")
                        audio_array, sr = convert_pcm_bytes_to_audio(pcm_bytes, SAMPLE_RATE)
                        chunk_index = chunk_count + 1
                        chunk_duration = CHUNK_DURATION
                        
                        if len(audio_array) == 0:
                            continue
                else:
                    # Unknown message type
                    continue
                        
            except asyncio.TimeoutError:
                # No message received, check sentiment queue again
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"⚠ Error receiving message: {e}")
                import traceback
                traceback.print_exc()
                continue
            
            chunk_count += 1
            current_chunk_idx = chunk_count
            
            # Ensure transcription buffers are initialized (defensive check)
            if lecture_id not in transcription_buffers:
                transcription_buffers[lecture_id] = []
                batch_chunk_indices[lecture_id] = []
                accumulated_duration[lecture_id] = 0.0
                chunk_transcripts[lecture_id] = {}
                chunk_metric_indices[lecture_id] = {}
            
            # Add to transcription buffer for batching (EXACT same as test_mic_realtime.py)
            transcription_buffers[lecture_id].append(audio_array.copy())
            batch_chunk_indices[lecture_id].append(current_chunk_idx)
            # Use actual chunk duration (from PCM metadata or default)
            actual_chunk_duration = chunk_duration if 'chunk_duration' in locals() else CHUNK_DURATION
            accumulated_duration[lecture_id] += actual_chunk_duration
            
            # Use transcript if available, otherwise empty (will be filled on next batch)
            # EXACT same logic as test_mic_realtime.py line 182
            transcript = chunk_transcripts[lecture_id].get(current_chunk_idx, "")
            
            # Process chunk through pipeline (EXACT same as test_mic_realtime.py lines 186-192)
            # Use actual chunk duration (already computed above)
            metrics = pipeline.process_audio_chunk(
                audio_data=audio_array,
                transcript=transcript,
                duration_seconds=actual_chunk_duration,
                sr=sr,  # Use actual sample rate from conversion
                timestamp=datetime.utcnow()
            )
            
            # Track metric index for this chunk (EXACT same as test_mic_realtime.py lines 194-196)
            metric_index = len(pipeline.fast_metrics_history) - 1
            chunk_metric_indices[lecture_id][current_chunk_idx] = metric_index
            
            # Send metrics to frontend immediately (since transcript might be empty initially)
            # This matches test_mic_realtime.py behavior - metrics are sent as soon as available
            try:
                frontend_metrics = map_ai_metrics_to_frontend(metrics)
                try:
                    await websocket.send_json({
                        "type": "voice_metrics",
                        "metrics": frontend_metrics
                    })
                except (ConnectionClosed, ConnectionClosedOK, ConnectionClosedError, WebSocketDisconnect):
                    raise WebSocketDisconnect()
            except Exception as e:
                print(f"Error sending metrics: {e}")
            
            # Check if we've accumulated enough for transcription batch
            # EXACT same logic as test_mic_realtime.py lines 198-245
            # Defensive check: ensure accumulated_duration exists
            current_duration = accumulated_duration.get(lecture_id, 0.0)
            if use_whisper and current_duration >= TRANSCRIPTION_BATCH_DURATION:
                try:
                    # Concatenate all audio chunks in buffer
                    batched_audio = np.concatenate(transcription_buffers[lecture_id])
                    
                    # Transcribe the batch (EXACT same as test_mic_realtime.py)
                    # Get duration safely
                    batch_duration = accumulated_duration.get(lecture_id, 0.0)
                    print(f"🔄 Transcribing {batch_duration:.1f}s batch for lecture {lecture_id}...")
                    
                    # Get event loop for executor
                    loop = asyncio.get_event_loop()
                    batch_transcript = await loop.run_in_executor(
                        executor,
                        transcribe_audio_chunk,
                        batched_audio,
                        SAMPLE_RATE,
                        openai_key
                    )
                    
                    # Ensure batch_transcript is a string (transcribe_audio_chunk should return string)
                    if batch_transcript is None:
                        batch_transcript = ""
                    elif not isinstance(batch_transcript, str):
                        batch_transcript = str(batch_transcript).strip()
                    
                    batch_transcript = batch_transcript.strip()
                    
                    # Skip if empty
                    if not batch_transcript or len(batch_transcript) == 0:
                        print(f"⚠ WARNING: Empty transcript from Whisper, skipping...")
                        continue
                    
                    print(f"✓ Transcription complete: \"{batch_transcript[:60]}{'...' if len(batch_transcript) > 60 else ''}\"")
                    
                    # Calculate filler_rate from batch transcript (same for all chunks in batch)
                    filler_metrics = calculate_filler_rate(batch_transcript)
                    
                    # Calculate WPM from batch transcript using batch duration (safe access)
                    wpm_metrics = calculate_wpm(batch_transcript, batch_duration)
                    
                    # Store chunk indices before clearing (for logging)
                    chunk_indices_list = batch_chunk_indices[lecture_id].copy() if batch_chunk_indices[lecture_id] else []
                    
                    # Update metrics for all chunks in this batch (EXACT same as test_mic_realtime.py lines 222-233)
                    # Also update pipeline's transcript buffer for sentiment analysis
                    for chunk_idx in batch_chunk_indices[lecture_id]:
                        chunk_transcripts[lecture_id][chunk_idx] = batch_transcript
                        
                        # Add transcript to pipeline's buffer for sentiment analysis
                        # This ensures sentiment analysis has transcript text to analyze
                        if batch_transcript and batch_transcript.strip():
                            # Add transcript to pipeline buffer if not already there
                            # Use the batch transcript (which represents multiple chunks combined)
                            # We'll add it once per batch, not per chunk, to avoid duplicates
                            if chunk_idx == batch_chunk_indices[lecture_id][0]:  # Only add for first chunk in batch
                                # Manually add to pipeline's transcript buffer for sentiment analysis
                                # Get current time for timestamp
                                current_time = datetime.utcnow()
                                # Calculate total duration for this batch
                                batch_chunk_count = len(batch_chunk_indices[lecture_id])
                                batch_total_duration = batch_chunk_count * CHUNK_DURATION
                                
                                # Add to pipeline's transcript buffer and segments
                                if hasattr(pipeline, 'transcript_buffer') and hasattr(pipeline, 'transcript_segments'):
                                    pipeline.transcript_buffer.append(batch_transcript)
                                    pipeline.transcript_segments.append({
                                        'transcript': batch_transcript,
                                        'timestamp': current_time,
                                        'duration': batch_total_duration
                                    })
                                    print(f"📝 Added transcript to pipeline buffer for sentiment analysis: \"{batch_transcript[:50]}...\"")
                        
                        # Update the stored metric with new filler_rate and WPM
                        if chunk_idx in chunk_metric_indices[lecture_id]:
                            metric_idx = chunk_metric_indices[lecture_id][chunk_idx]
                            if metric_idx < len(pipeline.fast_metrics_history):
                                metric = pipeline.fast_metrics_history[metric_idx]
                                # Update filler and WPM metrics
                                metric['filler'] = filler_metrics.copy()
                                metric['wpm'] = wpm_metrics.copy()
                                
                                # Re-send updated metrics to frontend (with filler_rate and WPM now included)
                                frontend_metrics = map_ai_metrics_to_frontend(metric)
                                try:
                                    await websocket.send_json({
                                        "type": "voice_metrics",
                                        "metrics": frontend_metrics
                                    })
                                except Exception as e:
                                    print(f"Error sending updated metrics: {e}")
                    
                    # Safe logging - check if indices list is not empty
                    if chunk_indices_list and len(chunk_indices_list) > 0:
                        print(f"   ↳ Updated filler_rate ({filler_metrics['filler_rate']:.1%}) and WPM ({wpm_metrics['wpm']}) for chunks {chunk_indices_list[0]}-{chunk_indices_list[-1]}")
                    else:
                        print(f"   ↳ Updated filler_rate ({filler_metrics['filler_rate']:.1%}) and WPM ({wpm_metrics['wpm']}) for transcript batch")
                    
                    # Update transcript for legacy engagement analysis
                    lecture_transcripts[lecture_id] += " " + batch_transcript
                    
                    # Send transcript update to frontend (EXACT same as test_mic_realtime.py behavior)
                    try:
                        try:
                            await websocket.send_json({
                                "type": "transcript_update",
                                "transcript": lecture_transcripts[lecture_id],
                                "new_segment": batch_transcript,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                        except (ConnectionClosed, ConnectionClosedOK, ConnectionClosedError, WebSocketDisconnect):
                            raise WebSocketDisconnect()
                    except Exception as e:
                        print(f"Error sending transcript update: {e}")
                    
                except Exception as e:
                    print(f"⚠ Transcription error: {e}")
                    import traceback
                    traceback.print_exc()
                
                # Reset buffer for next batch (EXACT same as test_mic_realtime.py lines 242-245)
                # Safe access: check if key exists before resetting
                if lecture_id in transcription_buffers:
                    transcription_buffers[lecture_id] = []
                if lecture_id in batch_chunk_indices:
                    batch_chunk_indices[lecture_id] = []
                if lecture_id in accumulated_duration:
                    accumulated_duration[lecture_id] = 0.0
            
            # Accumulate talk time (only count chunks with sufficient energy to indicate speaking)
            energy_normalized = metrics.get('energy', {}).get('energy_normalized', 0.0)
            if energy_normalized > 0.1:  # Only count if there's actual audio (not silence)
                if lecture_id not in lecture_talk_time:
                    lecture_talk_time[lecture_id] = 0.0
                lecture_talk_time[lecture_id] += CHUNK_DURATION
            
    except WebSocketDisconnect:
        pass  # Normal disconnect
    except Exception as e:
        print(f"Error in audio handler: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup (similar to test_mic_realtime.py finally block)
        # Transcribe any remaining audio in buffer before exiting
        if lecture_id in transcription_buffers and transcription_buffers[lecture_id] and use_whisper:
            try:
                # Safe access: get duration with default value
                final_duration = accumulated_duration.get(lecture_id, 0.0)
                print(f"🔄 Transcribing final {final_duration:.1f}s batch for lecture {lecture_id}...")
                batched_audio = np.concatenate(transcription_buffers[lecture_id])
                loop = asyncio.get_event_loop()
                batch_transcript = await loop.run_in_executor(
                    executor,
                    transcribe_audio_chunk,
                    batched_audio,
                    SAMPLE_RATE,
                    openai_key
                )
                
                # Calculate filler_rate and WPM from final batch transcript (safe access)
                filler_metrics = calculate_filler_rate(batch_transcript)
                wpm_metrics = calculate_wpm(batch_transcript, final_duration)
                
                # Update metrics for remaining chunks
                # Also add transcript to pipeline buffer for sentiment analysis
                for chunk_idx in batch_chunk_indices[lecture_id]:
                    chunk_transcripts[lecture_id][chunk_idx] = batch_transcript
                    
                    # Add transcript to pipeline's buffer for sentiment analysis
                    if batch_transcript and batch_transcript.strip():
                        if chunk_idx == batch_chunk_indices[lecture_id][0]:  # Only add for first chunk in batch
                            current_time = datetime.utcnow()
                            batch_chunk_count = len(batch_chunk_indices[lecture_id])
                            batch_total_duration = batch_chunk_count * CHUNK_DURATION
                            
                            if hasattr(pipeline, 'transcript_buffer') and hasattr(pipeline, 'transcript_segments'):
                                pipeline.transcript_buffer.append(batch_transcript)
                                pipeline.transcript_segments.append({
                                    'transcript': batch_transcript,
                                    'timestamp': current_time,
                                    'duration': batch_total_duration
                                })
                                print(f"📝 Added final transcript to pipeline buffer for sentiment analysis")
                    
                    if chunk_idx in chunk_metric_indices[lecture_id]:
                        metric_idx = chunk_metric_indices[lecture_id][chunk_idx]
                        if metric_idx < len(pipeline.fast_metrics_history):
                            metric = pipeline.fast_metrics_history[metric_idx]
                            metric['filler'] = filler_metrics.copy()
                            metric['wpm'] = wpm_metrics.copy()
                
                lecture_transcripts[lecture_id] += " " + batch_transcript
                print(f"✓ Final transcription complete")
            except Exception as e:
                print(f"⚠ Final transcription error: {e}")
        
        # Clean up
        if lecture_id in ai_suggestion_timers:
            ai_suggestion_timers[lecture_id].cancel()
            del ai_suggestion_timers[lecture_id]
        
        if lecture_id in voice_pipelines:
            del voice_pipelines[lecture_id]
        if lecture_id in voice_pipeline_executors:
            executor = voice_pipeline_executors[lecture_id]
            try:
                executor.shutdown(wait=False)
            except:
                pass
            del voice_pipeline_executors[lecture_id]
        if lecture_id in transcription_buffers:
            del transcription_buffers[lecture_id]
        if lecture_id in batch_chunk_indices:
            del batch_chunk_indices[lecture_id]
        if lecture_id in accumulated_duration:
            del accumulated_duration[lecture_id]
        if lecture_id in chunk_transcripts:
            del chunk_transcripts[lecture_id]
        if lecture_id in chunk_metric_indices:
            del chunk_metric_indices[lecture_id]
        if lecture_id in sentiment_queues:
            del sentiment_queues[lecture_id]
        if lecture_id in lecture_talk_time:
            del lecture_talk_time[lecture_id]
        
        # Save transcript to database before deleting from memory
        if lecture_id in lecture_transcripts:
            transcript_text = lecture_transcripts[lecture_id]
            if transcript_text and len(transcript_text.strip()) > 0:
                try:
                    print(f"💾 Saving transcript to database for lecture {lecture_id} ({len(transcript_text)} chars)...")
                    
                    # Check if lecture exists first (for debugging)
                    check_result = supabase.table("lectures").select("lecture_id, status").eq("lecture_id", lecture_id).execute()
                    if not check_result.data:
                        print(f"⚠ WARNING: Lecture {lecture_id} not found in database")
                        print(f"   Attempting to save transcript anyway (may create the record if permissions allow)")
                    else:
                        print(f"✓ Lecture found: {check_result.data[0]}")
                    
                    # Try to update transcript anyway (even if lecture not found, might work)
                    result = supabase.table("lectures").update({
                        "transcript": transcript_text
                    }).eq("lecture_id", lecture_id).execute()
                    
                    if result.data and len(result.data) > 0:
                        print(f"✓ Transcript saved successfully ({len(transcript_text)} chars)")
                    else:
                        # Check if it's because the lecture doesn't exist
                        if not check_result.data:
                            print(f"❌ ERROR: Cannot save transcript - lecture {lecture_id} does not exist in database")
                            print(f"   Solution: Create the lecture first via POST /lectures endpoint")
                        else:
                            print(f"⚠ WARNING: Failed to save transcript - no data returned from update")
                            print(f"   Response: {result}")
                            
                except Exception as e:
                    print(f"❌ ERROR: Failed to save transcript to database: {e}")
                    print(f"   Lecture ID: {lecture_id}")
                    print(f"   Transcript length: {len(transcript_text)} chars")
                    
                    # Check if it's a permission or column issue
                    error_str = str(e).lower()
                    if "column" in error_str or "does not exist" in error_str:
                        print(f"   💡 Hint: Make sure the 'transcript' column exists in the lectures table")
                        print(f"      Run: ALTER TABLE lectures ADD COLUMN IF NOT EXISTS transcript TEXT;")
                    elif "permission" in error_str or "policy" in error_str:
                        print(f"   💡 Hint: Check RLS policies on the lectures table")
                    
                    import traceback
                    traceback.print_exc()
            else:
                print(f"ℹ No transcript to save for lecture {lecture_id} (empty or not started)")
            
            # Delete from memory after saving (even if save failed)
            del lecture_transcripts[lecture_id]


async def ai_question_suggestion_timer(lecture_id: str, professor_id: str, websocket: WebSocket):
    """Timer that suggests questions based on talk time (configurable, default 5 minutes)."""
    # Get class_id to fetch settings
    lecture_result = supabase.table("lectures").select("class_id").eq("lecture_id", lecture_id).execute()
    if not lecture_result.data:
        return
    class_id = lecture_result.data[0]["class_id"]
    
    # Get question suggestion interval from settings (default 5 minutes)
    from app.services.teacher_settings import get_teacher_settings
    settings = await get_teacher_settings(class_id)
    suggestion_interval_minutes = settings.question_suggestion_interval
    suggestion_interval_seconds = suggestion_interval_minutes * 60
    
    last_suggestion_talk_time = 0.0  # Track talk time at last suggestion
    
    while True:
        # Check if lecture is still active
        lecture_result = supabase.table("lectures").select("status").eq("lecture_id", lecture_id).execute()
        if not lecture_result.data or lecture_result.data[0]["status"] != "active":
            break
        
        # Get current talk time
        current_talk_time = lecture_talk_time.get(lecture_id, 0.0)
        
        # Check if we've talked enough since last suggestion
        talk_time_since_suggestion = current_talk_time - last_suggestion_talk_time
        
        if talk_time_since_suggestion >= suggestion_interval_seconds:
            # Apply rejection delay if any
            additional_delay = rejection_delays.get(lecture_id, 0)
            if additional_delay > 0:
                # Wait for the additional delay
                await asyncio.sleep(additional_delay)
                # Reset rejection delay after using it
                del rejection_delays[lecture_id]
                # Re-check talk time after delay
                current_talk_time = lecture_talk_time.get(lecture_id, 0.0)
                talk_time_since_suggestion = current_talk_time - last_suggestion_talk_time
            
            # Check again if we've talked enough (after delay)
            if talk_time_since_suggestion >= suggestion_interval_seconds:
                # Get recent transcript
                recent_transcript = lecture_transcripts.get(lecture_id, "")
                if len(recent_transcript) >= 100:  # Enough content
                    # Generate question suggestion
                    from app.services.ai_service import generate_question_full
                    question_data = await generate_question_full(recent_transcript[-2000:])  # Last 2000 chars
                    
                    # Create question in database (pending status)
                    from uuid import uuid4
                    question_id = str(uuid4())
                    supabase.table("questions").insert({
                        "question_id": question_id,
                        "lecture_id": lecture_id,
                        "question_text": question_data["question_text"],
                        "option_a": question_data["option_a"],
                        "option_b": question_data["option_b"],
                        "option_c": question_data["option_c"],
                        "option_d": question_data["option_d"],
                        "correct_answer": question_data["correct_answer"],
                        "ai_suggested": True,
                        "created_by": "ai",
                        "status": "pending"
                    }).execute()
                    
                    # Send suggestion to professor
                    try:
                        await websocket.send_json({
                            "type": "question_suggestion",
                            "question_id": question_id,
                            "question": question_data
                        })
                        # Update last suggestion talk time
                        last_suggestion_talk_time = current_talk_time
                    except:
                        break  # Connection closed
        
        # Check every 10 seconds for talk time updates
        await asyncio.sleep(10)


def reset_question_timer(lecture_id: str):
    """Reset the AI question timer (when professor triggers a question)."""
    if lecture_id in ai_suggestion_timers:
        ai_suggestion_timers[lecture_id].cancel()
        del ai_suggestion_timers[lecture_id]
    
    # Timer will be restarted when audio stream reconnects
    # In production, you'd need to pass websocket reference to restart
    # For now, just reset talk time to effectively restart the timer
    if lecture_id in lecture_talk_time:
        lecture_talk_time[lecture_id] = 0.0
    
    # Reset rejection delay
    if lecture_id in rejection_delays:
        del rejection_delays[lecture_id]


def add_rejection_delay(lecture_id: str):
    """Add 7 minutes to the timer when professor rejects a question."""
    if lecture_id not in rejection_delays:
        rejection_delays[lecture_id] = 0
    rejection_delays[lecture_id] += 7 * 60  # Add 7 minutes
