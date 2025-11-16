# AI Assistant - Voice Quality Pipeline

Standalone module for real-time voice quality analysis during lectures.

## Features

### Fast DSP Pipeline (2-second chunks)
- **Pitch Variation**: Uses `librosa.pyin` to detect monotone delivery
- **Energy/RMS**: Measures speaking volume and energy levels
- **Filler Word Detection**: Regex-based detection of fillers (um, uh, like, etc.)
- **Speaking Rate (WPM)**: Calculates words per minute from Whisper timestamps

### Sentiment Analysis (10-15 second checkpoints)
- **GPT-4 Sentiment**: Analyzes emotional tone and delivery quality
- **Engagement Indicators**: Identifies engagement-related observations
- **Tone Description**: Provides brief description of delivery style

## Structure

```
ai_assistant/
├── voice_pipeline/
│   ├── fast_dsp.py           # 2s chunk analysis (pitch, energy, filler, WPM)
│   ├── sentiment_analyzer.py # GPT-4 sentiment analysis
│   ├── pipeline_manager.py   # Orchestrates both pipelines
│   └── broadcaster.py        # (Optional) WebSocket broadcasting
├── tests/
│   ├── test_fast_dsp.py      # Unit tests for DSP components
│   └── test_full_pipeline.py # End-to-end pipeline test
└── samples/                   # Test audio files
```

## Installation

```bash
pip install librosa soundfile numpy openai python-dotenv
```

## Usage

### Basic Usage

```python
from ai_assistant.voice_pipeline import VoicePipelineManager
import librosa
import numpy as np

# Initialize pipeline
pipeline = VoicePipelineManager(sentiment_interval=12.0)

# Process 2-second audio chunk
audio_chunk, sr = librosa.load('audio_chunk.wav', sr=22050)
transcript = "This is the transcript from Whisper."

metrics = pipeline.process_audio_chunk(
    audio_data=audio_chunk,
    transcript=transcript,
    duration_seconds=2.0,
    sr=sr
)

print(f"Pitch Variance: {metrics['pitch']['pitch_variance']}")
print(f"WPM: {metrics['wpm']['wpm']}")
print(f"Filler Rate: {metrics['filler']['filler_rate']}")
```

### With Callbacks

```python
def on_fast_metrics(metrics):
    # Broadcast to frontend, save to DB, etc.
    print(f"Fast metrics: {metrics}")

def on_sentiment(sentiment):
    # Handle sentiment update
    print(f"Sentiment: {sentiment['sentiment_label']}")

pipeline.on_fast_metrics = on_fast_metrics
pipeline.on_sentiment = on_sentiment
```

## Testing

### Test Fast DSP Components

```bash
python -m ai_assistant.tests.test_fast_dsp
```

### Test Full Pipeline with Audio File

```bash
python -m ai_assistant.tests.test_full_pipeline --audio-file samples/lecture.wav
```

### Test with Mock Data (no audio file)

```bash
python -m ai_assistant.tests.test_full_pipeline
```

## Metrics Output

### Fast DSP Metrics (every 2 seconds)

```python
{
    'timestamp': '2025-01-13T10:30:45Z',
    'duration_seconds': 2.0,
    'pitch': {
        'pitch_variance': 123.45,
        'pitch_range': 50.0,
        'monotone_score': 0.75,  # 0=varied, 1=monotone
        'average_pitch': 200.0
    },
    'energy': {
        'rms_mean': 0.25,
        'energy_normalized': 0.5  # 0-1 scale
    },
    'filler': {
        'filler_count': 2,
        'filler_rate': 0.05,  # 5% filler words
        'total_words': 40
    },
    'wpm': {
        'wpm': 145,
        'words_count': 40,
        'words_per_second': 2.4
    }
}
```

### Sentiment Metrics (every 10-15 seconds)

```python
{
    'timestamp': '2025-01-13T10:30:50Z',
    'sentiment_score': 0.75,  # -1 to 1
    'sentiment_label': 'positive',
    'confidence': 0.88,
    'tone_description': 'Enthusiastic and engaging',
    'engagement_indicators': ['Clear explanations', 'Varied pitch']
}
```

## Integration Points

When ready to integrate with main app:

1. **Import in audio_handler.py**:
```python
from ai_assistant.voice_pipeline import VoicePipelineManager
```

2. **Initialize in WebSocket handler**:
```python
pipeline = VoicePipelineManager(sentiment_interval=12.0)

# Set up callbacks for broadcasting
pipeline.on_fast_metrics = lambda m: websocket.send_json({
    'type': 'voice_metrics',
    'metrics': m
})
```

3. **Process audio chunks**:
```python
metrics = pipeline.process_audio_chunk(
    audio_data=audio_chunk,
    transcript=transcript,
    duration_seconds=2.0,
    sr=22050,
    word_timestamps=whisper_result.get('words')
)
```

## Environment Variables

Ensure `.env` file has:
```
OPENAI_API_KEY=your_openai_key
```

## Notes

- Pitch analysis uses `librosa.pyin` (Probabilistic YIN algorithm)
- Energy uses RMS (Root Mean Square) calculation
- Filler detection uses regex patterns (expandable list)
- WPM uses Whisper timestamps if available, otherwise duration-based
- Sentiment analysis runs asynchronously to avoid blocking real-time pipeline
- All metrics can be saved to database or broadcast via WebSocket

