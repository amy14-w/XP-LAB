# ClassLens Backend API

AI-Powered Lecture Assistant with Gamified Student Engagement System

## Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI Services**: OpenAI (Whisper + GPT-4)
- **Real-time**: WebSockets

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgres_url
```

### 3. Database Setup

Create the following tables in your Supabase PostgreSQL database:

See `database_schema.sql` for the complete schema.

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Classes
- `POST /classes` - Create class
- `GET /classes` - Get professor's classes
- `GET /classes/{class_id}` - Get class details

### Lectures
- `POST /lectures` - Create lecture
- `POST /lectures/{lecture_id}/start` - Start lecture (generates 4-digit code)
- `POST /lectures/{lecture_id}/end` - End lecture
- `GET /lectures/{lecture_id}` - Get lecture details
- `POST /lectures/{lecture_id}/upload-presentation` - Upload PDF presentation

### Questions
- `POST /questions` - Create question (AI/manual/hybrid)
- `POST /questions/{question_id}/trigger` - Trigger question to students
- `POST /questions/{question_id}/respond` - Student submits answer
- `GET /questions/{question_id}/results` - Get question results
- `WS /questions/lectures/{lecture_id}/questions` - WebSocket for real-time questions

### Attendance
- `POST /attendance/check-in` - Student checks in with lecture code
- `POST /attendance/excuse` - Professor excuses absence

### Participation
- `POST /participation/log` - Professor logs participation
- `GET /participation/{student_id}` - Get participation history

### Students
- `GET /students/{student_id}/profile` - Get student profile
- `GET /students/{student_id}/streaks` - Get streaks per class
- `GET /students/{student_id}/leaderboard` - Get leaderboard
- `GET /students/{student_id}/question-stats` - Get question statistics

### Analytics
- `GET /analytics/lectures/{lecture_id}` - Get lecture analytics

### WebSockets
- `WS /audio/stream/{lecture_id}` - Professor streams audio for AI analysis

## Features

### Question System
- **AI Full**: AI generates question + 4 options + correct answer
- **Manual Full**: Professor creates everything
- **Hybrid**: Professor creates question, AI generates options

### Gamification
- Points system (dummy values for now)
- Streaks per course
- Ranks: Bronze (0-149), Silver (150-399), Gold (400-999), Platinum (1000+)
- Correct answer tracking

### AI Features
- Real-time audio transcription (Whisper)
- Engagement analysis
- Question suggestions every 15 minutes
- Pacing and concept density analysis

## Project Structure

```
app/
├── main.py                 # FastAPI app
├── config.py              # Settings
├── database.py            # Supabase connection
├── models/                 # Pydantic models
├── routes/                 # API endpoints
├── services/               # Business logic (AI, gamification)
├── websockets/             # WebSocket handlers
└── utils/                  # Utilities
```

## Notes

- Points system uses dummy values - implement actual logic later
- Badges system not implemented yet
- AI question suggestions reset timer when professor triggers question
- Rejecting AI suggestion adds 7 minutes to timer
- Questions are Kahoot-style: 20-second timer, auto-reveal when time expires or all students answer

