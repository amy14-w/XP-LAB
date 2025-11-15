# XP Lab - AI-Powered Lecture Assistant

**XP Lab** (formerly ClassLens) is a two-sided platform that improves teaching quality AND boosts student engagement through AI, analytics, and Duolingo-style motivation.

![XP Lab Banner](https://img.shields.io/badge/React-18.3-blue) ![Vite](https://img.shields.io/badge/Vite-5.4-purple) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## 🎯 Project Overview

XP Lab is a comprehensive education platform with two distinct user experiences:

### 🟦 Professor Side
- **AI Teaching Assistant**: Real-time feedback during lectures on pacing, engagement, and clarity
- **Participation Logging**: Track student participation with one-tap logging
- **Analytics Dashboard**: Post-lecture insights on engagement, talk-time, confusion spikes, and more

### 🟩 Student Side
- **Gamified Learning**: Duolingo-style experience with points, streaks, badges, and ranks
- **Chapter Progression**: Visual learning path with lessons and quizzes
- **Leaderboard**: Competitive rankings with Bronze → Silver → Gold → Platinum tiers
- **Profile & Stats**: Personal analytics, weekly progress, and achievement tracking

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Styling**: TailwindCSS 3.4
- **Routing**: React Router DOM 6.26
- **Charts**: Recharts 2.12
- **Icons**: Lucide React
- **Animations**: Framer Motion 11.5

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI Services**: OpenAI (Whisper + GPT-4)
- **Real-time**: WebSockets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- npm or yarn package manager

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create a `.env` file in the root directory:
```

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgres_url
```

```bash
# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Database Setup

Create the following tables in your Supabase PostgreSQL database:
See `database_schema.sql` for the complete schema.

## 📁 Project Structure

```
XP-LAB/
├── app/                    # Backend (FastAPI)
│   ├── main.py            # FastAPI app
│   ├── config.py          # Settings
│   ├── database.py        # Supabase connection
│   ├── models/            # Pydantic models
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic (AI, gamification)
│   ├── websockets/        # WebSocket handlers
│   └── utils/             # Utilities
├── src/                    # Frontend (React)
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context (Auth, etc.)
│   ├── pages/
│   │   ├── Landing.jsx    # Landing page
│   │   ├── Login.jsx      # Login page
│   │   ├── SignUp.jsx     # Sign up page
│   │   ├── professor/     # Professor-specific pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LiveLecture.jsx
│   │   │   └── Analytics.jsx
│   │   └── student/       # Student-specific pages
│   │       ├── Dashboard.jsx
│   │       ├── Profile.jsx
│   │       └── Leaderboard.jsx
│   ├── App.jsx            # Main app component with routing
│   ├── main.jsx           # App entry point
│   └── index.css          # Global styles
├── index.html
├── package.json
├── requirements.txt
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Features

### Question System
- **AI Full**: AI generates question + 4 options + correct answer
- **Manual Full**: Professor creates everything
- **Hybrid**: Professor creates question, AI generates options

### Gamification
- Points system
- Streaks per course
- Ranks: Bronze (0-149), Silver (150-399), Gold (400-999), Platinum (1000+)
- Correct answer tracking
- Badge system

### AI Features
- Real-time audio transcription (Whisper)
- Engagement analysis
- Question suggestions every 15 minutes
- Pacing and concept density analysis

### Professor Features
1. **Live Lecture Mode**
   - Real-time AI feedback on teaching
   - Student participation tracking
   - Engagement metrics
   - Quick activity suggestions

2. **Analytics Dashboard**
   - Engagement timeline charts
   - Talk-time ratio visualization
   - Participation metrics
   - Confusion spike detection
   - AI-powered insights and recommendations

3. **Class Management**
   - Multiple class support
   - Student roster management
   - Attendance tracking

### Student Features
1. **Gamified Dashboard**
   - Chapter-based learning progression
   - Lesson nodes with completion tracking
   - Visual learning path

2. **Profile & Stats**
   - XP points and level system
   - Streak tracking (🔥 fire emoji)
   - Rank progression (Bronze → Platinum)
   - Weekly progress charts
   - Participation trend analysis

3. **Achievements & Badges**
   - Unlockable badges
   - Achievement tracking
   - Leaderboard rankings

4. **Leaderboard**
   - Class-wide rankings
   - Top 3 podium display
   - Rank tiers with color coding
   - Streak comparisons

## 📡 API Endpoints

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

## 🎮 Demo Accounts

You can login with any email/password combination. The app will automatically create a demo account based on your role selection:

- **Professor Demo**: Select "Professor" during login
- **Student Demo**: Select "Student" during login

## 🌈 Color Scheme

The app uses a sophisticated dark theme with gradient backgrounds:

- **Primary Background**: Slate 700 → 800 → 900 gradient
- **Accent Colors**: 
  - Cyan (#00CED1) - Primary actions
  - Green (#7ED321) - Navigation & success
  - Pink (#FF69B4) - Completed items
  - Orange - Streaks
  - Yellow - Achievements

- **Rank Colors**:
  - Bronze: #CD7F32
  - Silver: #C0C0C0
  - Gold: #FFD700
  - Platinum: #E5E4E2

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1366px+)
- Tablet (768px+)
- Mobile (375px+)

## 🔐 Authentication

Role-based authentication with:
- Professor role
- Student role
- Persistent login state
- Role-specific routing

## 📄 Scripts

### Frontend
```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend
```bash
# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📝 Notes

- AI question suggestions reset timer when professor triggers question
- Rejecting AI suggestion adds 7 minutes to timer
- Questions are Kahoot-style: 20-second timer, auto-reveal when time expires or all students answer

## 🚧 Future Enhancements

- [ ] Complete backend API integration
- [ ] Real-time WebSocket for live lectures
- [ ] Audio processing for AI feedback
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with ML insights
- [ ] Student study recommendations
- [ ] Integration with LMS platforms

## 🤝 Contributing

This is a hackathon project. Feel free to fork and customize for your needs!

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 👥 Team

Built with ❤️ for education technology

---

**XP Lab** - Making lectures engaging, one XP point at a time! 🎓✨
We're building a two-sided platform that improves teaching quality AND boosts student engagement through AI, analytics, and Duolingo-style motivation.
