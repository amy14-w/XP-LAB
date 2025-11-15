"""
Pipeline Manager - Orchestrates fast DSP (2s) and sentiment (10-15s) pipelines

Manages:
- Fast DSP processing every 2 seconds
- Sentiment analysis every 10-15 seconds
- Transcript buffering
- Metric aggregation
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Callable
from collections import deque
import numpy as np

from .fast_dsp import analyze_voice_chunk
from .sentiment_analyzer import analyze_sentiment


class VoicePipelineManager:
    """
    Manages voice quality analysis pipeline.
    
    Processes:
    - Fast DSP metrics every 2 seconds (real-time)
    - Sentiment analysis every 10-15 seconds (async)
    """
    
    def __init__(self, 
                 sentiment_interval: float = 12.0,  # 12 seconds between sentiment checks
                 transcript_buffer_size: int = 1000):  # Max chars in buffer
        """
        Initialize pipeline manager.
        
        Args:
            sentiment_interval: Seconds between sentiment analyses (default 12s)
            transcript_buffer_size: Maximum characters in transcript buffer
        """
        self.sentiment_interval = sentiment_interval
        self.transcript_buffer_size = transcript_buffer_size
        
        # Transcript buffer for sentiment analysis
        self.transcript_buffer = deque(maxlen=transcript_buffer_size)
        self.transcript_segments = []  # Timestamped segments for sentiment
        
        # Metrics storage
        self.fast_metrics_history: List[Dict] = []
        self.sentiment_history: List[Dict] = []
        
        # Timing
        self.last_sentiment_time: Optional[float] = None
        self.pipeline_start_time: Optional[float] = None
        
        # Callbacks (for broadcasting)
        self.on_fast_metrics: Optional[Callable[[Dict], None]] = None
        self.on_sentiment: Optional[Callable[[Dict], None]] = None
    
    def process_audio_chunk(self, 
                           audio_data: np.ndarray,
                           transcript: str,
                           duration_seconds: float,
                           sr: int = 22050,
                           word_timestamps: Optional[List[Dict]] = None,
                           timestamp: Optional[datetime] = None) -> Dict:
        """
        Process a 2-second audio chunk with fast DSP analysis.
        
        Args:
            audio_data: Audio waveform
            transcript: Text transcript from Whisper
            duration_seconds: Duration of chunk
            sr: Sample rate
            word_timestamps: Optional word-level timestamps
            timestamp: Optional timestamp for this chunk
        
        Returns:
            Dictionary with fast DSP metrics
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Analyze voice chunk
        metrics = analyze_voice_chunk(
            audio_data=audio_data,
            transcript=transcript,
            duration_seconds=duration_seconds,
            sr=sr,
            word_timestamps=word_timestamps
        )
        
        # Add timestamp
        metrics['timestamp'] = timestamp.isoformat()
        
        # Store transcript for sentiment analysis
        if transcript:
            self.transcript_buffer.append(transcript)
            self.transcript_segments.append({
                'transcript': transcript,
                'timestamp': timestamp,
                'duration': duration_seconds
            })
        
        # Store metrics
        self.fast_metrics_history.append(metrics)
        
        # Check if sentiment analysis needed
        current_time = timestamp.timestamp() if isinstance(timestamp, datetime) else datetime.utcnow().timestamp()
        
        if self.last_sentiment_time is None:
            self.last_sentiment_time = current_time
            self.pipeline_start_time = current_time
        
        time_since_last_sentiment = current_time - self.last_sentiment_time
        
        # Trigger sentiment analysis if interval reached
        if time_since_last_sentiment >= self.sentiment_interval:
            asyncio.create_task(self._process_sentiment_checkpoint(timestamp))
            self.last_sentiment_time = current_time
        
        # Call callback if set
        if self.on_fast_metrics:
            try:
                self.on_fast_metrics(metrics)
            except Exception as e:
                print(f"Error in fast metrics callback: {e}")
        
        return metrics
    
    async def _process_sentiment_checkpoint(self, timestamp: Optional[datetime] = None):
        """
        Process sentiment analysis checkpoint (every 10-15 seconds).
        
        Combines last 10-15 seconds of transcript and analyzes sentiment.
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Get recent transcript segments (last 10-15 seconds)
        recent_transcript = self._get_recent_transcript()
        
        if not recent_transcript or not recent_transcript.strip():
            return
        
        # Analyze sentiment
        sentiment_data = await analyze_sentiment(recent_transcript)
        
        # Add timestamp and transcript segment
        sentiment_data['timestamp'] = timestamp.isoformat()
        sentiment_data['transcript_segment'] = recent_transcript
        sentiment_data['segment_length'] = len(recent_transcript)
        
        # Store sentiment
        self.sentiment_history.append(sentiment_data)
        
        # Call callback if set
        if self.on_sentiment:
            try:
                self.on_sentiment(sentiment_data)
            except Exception as e:
                print(f"Error in sentiment callback: {e}")
    
    def _get_recent_transcript(self, max_duration: float = 15.0) -> str:
        """
        Get recent transcript segments (last ~15 seconds).
        
        Args:
            max_duration: Maximum duration in seconds to include
        
        Returns:
            Combined transcript string
        """
        if not self.transcript_segments:
            return ""
        
        # Get segments from last max_duration seconds
        current_time = datetime.utcnow()
        recent_segments = []
        total_duration = 0.0
        
        # Go backwards through segments
        for segment in reversed(self.transcript_segments):
            if total_duration >= max_duration:
                break
            
            recent_segments.insert(0, segment['transcript'])
            total_duration += segment.get('duration', 2.0)
        
        return " ".join(recent_segments)
    
    def get_metrics_summary(self) -> Dict:
        """
        Get summary of all metrics collected so far.
        
        Returns:
            Dictionary with aggregated metrics
        """
        if not self.fast_metrics_history:
            return {
                'total_chunks': 0,
                'average_pitch_variance': 0.0,
                'average_energy': 0.0,
                'average_filler_rate': 0.0,
                'average_wpm': 0.0,
                'sentiment_checkpoints': 0
            }
        
        # Aggregate fast metrics
        pitch_variances = [m['pitch']['pitch_variance'] for m in self.fast_metrics_history if 'pitch' in m]
        energies = [m['energy']['rms_mean'] for m in self.fast_metrics_history if 'energy' in m]
        filler_rates = [m['filler']['filler_rate'] for m in self.fast_metrics_history if 'filler' in m]
        wpms = [m['wpm']['wpm'] for m in self.fast_metrics_history if 'wpm' in m and m['wpm']['wpm'] > 0]
        
        return {
            'total_chunks': len(self.fast_metrics_history),
            'average_pitch_variance': float(np.mean(pitch_variances)) if pitch_variances else 0.0,
            'average_energy': float(np.mean(energies)) if energies else 0.0,
            'average_filler_rate': float(np.mean(filler_rates)) if filler_rates else 0.0,
            'average_wpm': float(np.mean(wpms)) if wpms else 0.0,
            'sentiment_checkpoints': len(self.sentiment_history),
            'last_sentiment': self.sentiment_history[-1] if self.sentiment_history else None
        }
    
    def reset(self):
        """Reset pipeline state."""
        self.transcript_buffer.clear()
        self.transcript_segments.clear()
        self.fast_metrics_history.clear()
        self.sentiment_history.clear()
        self.last_sentiment_time = None
        self.pipeline_start_time = None

