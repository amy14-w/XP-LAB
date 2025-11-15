# XP Lab Points & Gamification System Documentation

## Overview
This document describes the complete points, ranking, streak, and badge system implemented in XP Lab v2.0.

---

## 🏆 Ranking System

### Rank Tiers
Students progress through 6 ranks based on total points:

| Rank | Points Required | Color |
|------|----------------|-------|
| **Master** | 1500+ | Purple |
| **Diamond** | 1250-1499 | Cyan/Blue |
| **Platinum** | 820-1249 | Silver/Gray |
| **Gold** | 400-819 | Gold/Yellow |
| **Silver** | 150-399 | Light Gray |
| **Bronze** | 0-149 | Orange/Brown |

### Implementation
- **Backend**: `app/utils/rank_calculator.py`
- **Model**: `app/models/student.py` (Rank enum updated)
- **Calculation**: Automatic rank update when points are added

---

## 💯 Points System

### Point Values

#### Attendance
- **Present**: +15 points
- **Absent**: -10 points (with -5pts per additional absence)
- **Excused**: 0 points (no penalty)

#### In-Class Questions
- **Base Points**: 25 points per question × (correct/total)
  - Example: 6/8 correct = (6/8) × 25 × 8 = 150 points
- **Perfect Score Bonus**: +10 points (when all questions answered correctly)

#### Streak Bonus
Applied at end of class based on current streak:
- **Day 2-8**: +2 points
- **Day 9-15**: +3 points  
- **Day 16-22**: +4 points
- **Day 23-32+**: +5 points

#### Teacher Bonus
- **Range**: 0-50 points
- **Purpose**: Reward creative or exceptional answers
- **Teacher-awarded**: Manual points given during or after class

### Implementation
- **Calculator**: `app/utils/points_calculator.py`
- **Functions**: 
  - `calculate_attendance_points()`
  - `calculate_question_points()`
  - `calculate_streak_bonus()`
  - `calculate_teacher_bonus()`
  - `calculate_lecture_total()` - Complete breakdown

---

## 🔥 Streak System

### Streak Mechanics
- Streaks count consecutive days of attendance
- Breaking: Missing a class (unless excused) resets streak to 0
- Tracking: Per-class basis (each course has independent streaks)

### Streak Savers
Students have TWO ways to restore broken streaks:

#### 1. Student Streak Saver
- **Frequency**: Once per month
- **Effect**: Restores streak to longest streak value
- **Usage**: Student-initiated
- **Cooldown**: 30 days from last use

#### 2. Teacher Reset
- **Frequency**: Unlimited (teacher discretion)
- **Effect**: Restores streak to longest streak OR custom value
- **Purpose**: Handle technical issues, emergencies, etc.

### Implementation
- **Manager**: `app/utils/streak_manager.py`
- **API Routes**: `app/routes/streaks.py`
- **Key Functions**:
  - `can_use_streak_saver()` - Check availability
  - `use_streak_saver()` - Student uses monthly saver
  - `teacher_reset_streak()` - Teacher resets streak
  - `get_streak_info()` - Complete streak status

### Database Tables
```sql
-- Streak tracking
student_streaks (student_id, class_id, current_streak, longest_streak)

-- Streak saver usage
streak_savers (student_id, class_id, used_at, restored_to)

-- Teacher resets
streak_resets (student_id, class_id, teacher_id, reset_at, new_streak, reason)
```

---

## 🎖️ Badge System

### Question Badges (Temporary - Per Lecture)

#### Hot Streak 🔥
- **Requirement**: 3 correct answers in a row
- **Award Time**: After 3rd consecutive correct answer
- **Display**: Shown in lecture results

#### Fastest Answerer ⚡
- **Requirement**: First person to answer correctly
- **Tracking**: Based on response_time_ms
- **Award Time**: When question closes

#### Cold Badge ❄️
- **Requirement**: 3 wrong answers in a row
- **Purpose**: Identify struggling students for help
- **Award Time**: After 3rd consecutive incorrect answer

#### Perfect Score 💯
- **Requirement**: 100% correct answers in lecture
- **Award Time**: When lecture ends
- **Bonus**: Triggers +10 point bonus

#### Top 3 Badges 🏅
- **Requirement**: Finish in top 3 for lecture
- **Award Time**: When lecture ends
- **Types**: 
  - 🥇 Top 1 (1st place)
  - 🥈 Top 2 (2nd place)
  - 🥉 Top 3 (3rd place)

### Course-Specific Streak Badges

Visual badges that evolve with streak length, themed by course subject:

#### Economics Course 💰
- Day 1: 💵 Single Bill
- Day 3: 💵💵 Double Bill  
- Day 7: 💰 Money Bag
- Day 14: 💰💰 Double Bag
- Day 21: 💎 Diamond Hands
- Day 30: 👑💎 Wealth King

#### Biology Course 🌱
- Day 1: 🌱 Seedling
- Day 3: 🌿 Sprout
- Day 7: 🪴 Young Plant
- Day 14: 🌳 Tree
- Day 21: 🌳🌳 Grove
- Day 30: 🌲🌲🌲 Forest

#### Computer Science Course 💻
- Day 1: 💻 Hello World
- Day 3: ⌨️ Typing Speed
- Day 7: 🖥️ Full Stack
- Day 14: 🚀 Deploy Master
- Day 21: 🤖 AI Wizard
- Day 30: 👨‍💻👑 Code Royalty

#### Mathematics Course 📏
- Day 1: 📏 Line
- Day 3: 📐 Triangle
- Day 7: ⬜ Square
- Day 14: ⬡ Hexagon
- Day 21: 🔷 Diamond
- Day 30: ✨🔷✨ Sacred Geometry

#### Default (Any Course) 🔥
- Day 1: 🔥 Spark
- Day 3: 🔥🔥 Flame
- Day 7: 🔥🔥🔥 Blaze
- Day 14: 🔥💪 Inferno
- Day 21: ⚡🔥 Lightning Blaze
- Day 30: 👑🔥👑 Eternal Flame

### Implementation
- **Question Badges**: `app/services/badges.py`
- **Streak Badges**: `app/services/streak_badges.py`
- **API**: `app/routes/streaks.py` - `/streaks/badge/{student_id}/{class_id}`

---

## 📊 Engagement Analytics

### Topic-Level Analytics
Students can see performance breakdown by topic:

#### Metrics Tracked
- **Total Questions**: Number of questions answered per topic
- **Correct Answers**: How many were right
- **Accuracy Percentage**: (correct/total) × 100
- **Average Response Time**: Speed of answers
- **Struggle Level**: Categorized performance
  - **Excelling**: 80%+ accuracy
  - **Moderate**: 60-79% accuracy  
  - **Struggling**: 40-59% accuracy
  - **Critical**: <40% accuracy
- **Participation Level**: Based on question count
  - **High**: 10+ questions
  - **Moderate**: 5-9 questions
  - **Low**: 1-4 questions
  - **None**: 0 questions

#### Personalized Recommendations
System identifies topics needing improvement:
- Low participation topics
- Low accuracy topics
- Priority ranking (worst first)
- Actionable suggestions

### Implementation
- **Service**: `app/services/engagement_analytics.py`
- **API Routes**: `app/routes/engagement.py`
- **Endpoints**:
  - `GET /engagement/{student_id}/topics?class_id={class_id}`
  - `GET /engagement/{student_id}/recommendations?class_id={class_id}`

---

## ⚙️ Teacher Custom Settings

Teachers can customize point values and thresholds per class:

### Customizable Settings

#### Ranking Thresholds
- Bronze, Silver, Gold, Platinum, Diamond, Master thresholds
- Default or custom XP values

#### Attendance Points
- Points for attending
- Penalty for missing

#### Question Points
- Points per question
- Perfect score bonus

#### Teacher Bonus
- Maximum bonus points allowed

### Default Values
```python
ATTENDANCE_POINTS = 15
MISSED_CLASS_PENALTY = -10
POINTS_PER_QUESTION = 25
PERFECT_SCORE_BONUS = 10
MAX_TEACHER_BONUS = 50

# Ranks
BRONZE = 0
SILVER = 150
GOLD = 400
PLATINUM = 820
DIAMOND = 1250
MASTER = 1500
```

### Implementation
- **Service**: `app/services/teacher_settings.py`
- **Model**: `TeacherSettings` Pydantic model
- **API Routes**: `app/routes/settings.py`
- **Endpoints**:
  - `GET /settings/{class_id}` - Get current settings
  - `PUT /settings/{class_id}` - Update settings
  - `POST /settings/{class_id}/reset` - Reset to defaults

---

## 🏅 Class Tracker (Leaderboard)

### Features

#### Top 5 Display
- Shows top 5 students in class
- Podium view for top 3
- Full details (rank, points, streak)

#### Current User Position
If user is not in top 5:
- Shows user's current position
- Displays gap from top 5
- Highlights user row

#### Full Leaderboard
- Expandable view of all students
- Sortable by points
- Real-time updates

### Implementation
- **Component**: `src/pages/student/Leaderboard.jsx`
- **Features**:
  - Top 5 section with medals/crowns
  - "Your Position" section for users ranked 6+
  - Collapsible full list
  - Updated rank tiers (6 levels)

---

## 📢 Feedback Notifications

### Notification Types

#### Contribution Notification
- **Trigger**: After class participation
- **Message**: "You contributed today!"
- **Shows**: Points earned

#### Streak Notification  
- **Trigger**: After attendance
- **Message**: "Your streak is at X days"
- **Shows**: Streak count and bonus points

#### Badge Notification
- **Trigger**: When badge is earned
- **Message**: "New badge: {badge_name}!"
- **Shows**: Badge icon and name

### Implementation
- **Component**: `src/components/FeedbackNotifications.jsx`
- **Features**:
  - Auto-dismiss after 5 seconds
  - Manual dismiss
  - Animated entry/exit
  - Color-coded by type
  - Stack multiple notifications

---

## 📝 End of Class Summary

### Display Information

#### Performance Overview
- Correct/Total questions
- Points earned
- Streak bonus
- Class rank

#### Badges Earned
- List of all badges from this lecture
- Visual display with icons

#### Questions to Review
For each missed question:
- Question text
- Your answer (shown in red)
- Correct answer (shown in green)
- Explanation

#### Class Performance
- Average class score
- Your score vs average
- Percentile ranking

### Implementation
- **Component**: `src/components/EndOfClassSummary.jsx`
- **Trigger**: Shown when lecture ends
- **Features**:
  - Modal overlay
  - Scrollable content
  - Color-coded answers
  - Explanations for learning

---

## 🔌 API Endpoints Summary

### Streak Management
```
POST   /streaks/use-saver              - Use monthly streak saver
GET    /streaks/can-use-saver/{id}/{class}  - Check availability
POST   /streaks/teacher-reset          - Teacher resets streak
GET    /streaks/info/{student}/{class} - Get streak info
GET    /streaks/badge/{student}/{class} - Get streak badge
GET    /streaks/badges/{student}       - Get all streak badges
```

### Engagement Analytics
```
GET    /engagement/{student}/topics    - Topic analytics
GET    /engagement/{student}/recommendations - Improvement suggestions
```

### Teacher Settings
```
GET    /settings/{class}               - Get class settings
PUT    /settings/{class}               - Update settings
POST   /settings/{class}/reset         - Reset to defaults
```

### Badges
```
GET    /students/{student}/badges      - Get student badges
```

---

## 🗄️ Database Schema Additions

### New Tables

```sql
-- Streak savers tracking
CREATE TABLE streak_savers (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR NOT NULL,
    class_id VARCHAR NOT NULL,
    used_at TIMESTAMP NOT NULL,
    restored_to INTEGER NOT NULL
);

-- Teacher streak resets
CREATE TABLE streak_resets (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR NOT NULL,
    class_id VARCHAR NOT NULL,
    teacher_id VARCHAR NOT NULL,
    reset_at TIMESTAMP NOT NULL,
    new_streak INTEGER NOT NULL,
    reason VARCHAR
);

-- Teacher custom settings
CREATE TABLE teacher_settings (
    class_id VARCHAR PRIMARY KEY,
    bronze_threshold INTEGER DEFAULT 0,
    silver_threshold INTEGER DEFAULT 150,
    gold_threshold INTEGER DEFAULT 400,
    platinum_threshold INTEGER DEFAULT 820,
    diamond_threshold INTEGER DEFAULT 1250,
    master_threshold INTEGER DEFAULT 1500,
    attendance_points INTEGER DEFAULT 15,
    missed_class_penalty INTEGER DEFAULT -10,
    points_per_question INTEGER DEFAULT 25,
    perfect_score_bonus INTEGER DEFAULT 10,
    max_teacher_bonus INTEGER DEFAULT 50
);
```

---

## 🚀 Usage Examples

### Student Uses Streak Saver
```javascript
const result = await streaksAPI.useStreakSaver(studentId, classId);
// { success: true, message: "Streak restored to 14 days!", restored_streak: 14 }
```

### Teacher Awards Bonus Points
```python
from app.utils.points_calculator import calculate_teacher_bonus

bonus = calculate_teacher_bonus(30, reason="Creative solution!")
# Returns 30 (validated within 0-50 range)
```

### Get Student Topic Analytics
```javascript
const analytics = await engagementAPI.getTopicAnalytics(studentId, classId);
// Returns array of topics with performance metrics
```

### Customize Class Settings
```javascript
await settingsAPI.updateSettings(classId, professorId, {
    attendance_points: 20,
    perfect_score_bonus: 15,
    gold_threshold: 500
});
```

---

## 📱 Frontend Components

### Key Components Created
1. **FeedbackNotifications.jsx** - Toast notifications
2. **EndOfClassSummary.jsx** - Post-lecture review
3. **Leaderboard.jsx** - Updated with 6-tier ranks and tracker
4. **Profile.jsx** - Shows streak badges

### Styling
- Glass morphism cards
- Gradient backgrounds per rank
- Animated transitions
- Color-coded feedback

---

## 🔧 Configuration

All default values can be customized:
- System-wide defaults in `points_calculator.py`
- Per-class overrides in `teacher_settings.py`
- Badge definitions in database
- Streak badge themes in `streak_badges.py`

---

## 📈 Future Enhancements

Potential additions:
- Weekly/monthly leaderboard resets
- Team competitions
- Achievement milestones
- Customizable badge icons (upload images)
- Parent/admin dashboards
- Historical trend analysis
- Predictive analytics for at-risk students

---

## 🐛 Troubleshooting

### Common Issues

**Streak not updating:**
- Check attendance was recorded
- Verify class_id matches
- Ensure not excused absence

**Points calculation wrong:**
- Check teacher custom settings
- Verify question responses recorded
- Review streak bonus calculation

**Badge not awarded:**
- Check badge definitions exist in DB
- Verify trigger conditions met
- Review temporary vs permanent badge logic

---

## 📚 Additional Resources

- API Documentation: `/docs` (FastAPI auto-generated)
- Database Schema: `database_schema.sql`, `database_schema_badges.sql`
- Testing Guide: `TESTING_GUIDE.md`
- Quick Start: `QUICKSTART.md`

---

**Version**: 2.0.0  
**Last Updated**: November 2025  
**Maintainer**: XP Lab Team
