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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/amy14-w/XP-LAB.git
cd XP-LAB

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
XP-LAB/
├── src/
│   ├── components/         # Reusable UI components
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
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Features

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

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Styling**: TailwindCSS 3.4
- **Routing**: React Router DOM 6.26
- **Charts**: Recharts 2.12
- **Icons**: Lucide React
- **Animations**: Framer Motion 11.5

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

Simple role-based authentication with:
- Professor role
- Student role
- Persistent login state
- Role-specific routing

## 🚧 Future Enhancements

- [ ] Backend API integration
- [ ] Real-time WebSocket for live lectures
- [ ] Audio processing for AI feedback
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with ML insights
- [ ] Student study recommendations
- [ ] Integration with LMS platforms

## 📄 Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🤝 Contributing

This is a hackathon project. Feel free to fork and customize for your needs!

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 👥 Team

Built with ❤️ for education technology

---

**XP Lab** - Making lectures engaging, one XP point at a time! 🎓✨
We’re building a two-sided platform that improves teaching quality AND boosts student engagement through AI, analytics, and Duolingo-style motivation.
