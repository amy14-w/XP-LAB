"""
Integration test for AI Assistant in the actual FastAPI backend.

This test simulates a professor streaming audio through WebSocket and verifies:
- Audio chunk reception
- Voice metrics calculation (Volume, Clarity, Pace, Pitch)
- Whisper transcription (batched every 10 seconds)
- Sentiment analysis (every 12 seconds)
- All data being sent back via WebSocket

Usage:
    python test_ai_integration.py
"""

import asyncio
import json
import base64
import websockets
import numpy as np
import soundfile as sf
import tempfile
import os
from datetime import datetime
import sys
import argparse
import httpx
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
# Get the project root directory (parent of this script)
project_root = Path(__file__).parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Configuration
WS_URL = "ws://localhost:8000/audio/stream/{lecture_id}?professor_id={professor_id}"
TEST_LECTURE_ID = "test-lecture-123"
TEST_PROFESSOR_ID = "test-professor-456"
SAMPLE_RATE = 22050
CHUNK_DURATION = 2.0  # seconds (matches frontend)
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)

# Track received messages
received_messages = {
    'voice_metrics': [],
    'transcript_updates': [],
    'ai_feedback': [],
    'question_suggestions': []
}


def generate_test_audio(duration=2.0, frequency=440.0, amplitude=0.5):
    """
    Generate synthetic audio for testing.
    
    Args:
        duration: Duration in seconds
        frequency: Frequency in Hz (440 = A note)
        amplitude: Amplitude (0-1)
    
    Returns:
        numpy array of audio data
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration))
    audio = np.sin(2 * np.pi * frequency * t) * amplitude
    return audio


def audio_to_webm_base64(audio_data, sr=SAMPLE_RATE):
    """
    Convert numpy audio array to base64-encoded WebM format.
    In a real scenario, this would use actual WebM encoding.
    For testing, we'll use WAV and encode to base64 (backend should handle it).
    """
    # Create temporary WAV file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        tmp_file_path = tmp_file.name
        sf.write(tmp_file_path, audio_data, sr, format='WAV')
        
        # Read as bytes
        with open(tmp_file_path, 'rb') as f:
            audio_bytes = f.read()
        
        # Clean up
        try:
            os.unlink(tmp_file_path)
        except:
            pass
    
    # Encode to base64
    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    return audio_base64


async def check_backend_running():
    """Check if the backend server is running."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8000/")
            if response.status_code == 200:
                return True
    except Exception:
        pass
    return False


async def test_ai_integration(lecture_id=None, professor_id=None, max_chunks=15, wait_time=15):
    """Test the AI assistant integration through WebSocket."""
    # Use provided IDs or defaults
    test_lecture_id = lecture_id or TEST_LECTURE_ID
    test_professor_id = professor_id or TEST_PROFESSOR_ID
    uri = WS_URL.format(lecture_id=test_lecture_id, professor_id=test_professor_id)
    
    print(f"Testing WebSocket endpoint: {uri}")
    print()
    
    # First, check if backend is running
    print("Checking if backend server is running...")
    backend_running = await check_backend_running()
    if not backend_running:
        print("❌ ERROR: Backend server is not running or not accessible at http://localhost:8000")
        print()
        print("Please start the backend server first:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print()
        return
    print("✓ Backend server is running")
    print()
    
    # Check if OpenAI API key is set
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("⚠ WARNING: OPENAI_API_KEY not found in environment variables")
        print("   Transcription and sentiment analysis will fail.")
        print("   Voice metrics (Volume, Pitch) should still work.\n")
    else:
        print("✓ OpenAI API key found - full AI features will be tested\n")
    
    try:
        # Increase connection timeout to 10 seconds
        async with websockets.connect(
            uri,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=10
        ) as websocket:
            print("✅ WebSocket connected successfully")
            print()
            
            # Track time for testing
            start_time = datetime.now()
            chunk_count = 0
            
            # Flag to control receive loop
            receiving = True
            
            # Task to receive messages
            async def receive_messages():
                """Receive and process WebSocket messages."""
                nonlocal receiving
                try:
                    while receiving:
                        try:
                            # Wait for message with timeout to allow checking receiving flag
                            message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                            
                            try:
                                data = json.loads(message)
                                msg_type = data.get('type')
                                
                                if msg_type == 'voice_metrics':
                                    received_messages['voice_metrics'].append(data)
                                    metrics = data.get('metrics', {})
                                    print(f"📊 [Chunk {len(received_messages['voice_metrics'])}] Voice Metrics:")
                                    print(f"   Volume: {metrics.get('volume', 0):.1f}%")
                                    print(f"   Clarity: {metrics.get('clarity', 0):.1f}%")
                                    print(f"   Pace: {metrics.get('pace', 0):.1f}%")
                                    print(f"   Pitch: {metrics.get('pitch', 0):.1f}%")
                                    print()
                                
                                elif msg_type == 'transcript_update':
                                    received_messages['transcript_updates'].append(data)
                                    new_segment = data.get('new_segment', '')
                                    print(f"📝 [Transcript Update {len(received_messages['transcript_updates'])}]")
                                    print(f"   New segment: \"{new_segment[:80]}{'...' if len(new_segment) > 80 else ''}\"")
                                    print(f"   Full transcript length: {len(data.get('transcript', ''))} chars")
                                    print()
                                
                                elif msg_type == 'ai_feedback':
                                    received_messages['ai_feedback'].append(data)
                                    feedback = data.get('feedback', {})
                                    print(f"🤖 [AI Feedback {len(received_messages['ai_feedback'])}] Sentiment Analysis:")
                                    print(f"   Sentiment: {feedback.get('sentiment', 'N/A')}")
                                    print(f"   Score: {feedback.get('sentiment_score', 0):.2f}")
                                    print(f"   Tone: {feedback.get('tone', 'N/A')}")
                                    print(f"   Confidence: {feedback.get('confidence', 0):.1%}")
                                    indicators = feedback.get('engagement_indicators', [])
                                    if indicators:
                                        print(f"   Engagement: {', '.join(indicators[:3])}")
                                    print()
                                
                                elif msg_type == 'question_suggestion':
                                    received_messages['question_suggestions'].append(data)
                                    question = data.get('question', {})
                                    print(f"❓ [Question Suggestion {len(received_messages['question_suggestions'])}]")
                                    print(f"   Question: \"{question.get('question_text', 'N/A')[:60]}...\"")
                                    print()
                                
                                else:
                                    print(f"❓ Unknown message type: {msg_type}")
                                    print(f"   Data: {json.dumps(data, indent=2)[:200]}")
                                    print()
                            
                            except json.JSONDecodeError as e:
                                print(f"⚠ Error parsing message: {e}")
                                print(f"   Raw message: {message[:200]}")
                            except Exception as e:
                                print(f"⚠ Error processing message: {e}")
                                import traceback
                                traceback.print_exc()
                        
                        except asyncio.TimeoutError:
                            # Timeout is expected - continue checking receiving flag
                            continue
                        except websockets.exceptions.ConnectionClosed:
                            print("🔌 WebSocket connection closed by server")
                            receiving = False
                            break
                        except Exception as e:
                            print(f"⚠ Error receiving message: {e}")
                            receiving = False
                            break
                
                except Exception as e:
                    print(f"❌ Receive loop error: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Start receiving messages in background
            receive_task = asyncio.create_task(receive_messages())
            
            # Send audio chunks
            print("🎤 Starting to send audio chunks...")
            print("   Generating synthetic audio (440 Hz sine wave)...")
            print()
            
            for i in range(max_chunks):
                chunk_count += 1
                
                # Generate test audio (varying frequency to simulate speech variation)
                # Use varying frequencies to simulate pitch variation
                frequency = 200 + (i % 5) * 50  # Vary between 200-400 Hz
                audio_chunk = generate_test_audio(
                    duration=CHUNK_DURATION,
                    frequency=frequency,
                    amplitude=0.5  # 50% amplitude
                )
                
                # Convert to base64
                audio_base64 = audio_to_webm_base64(audio_chunk, SAMPLE_RATE)
                
                # Send audio chunk
                message = {
                    'type': 'audio_chunk',
                    'data': audio_base64,
                    'timestamp': datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(message))
                print(f"✓ Sent audio chunk {chunk_count}/{max_chunks} (freq: {frequency} Hz, duration: {CHUNK_DURATION}s)")
                
                # Wait 2 seconds before next chunk (simulate real-time)
                await asyncio.sleep(2.0)
            
            # Wait a bit more for final processing (transcription might be pending)
            print()
            print(f"⏳ Waiting {wait_time} seconds for final transcription and sentiment analysis...")
            print("   (This may take up to 12 seconds for sentiment analysis)")
            await asyncio.sleep(wait_time)
            
            # Stop receiving
            receiving = False
            receive_task.cancel()
            try:
                await receive_task
            except (asyncio.CancelledError, Exception):
                pass
            
            # Print summary
            print()
            print("=" * 80)
            print("TEST SUMMARY")
            print("=" * 80)
            print(f"Total chunks sent: {chunk_count}")
            print(f"Voice metrics received: {len(received_messages['voice_metrics'])}")
            print(f"Transcript updates received: {len(received_messages['transcript_updates'])}")
            print(f"AI feedback (sentiment) received: {len(received_messages['ai_feedback'])}")
            print(f"Question suggestions received: {len(received_messages['question_suggestions'])}")
            print()
            
            # Detailed analysis
            if received_messages['voice_metrics']:
                print("✅ Voice Metrics: WORKING")
                latest_metrics = received_messages['voice_metrics'][-1].get('metrics', {})
                print(f"   Latest - Volume: {latest_metrics.get('volume', 0):.1f}%, "
                      f"Clarity: {latest_metrics.get('clarity', 0):.1f}%, "
                      f"Pace: {latest_metrics.get('pace', 0):.1f}%, "
                      f"Pitch: {latest_metrics.get('pitch', 0):.1f}%")
            else:
                print("❌ Voice Metrics: NOT WORKING - No metrics received")
            
            print()
            
            if received_messages['transcript_updates']:
                print("✅ Transcription: WORKING")
                total_chars = sum(len(update.get('new_segment', '')) for update in received_messages['transcript_updates'])
                print(f"   Total transcript segments: {len(received_messages['transcript_updates'])}")
                print(f"   Total characters transcribed: {total_chars}")
                if received_messages['transcript_updates']:
                    latest = received_messages['transcript_updates'][-1].get('new_segment', '')
                    print(f"   Latest segment preview: \"{latest[:60]}{'...' if len(latest) > 60 else ''}\"")
            else:
                print("❌ Transcription: NOT WORKING")
                if not openai_key:
                    print("   Reason: OPENAI_API_KEY not set")
                else:
                    print("   Reason: Unknown - check backend logs")
            
            print()
            
            if received_messages['ai_feedback']:
                print("✅ Sentiment Analysis: WORKING")
                latest_feedback = received_messages['ai_feedback'][-1].get('feedback', {})
                print(f"   Latest - Sentiment: {latest_feedback.get('sentiment', 'N/A')}, "
                      f"Score: {latest_feedback.get('sentiment_score', 0):.2f}")
                print(f"   Tone: {latest_feedback.get('tone', 'N/A')}")
            else:
                print("⚠ Sentiment Analysis: Not received yet (may need more time)")
                if not openai_key:
                    print("   Reason: OPENAI_API_KEY not set")
                else:
                    print("   Note: Sentiment analysis appears every ~12 seconds")
                    print("   If no transcription, sentiment won't work")
            
            print()
            
            # Check for issues
            print("=" * 80)
            print("DIAGNOSTICS")
            print("=" * 80)
            
            if len(received_messages['voice_metrics']) < chunk_count * 0.5:
                print("⚠ WARNING: Received fewer voice metrics than expected")
                print(f"   Expected: ~{chunk_count}, Received: {len(received_messages['voice_metrics'])}")
                print("   Check if backend is processing audio chunks correctly")
            
            if openai_key and len(received_messages['transcript_updates']) == 0:
                print("⚠ WARNING: Transcription not working despite API key being set")
                print("   Check:")
                print("   1. Backend logs for Whisper API errors")
                print("   2. OPENAI_API_KEY is valid")
                print("   3. Backend has internet access to call OpenAI API")
            
            if len(received_messages['voice_metrics']) == 0:
                print("❌ CRITICAL: No voice metrics received at all")
                print("   Check:")
                print("   1. Backend server is running on http://localhost:8000")
                print("   2. WebSocket endpoint is accessible")
                print("   3. Audio handler is properly initialized")
            
            print()
            print("=" * 80)
            print("Test completed!")
            print("=" * 80)
            print()
            print("Next steps:")
            print("  1. If metrics are working but transcription isn't, check OpenAI API key")
            print("  2. If nothing is working, check backend logs for errors")
            print("  3. Verify WebSocket connection in browser console during actual lecture")
            print()
    
    except websockets.exceptions.InvalidURI:
        print(f"❌ ERROR: Invalid WebSocket URI: {uri}")
        print("   Make sure the lecture_id and professor_id are valid UUIDs")
    except (ConnectionRefusedError, OSError) as e:
        print("❌ ERROR: Could not connect to WebSocket server")
        print(f"   Error: {e}")
        print()
        print("   Troubleshooting:")
        print("   1. Make sure the FastAPI backend is running:")
        print("      uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("   2. Check if port 8000 is available")
        print("   3. Verify the WebSocket endpoint is accessible")
    except asyncio.TimeoutError:
        print("❌ ERROR: WebSocket connection timed out")
        print()
        print("   This usually means:")
        print("   1. The backend server is not running")
        print("   2. The WebSocket endpoint is not accepting connections")
        print("   3. There's a firewall blocking the connection")
        print()
        print("   Check backend logs for errors when the connection is attempted")
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ ERROR: WebSocket handshake failed with status {e.status_code}")
        print("   The server rejected the WebSocket connection")
        print("   Check backend logs for more details")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Test AI Assistant integration with FastAPI backend')
    parser.add_argument('--lecture-id', type=str, default=TEST_LECTURE_ID, 
                       help='Lecture ID to use for testing (default: test-lecture-123)')
    parser.add_argument('--professor-id', type=str, default=TEST_PROFESSOR_ID,
                       help='Professor ID to use for testing (default: test-professor-456)')
    parser.add_argument('--chunks', type=int, default=15,
                       help='Number of audio chunks to send (default: 15, ~30 seconds)')
    parser.add_argument('--skip-prompt', action='store_true',
                       help='Skip the confirmation prompt')
    parser.add_argument('--wait-time', type=int, default=15,
                       help='Wait time in seconds after sending chunks for final processing (default: 15)')
    
    args = parser.parse_args()
    
    print()
    print("=" * 80)
    print("AI ASSISTANT INTEGRATION TEST")
    print("=" * 80)
    print()
    print("This test simulates a professor streaming audio to the backend.")
    print("It will verify that all AI assistant features are working correctly.")
    print()
    print("Requirements:")
    print("  1. Backend server must be running (uvicorn app.main:app --reload)")
    print("  2. OPENAI_API_KEY in environment (optional but recommended)")
    print(f"  3. Using lecture_id: {args.lecture_id}")
    print(f"  4. Using professor_id: {args.professor_id}")
    print()
    print("What will be tested:")
    print("  ✓ Audio chunk processing")
    print("  ✓ Voice metrics (Volume, Clarity, Pace, Pitch)")
    print("  ✓ Whisper transcription (batched every 10 seconds)")
    print("  ✓ Sentiment analysis (every 12 seconds)")
    print("  ✓ AI question suggestions (if enough talk time)")
    print()
    
    if not args.skip_prompt:
        response = input("Continue with test? (y/n): ").strip().lower()
        if response != 'y':
            print("Test cancelled.")
            sys.exit(0)
    
    print()
    print("Starting test in 2 seconds...")
    print("(Press Ctrl+C to cancel)")
    print()
    
    try:
        import time
        time.sleep(2)
    except KeyboardInterrupt:
        print("\nTest cancelled.")
        sys.exit(0)
    
    try:
        asyncio.run(test_ai_integration(
            lecture_id=args.lecture_id,
            professor_id=args.professor_id,
            max_chunks=args.chunks,
            wait_time=args.wait_time
        ))
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

