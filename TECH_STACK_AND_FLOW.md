# XP Lab - Tech Stack & Flow Deep Dive

This document provides a comprehensive explanation of XP Lab's technology stack, architecture, and how all components work together.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Real-Time Audio Processing Flow](#real-time-audio-processing-flow)
8. [Authentication & Authorization](#authentication--authorization)
9. [API Communication](#api-communication)
10. [WebSocket Communication](#websocket-communication)
11. [AI Services Integration](#ai-services-integration)
12. [Key Workflows](#key-workflows)

---

## Overview

XP Lab is a full-stack educational platform that combines real-time AI-powered lecture analysis with gamified student engagement. The system serves two distinct user types:

- **Professors**: Real-time teaching feedback, lecture analytics, and student management
- **Students**: Gamified learning experience with points, streaks, badges, and leaderboards

The platform processes live audio streams, performs real-time voice analysis, generates engagement metrics, and provides comprehensive post-lecture analytics.

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 - Component-based UI library
- **Build Tool**: Vite 5.4.2 - Fast development server and build tool
- **Routing**: React Router DOM 6.26.0 - Client-side routing
- **Styling**: TailwindCSS 3.4.11 - Utility-first CSS framework
- **Charts**: Recharts 2.12.7 - Composable charting library
- **Icons**: Lucide React 0.446.0 - Icon component library
- **Animations**: Framer Motion 11.5.4 - Animation library
- **State Management**: React Context API - Built-in state management

### Backend
- **Framework**: FastAPI 0.104.1 - Modern Python web framework
- **Server**: Uvicorn 0.24.0 - ASGI server for FastAPI
- **WebSockets**: WebSockets 15.0.1 - Real-time bidirectional communication
- **Async Runtime**: Python asyncio - Asynchronous programming

### Database & Storage
- **Database**: PostgreSQL (via Supabase) - Relational database
- **ORM/Client**: Supabase Python Client 2.0.3 - Database client library
- **Authentication**: Supabase Auth - Built-in authentication system
- **Storage**: Supabase Storage - File storage service

### AI & Audio Processing
- **Transcription**: OpenAI Whisper API - Speech-to-text conversion
- **LLM**: OpenAI GPT-4 - Question generation & sentiment analysis
- **Audio Processing Libraries**:
  - librosa 0.11.0 - Audio analysis
  - numpy 2.3.4 - Numerical operations
  - scipy 1.16.3 - Signal processing
  - pydub 0.25.1 - Audio format conversion
  - soundfile 0.13.1 - Audio I/O
- **DSP**: Custom fast DSP pipeline for real-time metrics

### Development Tools
- **Package Manager**: npm (frontend), pip (backend)
- **Environment**: Python 3.8+, Node.js 18+
- **Environment Variables**: python-dotenv - .env file management

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Professor  │  │   Student    │  │   Landing    │      │
│  │   Dashboard   │  │  Dashboard   │  │    Page     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Live Lecture (WebSocket + Audio Stream)        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST API
                       │ WebSocket (wss://)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │  WebSocket   │  │   Services   │      │
│  │   Routes     │  │   Handler    │  │   (AI, etc)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Voice Pipeline Manager (AI Assistant)        │  │
│  │  • Fast DSP (2s intervals)                           │  │
│  │  • Whisper Transcription (10s batches)             │  │
│  │  • Sentiment Analysis (8-15s intervals)             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Supabase Client
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                     │
│  • Users, Classes, Lectures                                  │
│  • Attendance, Participation, Questions                       │
│  • Student Profiles, Streaks, Badges                         │
│  • Lecture Reports, Engagement Points                         │
└──────────────────────────────────────────────────────────────┘
                       │
                       │ API Calls
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    OpenAI Services                            │
│  • Whisper API (Transcription)                               │
│  • GPT-4 (Question Generation, Sentiment Analysis)            │
└──────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Project Structure

```
src/
├── App.jsx                 # Main router configuration
├── main.jsx                # React entry point
├── index.css               # Global styles (Tailwind)
├── context/
│   └── AuthContext.jsx     # Authentication state management
├── pages/
│   ├── Landing.jsx         # Landing page
│   ├── Login.jsx          # Login page
│   ├── SignUp.jsx         # Registration page
│   ├── professor/
│   │   ├── Dashboard.jsx  # Class list, start lecture
│   │   ├── LiveLecture.jsx # Live lecture with AI assistant
│   │   ├── Analytics.jsx  # Post-lecture analytics
│   │   ├── Students.jsx   # Student management
│   │   ├── Reports.jsx   # Lecture reports list
│   │   └── More.jsx      # Class management
│   └── student/
│       ├── Dashboard.jsx   # Student dashboard
│       ├── LiveLecture.jsx # Student lecture view
│       ├── Profile.jsx     # Student profile & stats
│       └── Leaderboard.jsx # Rankings & leaderboard
├── components/
│   ├── EndOfClassSummary.jsx
│   └── FeedbackNotifications.jsx
└── services/
    └── api.js              # API client (REST endpoints)
```

### Key Frontend Patterns

#### 1. Authentication Flow
- Uses React Context (`AuthContext`) for global auth state
- Stores `access_token`, `user_id`, and `user_role` in `localStorage`
- Protected routes redirect to `/login` if unauthenticated
- Role-based routing (professor vs student)

#### 2. Real-Time Audio Streaming
- **Web Audio API**: Captures raw PCM audio at 16kHz
- **ScriptProcessor**: Converts Float32 to Int16 PCM
- **WebSocket**: Sends 0.5-second binary PCM chunks to backend
- **State Management**: React hooks (`useState`, `useEffect`) for metrics/transcript updates

#### 3. Component Lifecycle
```javascript
// Example: LiveLecture.jsx
useEffect(() => {
  // 1. Initialize WebSocket connection
  // 2. Start audio capture (Web Audio API)
  // 3. Set up message handlers
  // 4. Cleanup on unmount
}, [lectureId]);
```

#### 4. State Management
- **Local State**: `useState` for component-specific data
- **Context**: `AuthContext` for global auth state
- **API Calls**: Centralized in `services/api.js`
- **Real-time Updates**: WebSocket message handlers update state directly

---

## Backend Architecture

### Project Structure

```
app/
├── main.py                 # FastAPI app, CORS, route registration
├── config.py              # Environment variables (Pydantic Settings)
├── database.py            # Supabase client initialization
├── models/                # Pydantic models (request/response validation)
│   ├── user.py
│   ├── course.py
│   ├── lecture.py
│   ├── question.py
│   ├── student.py
│   └── ...
├── routes/                # API endpoint handlers
│   ├── auth.py            # Authentication endpoints
│   ├── classes.py         # Class management
│   ├── lectures.py       # Lecture CRUD, start/end
│   ├── questions.py       # Question creation, responses
│   ├── attendance.py      # Attendance tracking
│   ├── participation.py   # Participation logging
│   ├── students.py        # Student profiles, leaderboards
│   ├── analytics.py       # Post-lecture analytics
│   ├── streaks.py         # Streak management
│   ├── engagement.py      # Engagement metrics
│   └── settings.py        # Teacher settings
├── services/              # Business logic
│   ├── ai_service.py      # GPT-4 question generation
│   ├── gamification.py    # Points, ranks, streaks
│   ├── badges.py          # Badge system
│   └── engagement_analytics.py
├── websockets/
│   └── audio_handler.py   # WebSocket handler for audio streaming
├── utils/
│   ├── rank_calculator.py
│   ├── points_calculator.py
│   ├── streak_manager.py
│   └── lecture_code.py
└── ai_assistant/          # Standalone AI voice pipeline
    └── voice_pipeline/
        ├── pipeline_manager.py  # Orchestrates DSP + sentiment
        ├── fast_dsp.py          # Real-time voice metrics
        ├── whisper_transcriber.py # Whisper API wrapper
        └── sentiment_analyzer.py  # GPT-4 sentiment analysis
```

### Key Backend Patterns

#### 1. FastAPI Application Structure
```python
# main.py
app = FastAPI(title="XP Lab API", version="2.0.0")

# CORS middleware (allows frontend to connect)
app.add_middleware(CORSMiddleware, ...)

# Route registration
app.include_router(auth.router, prefix="/auth")
app.include_router(lectures.router, prefix="/lectures")
# ... etc

# WebSocket endpoint
@app.websocket("/audio/stream/{lecture_id}")
async def audio_stream_endpoint(...):
    await audio_websocket_handler(...)
```

#### 2. Request/Response Validation
- Uses Pydantic models for request validation
- Automatic OpenAPI/Swagger documentation at `/docs`
- Type-safe request/response handling

#### 3. Database Access Pattern
```python
# All database access via Supabase client
from app.database import supabase

# Query pattern
result = supabase.table("lectures").select("*").eq("lecture_id", id).execute()
data = result.data  # List of dicts
```

#### 4. Async/Await Pattern
- All route handlers are `async` functions
- Database calls are synchronous (Supabase client), but wrapped in async handlers
- WebSocket handlers use `asyncio` for concurrent processing

---

## Database Schema

### Core Tables

#### **users**
- Extends Supabase `auth.users`
- Stores: `user_id` (UUID, PK), `email`, `role` ('professor' | 'student')

#### **classes**
- Stores: `class_id` (UUID, PK), `professor_id` (FK), `name`, `created_at`

#### **lectures**
- Stores: `lecture_id` (UUID, PK), `class_id` (FK), `lecture_code` (unique), `start_time`, `end_time`, `transcript` (TEXT), `status` ('scheduled' | 'active' | 'ended')

#### **attendance_logs**
- Stores: `attendance_id` (UUID, PK), `student_id` (FK), `lecture_id` (FK), `checked_in_at`, `excused`

#### **participation_logs**
- Stores: `participation_id` (UUID, PK), `student_id` (FK), `lecture_id` (FK), `points_awarded`, `timestamp`

#### **questions**
- Stores: `question_id` (UUID, PK), `lecture_id` (FK), `question_text`, `option_a/b/c/d`, `correct_answer`, `status` ('pending' | 'triggered' | 'revealed'), `triggered_at`, `revealed_at`, `topic`

#### **question_responses**
- Stores: `response_id` (UUID, PK), `question_id` (FK), `student_id` (FK), `selected_answer`, `is_correct`, `submitted_at`
- Unique constraint: `(question_id, student_id)`

#### **student_profiles**
- Stores: `profile_id` (UUID, PK), `student_id` (FK, unique), `total_points`, `rank` ('bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'), `total_correct_answers`

#### **student_streaks**
- Stores: `streak_id` (UUID, PK), `student_id` (FK), `class_id` (FK), `current_streak`, `longest_streak`
- Unique constraint: `(student_id, class_id)`

#### **lecture_engagement_points**
- Stores: `point_id` (UUID, PK), `lecture_id` (FK), `ts` (timestamp), `sentiment_score`, `confidence`, `delivery_clarity`, `delivery_pace`, `delivery_pitch`, `engagement`

#### **lecture_reports**
- Stores: `lecture_id` (UUID, PK, FK), `professor_id` (FK), `topic`, `date`, `duration_minutes`, `headline_engagement`, `talk_time_professor`, `talk_time_students`, `participation_rate`, `timeline` (JSONB), `summary` (JSONB)

### Gamification Tables

#### **streak_savers**
- Tracks when students use monthly streak restore
- Stores: `id` (UUID, PK), `student_id` (FK), `class_id` (FK), `used_at`, `restored_to`

#### **streak_resets**
- Tracks when teachers reset student streaks
- Stores: `id` (UUID, PK), `student_id` (FK), `class_id` (FK), `teacher_id` (FK), `reset_at`, `new_streak`, `reason`

#### **teacher_settings**
- Custom point values and thresholds per class
- Stores: `class_id` (UUID, PK), ranking thresholds, attendance points, question points, teacher bonus limits

#### **teacher_bonus_points**
- Tracks bonus points awarded by teachers
- Stores: `bonus_id` (UUID, PK), `student_id` (FK), `lecture_id` (FK), `teacher_id` (FK), `points_awarded`, `reason`, `awarded_at`

### Badge System Tables

#### **badge_definitions**
- Stores badge metadata
- Stores: `badge_id` (UUID, PK), `badge_name`, `badge_type`, `description`, `icon_name`, `criteria_config` (JSONB)

#### **student_badges**
- Tracks earned badges
- Stores: `student_badge_id` (UUID, PK), `student_id` (FK), `badge_id` (FK), `lecture_id` (FK), `class_id` (FK), `earned_at`, `is_temporary`

#### **quiz_sessions**
- Tracks quiz participation for badge eligibility
- Stores: `quiz_session_id` (UUID, PK), `lecture_id` (FK), `student_id` (FK), `question_id` (FK), `answered_at`, `is_correct`, `response_time_ms`, `question_order`

### Indexes
- Indexes on foreign keys and frequently queried columns (e.g., `lecture_id`, `student_id`, `class_id`)
- Composite indexes for common query patterns

---

## Real-Time Audio Processing Flow

### Overview
The system processes live audio from the professor's microphone, generating real-time metrics (clarity, pace, pitch variation) and transcriptions, while performing periodic sentiment analysis.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: LiveLecture.jsx                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Web Audio API captures microphone                  │   │
│  │ 2. ScriptProcessor converts Float32 → Int16 PCM      │   │
│  │ 3. Sends 0.5s PCM chunks as binary WebSocket msgs   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WebSocket: ws://localhost:8000/audio/stream/{lecture_id}
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Backend: audio_handler.py                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Receives binary PCM chunks                        │   │
│  │ 2. Converts Int16 bytes → NumPy array                │   │
│  │ 3. Accumulates chunks into 10s batches               │   │
│  └──────────────────────────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  VoicePipelineManager (ai_assistant/)                 │   │
│  │  ┌──────────────────┐  ┌──────────────────┐         │   │
│  │  │  Fast DSP        │  │  Whisper API     │         │   │
│  │  │  (Every 2s)     │  │  (Every 10s)    │         │   │
│  │  │  • Clarity      │  │  • Transcription │         │   │
│  │  │  • Pace (WPM)  │  │                  │         │   │
│  │  │  • Pitch Var.  │  │                  │         │   │
│  │  └──────────────────┘  └──────────────────┘         │   │
│  │                       │                               │   │
│  │                       ▼                               │   │
│  │  ┌──────────────────────────────────────┐           │   │
│  │  │  Sentiment Analyzer (GPT-4)         │           │   │
│  │  │  (Every 8-15s, based on transcript)   │           │   │
│  │  │  • Emotional tone                   │           │   │
│  │  │  • Engagement score                  │           │   │
│  │  └──────────────────────────────────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebSocket.send_json()                                │   │
│  │  • voice_metrics (clarity, pace, pitch)              │   │
│  │  • transcript_update (new segments)                  │   │
│  │  • sentiment_data (engagement, tone)                │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WebSocket messages
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Frontend: Updates UI in real-time                           │
│  • Clarity, Pace, Pitch Variation progress bars             │
│  • Live Transcription panel                                  │
│  • Sentiment analysis display                              │
└──────────────────────────────────────────────────────────────┘
```

### Detailed Processing Steps

#### 1. Audio Capture (Frontend)
```javascript
// LiveLecture.jsx
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(8192, 1, 1);

processor.onaudioprocess = (e) => {
  const inputData = e.inputBuffer.getChannelData(0); // Float32
  const int16Data = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
  }
  // Send binary PCM chunk via WebSocket
  ws.send(int16Data.buffer);
};
```

#### 2. Audio Reception (Backend)
```python
# audio_handler.py
async def audio_websocket_handler(websocket, lecture_id, professor_id):
    while True:
        message = await websocket.receive()
        
        if message["type"] == "websocket.receive":
            if "bytes" in message:
                # Binary PCM data
                pcm_bytes = message["bytes"]
                audio_array = convert_pcm_bytes_to_audio(pcm_bytes)
                # Accumulate into batch...
```

#### 3. Fast DSP Processing (Every 2 seconds)
```python
# fast_dsp.py
def analyze_voice_chunk(audio_data, transcript, duration_seconds, sr=22050):
    # 1. Pitch variation (monotone detection)
    pitch_variation = analyze_pitch_variation(audio_data, sr)
    
    # 2. Filler word detection
    filler_rate = calculate_filler_rate(transcript)
    clarity = 100 * ((1.0 - filler_rate) ** 1.5)
    
    # 3. Words per minute
    wpm = calculate_wpm(transcript, duration_seconds)
    
    return {
        "clarity": clarity,
        "pace": wpm,
        "pitch_variation": pitch_variation
    }
```

#### 4. Whisper Transcription (Every 10 seconds)
```python
# whisper_transcriber.py
async def transcribe_audio_chunk(audio_array, sr=16000):
    # Convert NumPy array to WAV bytes
    wav_bytes = audio_to_wav_bytes(audio_array, sr)
    
    # Call OpenAI Whisper API
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=wav_bytes,
        response_format="text"
    )
    
    return transcript.text.strip()
```

#### 5. Sentiment Analysis (Every 8-15 seconds)
```python
# sentiment_analyzer.py
async def analyze_sentiment(transcript_buffer):
    prompt = f"""Analyze the emotional tone and engagement level...
    Transcript: {transcript_buffer}
    ..."""
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Parse JSON response: sentiment_score, confidence, tone
    return parsed_sentiment
```

#### 6. EMA Smoothing
- Metrics are smoothed using Exponential Moving Average (EMA) to prevent erratic jumps
- `clarity`: EMA alpha = 0.4
- `pace`: EMA alpha = 0.4, clamped to min 10.0
- `pitch_variation`: EMA alpha = 0.65

#### 7. WebSocket Message Format
```json
// voice_metrics
{
  "type": "voice_metrics",
  "metrics": {
    "clarity": 85,
    "pace": 150,
    "pitch_variation": 72
  }
}

// transcript_update
{
  "type": "transcript_update",
  "transcript": "Full accumulated transcript...",
  "new_segment": "Latest 10s segment..."
}

// sentiment_data
{
  "type": "sentiment_data",
  "sentiment": {
    "score": 0.75,
    "confidence": 0.9,
    "tone": "engaging",
    "engagement": 82
  }
}
```

---

## Authentication & Authorization

### Flow
```
1. User Registration
   POST /auth/register
   → Supabase Auth: createUser()
   → Insert into users table (role: 'professor' | 'student')
   → Return access_token, user_id, role

2. User Login
   POST /auth/login
   → Supabase Auth: signInWithPassword()
   → Query users table for role
   → Return access_token, user_id, role

3. Frontend Storage
   → localStorage.setItem('access_token', token)
   → localStorage.setItem('user_id', user_id)
   → localStorage.setItem('user_role', role)

4. Protected Routes
   → AuthContext checks localStorage on mount
   → If no token: redirect to /login
   → If token exists: verify with /auth/me

5. API Requests
   → Include access_token in Authorization header (if needed)
   → Backend validates via Supabase Auth
```

### Role-Based Access
- **Professor**: Can create classes, start lectures, view analytics, manage students
- **Student**: Can join lectures, answer questions, view leaderboard, track progress

---

## API Communication

### REST API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout

#### Classes
- `GET /classes` - List professor's classes
- `POST /classes` - Create class
- `DELETE /classes/{id}` - Delete class

#### Lectures
- `POST /lectures` - Create lecture
- `POST /lectures/{id}/start` - Start lecture
- `POST /lectures/{id}/end` - End lecture (generates report)
- `GET /lectures/{id}` - Get lecture details
- `GET /lectures/{id}/attendance` - Get attendance list

#### Questions
- `POST /questions` - Create question (AI/manual/hybrid)
- `POST /questions/{id}/trigger` - Trigger question to students
- `POST /questions/{id}/reveal` - Reveal correct answer
- `POST /questions/{id}/respond` - Student submits answer

#### Analytics
- `GET /analytics/{lecture_id}` - Get full analytics (computes if missing)
- `GET /analytics/reports` - List professor's reports
- `GET /analytics/reports/{lecture_id}` - Get stored report

#### Students
- `GET /students/leaderboard` - Get leaderboard
- `GET /students/profile/{id}` - Get student profile
- `GET /students/class/{class_id}` - Get class students

### Request/Response Pattern
```javascript
// Frontend API call
const response = await fetch(`${API_URL}/lectures`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(lectureData)
});
const data = await response.json();
```

---

## WebSocket Communication

### Connection Establishment
```javascript
// Frontend
const ws = new WebSocket(
  `ws://localhost:8000/audio/stream/${lectureId}?professor_id=${professorId}`
);
ws.binaryType = 'arraybuffer'; // For binary PCM data
```

### Message Types

#### **Frontend → Backend**
1. **Binary PCM Chunks**: Raw Int16 PCM audio data (0.5s chunks)
2. **JSON Metadata** (optional): Chunk info, timestamps

#### **Backend → Frontend**
1. **voice_metrics**: `{ type: "voice_metrics", metrics: { clarity, pace, pitch_variation } }`
2. **transcript_update**: `{ type: "transcript_update", transcript: "...", new_segment: "..." }`
3. **sentiment_data**: `{ type: "sentiment_data", sentiment: { score, confidence, tone, engagement } }`

### Connection Lifecycle
1. **Connect**: Frontend opens WebSocket on lecture start
2. **Stream**: Continuous binary PCM chunks sent every 0.5s
3. **Receive**: Backend sends metrics/transcript/sentiment updates
4. **Disconnect**: On lecture end or WebSocket close
   - Backend saves transcript to database
   - Cleans up in-memory state

---

## AI Services Integration

### OpenAI Whisper (Transcription)
- **Model**: `whisper-1`
- **Input**: WAV audio bytes (16kHz, mono)
- **Output**: Plain text transcript
- **Frequency**: Every 10 seconds (batched)
- **Cost**: Pay-per-minute of audio

### OpenAI GPT-4 (Question Generation)
- **Model**: `gpt-4`
- **Input**: Lecture slide content (PowerPoint text) or transcript
- **Output**: JSON with question, 4 options, correct answer
- **Frequency**: On-demand (when professor clicks "Quick comprehension check")
- **Prompt**: Tailored to prioritize slide content over transcript

### OpenAI GPT-4 (Sentiment Analysis)
- **Model**: `gpt-4`
- **Input**: Accumulated transcript buffer (last 8-15 seconds)
- **Output**: JSON with sentiment_score, confidence, tone, engagement
- **Frequency**: Every 8-15 seconds (based on transcript availability)
- **Cost**: Pay-per-token

---

## Key Workflows

### 1. Starting a Lecture
```
Professor clicks "Start Lecture"
  → POST /lectures (create lecture record)
  → POST /lectures/{id}/start (set status='active')
  → Navigate to /professor/lecture/{id}
  → Frontend: Initialize WebSocket connection
  → Frontend: Start audio capture (Web Audio API)
  → Backend: Initialize VoicePipelineManager
  → Begin real-time processing
```

### 2. During Lecture
```
Audio Stream (continuous)
  → Frontend sends PCM chunks every 0.5s
  → Backend accumulates into 10s batches
  → Fast DSP: Clarity, Pace, Pitch (every 2s)
  → Whisper: Transcription (every 10s)
  → GPT-4: Sentiment (every 8-15s)
  → Backend sends updates via WebSocket
  → Frontend updates UI in real-time
```

### 3. Ending a Lecture
```
Professor clicks "End Lecture & View Analytics"
  → POST /lectures/{id}/end
  → Backend: Mark lecture as 'ended'
  → Backend: Calculate duration
  → Backend: Generate analytics report
  → Backend: Upsert into lecture_reports
  → Backend: Save transcript to lectures table
  → WebSocket: Close connection, cleanup
  → Navigate to /professor/analytics/{id}
  → Display analytics dashboard
```

### 4. Student Joining Lecture
```
Student enters lecture code
  → POST /attendance/check-in
  → Backend: Create attendance_log
  → Backend: Update streak (gamification)
  → Frontend: Show lecture content
  → Student can answer questions, view slides
```

### 5. Question Flow
```
Professor clicks "Quick comprehension check"
  → Frontend: Extract slide content
  → POST /questions (mode='ai_full', slide_content=...)
  → Backend: Call GPT-4 with slide content
  → Backend: Generate question + options
  → Backend: Save to questions table
  → Frontend: Display modal with question
  → Professor can trigger to students
  → POST /questions/{id}/trigger
  → Students see question, submit answers
  → POST /questions/{id}/respond
  → Backend: Award points for correct answers
  → POST /questions/{id}/reveal (show correct answer)
```

---

## Performance Considerations

### Frontend
- **Audio Processing**: Web Audio API runs in separate thread (non-blocking)
- **State Updates**: Batched React updates prevent UI lag
- **WebSocket**: Binary protocol reduces bandwidth

### Backend
- **Async Processing**: Transcription and sentiment run in thread pool (`ThreadPoolExecutor`)
- **Batch Processing**: 10s audio batches reduce API calls
- **EMA Smoothing**: Prevents metric jitter
- **In-Memory State**: Fast access to active lecture data

### Database
- **Indexes**: Foreign keys and frequently queried columns indexed
- **JSONB**: Efficient storage for timeline data
- **Connection Pooling**: Supabase client handles pooling

---

## Security Considerations

1. **Authentication**: Supabase Auth handles password hashing, JWT tokens
2. **CORS**: Restricted to specific origins (localhost in dev, production domain in prod)
3. **API Keys**: Stored in environment variables, never committed
4. **WebSocket**: Validates `professor_id` query parameter
5. **Role-Based Access**: Backend validates user roles for sensitive operations
6. **SQL Injection**: Pydantic models + Supabase client prevent injection

---

This document provides a comprehensive overview of how XP Lab's technology stack works together to create a real-time, AI-powered educational platform.

