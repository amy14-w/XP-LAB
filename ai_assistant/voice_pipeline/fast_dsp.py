"""
Fast DSP Pipeline - Real-time voice quality analysis (2s chunks)

Analyzes audio chunks for:
- Pitch variation (librosa.pyin)
- Energy/Volume (RMS)
- Filler word rate (regex on transcript)
- Speaking rate/WPM (Whisper timestamps)
"""

import librosa
import numpy as np
from typing import Dict, Optional, List
import re


def analyze_pitch_variation(audio_data: np.ndarray, sr: int = 22050) -> Dict:
    """
    Analyze pitch variation using librosa.pyin (Probabilistic YIN).
    
    Args:
        audio_data: Audio waveform (numpy array)
        sr: Sample rate (default 22050)
    
    Returns:
        Dictionary with pitch metrics:
        - pitch_variance: Variance of pitch values (higher = more varied)
        - pitch_range: Peak-to-peak range in Hz
        - pitch_std: Standard deviation in Hz
        - valid_pitch_ratio: Ratio of voiced segments (0-1)
        - average_pitch: Mean pitch in Hz
    """
    try:
        # Extract pitch using Probabilistic YIN
        # librosa.pyin returns (pitches, magnitudes, thresholds) in newer versions (0.10+)
        # For compatibility, handle both 2-tuple and 3-tuple returns
        pyin_result = librosa.pyin(
            audio_data,
            fmin=librosa.note_to_hz('C2'),  # ~65 Hz (low male voice)
            fmax=librosa.note_to_hz('C7')   # ~2093 Hz (high female voice)
        )
        
        # Unpack result (newer librosa returns 3 values, older returns 2)
        pitches = pyin_result[0]
        magnitudes = pyin_result[1]
        # Ignore thresholds (third value) if present
        
        # Filter out NaN values (unvoiced segments)
        valid_pitches = pitches[~np.isnan(pitches)]
        
        if len(valid_pitches) == 0:
            # No voiced segments detected (silence)
            return {
                'pitch_variance': 0.0,
                'pitch_range': 0.0,
                'pitch_std': 0.0,
                'valid_pitch_ratio': 0.0,
                'average_pitch': 0.0,
                'monotone_score': 1.0  # Maximum monotone (no variation)
            }
        
        # Calculate metrics
        pitch_variance = np.var(valid_pitches)
        pitch_range = np.ptp(valid_pitches)  # Peak-to-peak
        pitch_std = np.std(valid_pitches)
        valid_pitch_ratio = len(valid_pitches) / len(pitches)
        average_pitch = np.mean(valid_pitches)
        
        # Monotone score: 0 = very varied, 1 = monotone
        # Normalize variance (typical speaking range ~200-400 Hz)
        # Lower variance = more monotone
        # Use 800 as divisor (more lenient than 1000) to make it easier to reach good scores
        # Decent speakers should easily reach green zone (70%+)
        normalized_variance = min(pitch_variance / 800.0, 1.0)  # Scale to 0-1 (lenient - easy to score well)
        monotone_score = 1.0 - normalized_variance
        
        return {
            'pitch_variance': float(pitch_variance),
            'pitch_range': float(pitch_range),
            'pitch_std': float(pitch_std),
            'valid_pitch_ratio': float(valid_pitch_ratio),
            'average_pitch': float(average_pitch),
            'monotone_score': float(monotone_score)
        }
    
    except Exception as e:
        print(f"Error analyzing pitch: {e}")
        return {
            'pitch_variance': 0.0,
            'pitch_range': 0.0,
            'pitch_std': 0.0,
            'valid_pitch_ratio': 0.0,
            'average_pitch': 0.0,
            'monotone_score': 1.0,
            'error': str(e)
        }


def analyze_energy(audio_data: np.ndarray, sr: int = 22050) -> Dict:
    """
    Analyze energy/volume using RMS (Root Mean Square).
    
    Args:
        audio_data: Audio waveform (numpy array)
        sr: Sample rate
    
    Returns:
        Dictionary with energy metrics:
        - rms_mean: Average RMS energy
        - rms_max: Maximum RMS energy
        - rms_std: Standard deviation of RMS
        - energy_normalized: Normalized energy (0-1 scale)
    """
    try:
        # Calculate RMS energy over time
        rms = librosa.feature.rms(y=audio_data)[0]
        
        if len(rms) == 0 or np.all(rms == 0):
            return {
                'rms_mean': 0.0,
                'rms_max': 0.0,
                'rms_std': 0.0,
                'energy_normalized': 0.0
            }
        
        rms_mean = float(np.mean(rms))
        rms_max = float(np.max(rms))
        rms_std = float(np.std(rms))
        
        # Normalize energy (typical RMS range for speech: 0.01-0.5)
        energy_normalized = min(rms_mean / 0.5, 1.0)
        
        return {
            'rms_mean': rms_mean,
            'rms_max': rms_max,
            'rms_std': rms_std,
            'energy_normalized': energy_normalized
        }
    
    except Exception as e:
        print(f"Error analyzing energy: {e}")
        return {
            'rms_mean': 0.0,
            'rms_max': 0.0,
            'rms_std': 0.0,
            'energy_normalized': 0.0,
            'error': str(e)
        }


def calculate_filler_rate(transcript: str) -> Dict:
    """
    Calculate filler word rate from transcript using regex.
    
    Common fillers: um, uh, like, you know, so, well, actually, basically, kind of
    Plus: ah, eh, oh, hmm, repetitions, word fragments
    
    Args:
        transcript: Text transcript (from Whisper)
    
    Returns:
        Dictionary with filler metrics:
        - filler_count: Total number of filler words
        - filler_rate: Fillers per word (0-1)
        - filler_words: List of found filler words
        - total_words: Total word count
        - repetition_penalty: Extra penalty for repeated words (like "like like like")
        - fragment_penalty: Extra penalty for word fragments (words ending with -)
    """
    if not transcript or not transcript.strip():
        return {
            'filler_count': 0,
            'filler_rate': 0.0,
            'filler_words': [],
            'total_words': 0,
            'repetition_penalty': 0.0,
            'fragment_penalty': 0.0
        }
    
    # Normalize transcript: lowercase and keep word tokens
    transcript_lower = transcript.lower()
    # Tokenize words (handles punctuation better than split())
    tokens = re.findall(r"[a-zA-Z'-]+", transcript_lower)  # Include - for fragments
    total_words = len([t for t in tokens if not t.endswith('-')])  # Count non-fragments as words

    # Expanded filler words/phrases (robust variants, case-insensitive)
    # Allow repeated letters (um/umm/ummm, uh/uhh...), optional surrounding punctuation handled by tokenization
    fillers = [
        r'\bum+m+\b',           # um, umm, ummm
        r'\bum\b',              # um
        r'\buh+h+\b',           # uhh, uhhh
        r'\buh\b',              # uh
        r'\ber+m+\b',           # erm, errm
        r'\ber\b',              # er
        r"\buhm+\b",            # uhm, uhmm
        r'\bah+h+\b',           # ah, ahh, ahhh
        r'\bah\b',              # ah
        r'\beh+h+\b',           # eh, ehh, ehhh
        r'\beh\b',              # eh
        r'\boh+h+\b',           # oh, ohh, ohhh
        r'\boh\b',              # oh
        r'\bhm+m+\b',           # hmm, hmmm
        r'\bhm\b',              # hm
        r'\bmhm\b',             # mhm
        r'\buh\s*huh\b',        # uh huh
        r'\buh\s*uh\b',         # uh uh (repetition)
        r'\bah\s*ha\b',         # ah ha
        r'\btsk\b',             # tsk
        r'\bahem\b',            # ahem
        r'\blike\b',            # like
        r'\byou\s+know\b',      # you know
        r'\bso+\b',             # so (elongated)
        r'\bwell+\b',           # well
        r'\bactually\b',        # actually
        r'\bbasically\b',       # basically
        r'\bkind\s+of\b',       # kind of
        r'\bsort\s+of\b',       # sort of
        r'\bi\s+mean\b',        # i mean
        r'\byou\s+see\b',       # you see
        r'\bright\b',           # right (as filler)
        r'\bokay\b',            # okay (as filler, context dependent but common)
        r'\bok\b',              # ok (as filler)
    ]
    
    filler_count = 0
    found_fillers = []
    
    text_for_regex = " ".join(tokens)
    for filler_pattern in fillers:
        matches = re.findall(filler_pattern, text_for_regex, re.IGNORECASE)
        filler_count += len(matches)
        if matches:
            found_fillers.extend(matches)
    
    # Detect repetitions (like "like like like" = unclear speech)
    repetition_penalty = 0.0
    words_list = tokens
    for i in range(len(words_list) - 2):
        if words_list[i] == words_list[i+1] == words_list[i+2]:
            # Triple repetition detected
            repetition_penalty += 0.05  # Add 5% penalty per triple repetition
        elif words_list[i] == words_list[i+1] and words_list[i] in ['like', 'so', 'well', 'you', 'know', 'um', 'uh', 'ah', 'eh', 'oh']:
            # Double repetition of common fillers
            repetition_penalty += 0.02  # Add 2% penalty per double filler repetition
    
    # Detect word fragments (words ending with - indicate incomplete thoughts)
    fragment_count = sum(1 for token in tokens if token.endswith('-') and len(token) > 1)
    fragment_penalty = min(fragment_count * 0.03, 0.15) if total_words > 0 else 0.0  # Max 15% penalty
    
    # Base filler rate
    base_filler_rate = filler_count / total_words if total_words > 0 else 0.0
    
    # Combine with penalties (capped at 1.0)
    filler_rate = min(base_filler_rate + repetition_penalty + fragment_penalty, 1.0)
    
    return {
        'filler_count': filler_count,
        'filler_rate': float(filler_rate),
        'filler_words': list(set(found_fillers)),  # Unique fillers
        'total_words': total_words,
        'repetition_penalty': float(repetition_penalty),
        'fragment_penalty': float(fragment_penalty)
    }


def calculate_wpm(transcript: str, duration_seconds: float, 
                 word_timestamps: Optional[List[Dict]] = None) -> Dict:
    """
    Calculate speaking rate (Words Per Minute) from transcript and duration.
    
    Args:
        transcript: Text transcript
        duration_seconds: Duration of audio chunk in seconds
        word_timestamps: Optional list of word timestamps from Whisper
                        Format: [{'word': 'hello', 'start': 0.0, 'end': 0.5}, ...]
    
    Returns:
        Dictionary with WPM metrics:
        - wpm: Words per minute
        - words_count: Total word count
        - duration_seconds: Duration
        - words_per_second: Speaking rate in words/second
    """
    if not transcript or not transcript.strip():
        return {
            'wpm': 0,
            'words_count': 0,
            'duration_seconds': duration_seconds,
            'words_per_second': 0.0
        }
    
    words_count = len(transcript.split())
    
    if duration_seconds <= 0:
        return {
            'wpm': 0,
            'words_count': words_count,
            'duration_seconds': duration_seconds,
            'words_per_second': 0.0
        }
    
    words_per_second = words_count / duration_seconds
    wpm = int(words_per_second * 60)
    
    # If word timestamps available, use more accurate calculation
    # (accounting for pauses)
    if word_timestamps and len(word_timestamps) > 0:
        first_word_time = word_timestamps[0].get('start', 0)
        last_word_time = word_timestamps[-1].get('end', duration_seconds)
        actual_speech_duration = last_word_time - first_word_time
        
        if actual_speech_duration > 0:
            wpm_from_timestamps = int((words_count / actual_speech_duration) * 60)
            return {
                'wpm': wpm_from_timestamps,
                'words_count': words_count,
                'duration_seconds': duration_seconds,
                'actual_speech_duration': actual_speech_duration,
                'words_per_second': words_count / actual_speech_duration,
                'pauses_duration': duration_seconds - actual_speech_duration
            }
    
    return {
        'wpm': wpm,
        'words_count': words_count,
        'duration_seconds': duration_seconds,
        'words_per_second': words_per_second
    }


def analyze_voice_chunk(audio_data: np.ndarray, transcript: str, 
                       duration_seconds: float, sr: int = 22050,
                       word_timestamps: Optional[List[Dict]] = None) -> Dict:
    """
    Complete voice quality analysis for a 2-second audio chunk.
    
    Combines all fast DSP metrics:
    - Pitch variation
    - Energy/RMS
    - Filler word rate
    - WPM
    
    Args:
        audio_data: Audio waveform (numpy array)
        transcript: Text transcript from Whisper
        duration_seconds: Duration of chunk in seconds
        sr: Sample rate
        word_timestamps: Optional word-level timestamps from Whisper
    
    Returns:
        Dictionary with all voice quality metrics
    """
    pitch_metrics = analyze_pitch_variation(audio_data, sr)
    energy_metrics = analyze_energy(audio_data, sr)
    filler_metrics = calculate_filler_rate(transcript)
    wpm_metrics = calculate_wpm(transcript, duration_seconds, word_timestamps)
    
    return {
        'timestamp': None,  # Will be set by pipeline manager
        'duration_seconds': duration_seconds,
        'pitch': pitch_metrics,
        'energy': energy_metrics,
        'filler': filler_metrics,
        'wpm': wpm_metrics
    }

