-- ClassLens Complete Database Schema
-- This is the single source of truth for the database schema
-- Run this script to create the entire database schema from scratch

-- ============================================
-- Core Tables
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('professor', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES users(user_id),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lectures table
CREATE TABLE IF NOT EXISTS lectures (
    lecture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(class_id),
    lecture_code TEXT UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    presentation_file_url TEXT,
    transcript TEXT, -- Full lecture transcript saved when lecture ends
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class enrollments (student-class relationships)
CREATE TABLE IF NOT EXISTS class_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(student_id, class_id)
);

-- Attendance logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    excused BOOLEAN DEFAULT FALSE
);

-- Participation logs
CREATE TABLE IF NOT EXISTS participation_logs (
    participation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id),
    points_awarded INTEGER DEFAULT 5,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
    ai_suggested BOOLEAN DEFAULT FALSE,
    created_by TEXT NOT NULL, -- professor_id or 'ai'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'revealed')),
    triggered_at TIMESTAMP WITH TIME ZONE,
    revealed_at TIMESTAMP WITH TIME ZONE,
    topic TEXT, -- For engagement analytics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question responses
CREATE TABLE IF NOT EXISTS question_responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(question_id),
    student_id UUID NOT NULL REFERENCES users(user_id),
    selected_answer TEXT NOT NULL CHECK (selected_answer IN ('a', 'b', 'c', 'd')),
    is_correct BOOLEAN NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, student_id) -- One answer per student per question
);

-- Student profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(user_id),
    total_points INTEGER DEFAULT 0,
    rank TEXT NOT NULL DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master')),
    total_correct_answers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student streaks (per course)
CREATE TABLE IF NOT EXISTS student_streaks (
    streak_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id),
    class_id UUID NOT NULL REFERENCES classes(class_id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    UNIQUE(student_id, class_id)
);

-- AI feedback logs
CREATE TABLE IF NOT EXISTS ai_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id),
    feedback_type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Gamification Tables
-- ============================================

-- Streak savers (tracks when students use monthly streak restore)
CREATE TABLE IF NOT EXISTS streak_savers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    restored_to INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streak resets (tracks when teachers reset student streaks)
CREATE TABLE IF NOT EXISTS streak_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    new_streak INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher settings (custom point values and thresholds per class)
CREATE TABLE IF NOT EXISTS teacher_settings (
    class_id UUID PRIMARY KEY REFERENCES classes(class_id) ON DELETE CASCADE,
    -- Ranking thresholds
    bronze_threshold INTEGER DEFAULT 0,
    silver_threshold INTEGER DEFAULT 150,
    gold_threshold INTEGER DEFAULT 400,
    platinum_threshold INTEGER DEFAULT 820,
    diamond_threshold INTEGER DEFAULT 1250,
    master_threshold INTEGER DEFAULT 1500,
    -- Attendance points
    attendance_points INTEGER DEFAULT 15,
    missed_class_penalty INTEGER DEFAULT -10,
    -- Question points
    points_per_question INTEGER DEFAULT 25,
    perfect_score_bonus INTEGER DEFAULT 10,
    -- Teacher bonus
    max_teacher_bonus INTEGER DEFAULT 50,
    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher bonus points (tracks bonus points awarded by teachers)
CREATE TABLE IF NOT EXISTS teacher_bonus_points (
    bonus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0 AND points_awarded <= 50),
    reason TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Badge System Tables
-- ============================================

-- Badge definitions table
CREATE TABLE IF NOT EXISTS badge_definitions (
    badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_name TEXT NOT NULL UNIQUE,
    badge_type TEXT NOT NULL CHECK (badge_type IN ('quiz', 'attendance_streak')),
    description TEXT,
    icon_name TEXT,
    criteria_config JSONB, -- Stores criteria like "streak_count": 3, "course_specific": true
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student badges (earned badges)
CREATE TABLE IF NOT EXISTS student_badges (
    student_badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(user_id),
    badge_id UUID NOT NULL REFERENCES badge_definitions(badge_id),
    lecture_id UUID REFERENCES lectures(lecture_id), -- For quiz badges (temporary)
    class_id UUID REFERENCES classes(class_id), -- For streak badges (course-specific)
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_temporary BOOLEAN DEFAULT FALSE, -- TRUE for quiz badges (not saved beyond quiz)
    UNIQUE(student_id, badge_id, lecture_id) -- Prevent duplicate quiz badges per lecture
);

-- Quiz session tracking (for quiz badges)
CREATE TABLE IF NOT EXISTS quiz_sessions (
    quiz_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id),
    student_id UUID NOT NULL REFERENCES users(user_id),
    question_id UUID NOT NULL REFERENCES questions(question_id),
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER, -- Time taken to answer (for fastest answerer)
    question_order INTEGER -- Order in which question was answered in this quiz session
);

-- ============================================
-- Analytics Tables
-- ============================================

-- Engagement checkpoints persisted per lecture
CREATE TABLE IF NOT EXISTS lecture_engagement_points (
    point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    sentiment_score DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    delivery_clarity DOUBLE PRECISION,
    delivery_pace DOUBLE PRECISION,
    delivery_pitch DOUBLE PRECISION,
    engagement DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stored lecture analytics reports (snapshot at end of lecture)
CREATE TABLE IF NOT EXISTS lecture_reports (
    lecture_id UUID PRIMARY KEY REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES users(user_id),
    topic TEXT,
    date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    headline_engagement INTEGER,
    talk_time_professor INTEGER,
    talk_time_students INTEGER,
    participation_rate DOUBLE PRECISION,
    timeline JSONB, -- array of {time, engagement}
    summary JSONB,  -- additional stats snapshot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_lectures_class_id ON lectures(class_id);
CREATE INDEX IF NOT EXISTS idx_lectures_code ON lectures(lecture_code);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance_logs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_questions_lecture ON questions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_responses_question ON question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_student ON question_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_participation_student ON participation_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_participation_lecture ON participation_logs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_streaks_student_class ON student_streaks(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(class_id);

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_streak_savers_student_class ON streak_savers(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_streak_savers_used_at ON streak_savers(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_streak_resets_student_class ON streak_resets(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_streak_resets_reset_at ON streak_resets(reset_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_student_lecture ON teacher_bonus_points(student_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_bonus_awarded_at ON teacher_bonus_points(awarded_at DESC);

-- Badge indexes
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_lecture ON student_badges(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_class ON student_badges(class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_student_lecture ON quiz_sessions(student_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_question ON quiz_sessions(question_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_engagement_points_lecture ON lecture_engagement_points(lecture_id, ts);
CREATE INDEX IF NOT EXISTS idx_lecture_reports_professor ON lecture_reports(professor_id, date);

-- ============================================
-- Functions
-- ============================================

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old streak saver records (optional)
CREATE OR REPLACE FUNCTION cleanup_old_streak_savers()
RETURNS void AS $$
BEGIN
    DELETE FROM streak_savers 
    WHERE used_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- Trigger to update updated_at on teacher_settings
DROP TRIGGER IF EXISTS update_teacher_settings_updated_at ON teacher_settings;
CREATE TRIGGER update_teacher_settings_updated_at
    BEFORE UPDATE ON teacher_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views
-- ============================================

-- Student Points Summary View
CREATE OR REPLACE VIEW student_points_summary AS
SELECT 
    sp.student_id,
    sp.total_points,
    sp.rank,
    sp.total_correct_answers,
    ss.current_streak,
    ss.longest_streak,
    ss.class_id
FROM student_profiles sp
LEFT JOIN student_streaks ss ON sp.student_id = ss.student_id;

-- Leaderboard View with Rankings
CREATE OR REPLACE VIEW class_leaderboard AS
SELECT 
    sp.student_id,
    sp.total_points,
    sp.rank,
    ss.current_streak,
    ss.class_id,
    u.email,
    ROW_NUMBER() OVER (PARTITION BY ss.class_id ORDER BY sp.total_points DESC) as position
FROM student_profiles sp
LEFT JOIN student_streaks ss ON sp.student_id = ss.student_id
LEFT JOIN users u ON sp.student_id = u.user_id
WHERE ss.class_id IS NOT NULL
ORDER BY sp.total_points DESC;

-- ============================================
-- Default Badge Definitions
-- ============================================

-- Insert default badge definitions
INSERT INTO badge_definitions (badge_name, badge_type, description, icon_name, criteria_config) VALUES
-- Quiz badges
('hot_streak', 'quiz', 'Got 3 correct answers in a row', 'fire', '{"streak_count": 3, "type": "correct_streak"}'),
('fastest_answerer', 'quiz', 'Answered first in a question', 'lightning', '{"type": "first_answer"}'),
('cold_badge', 'quiz', 'Got 3 wrong answers in a row', 'snowflake', '{"streak_count": 3, "type": "wrong_streak"}'),
('perfect_score', 'quiz', 'Got 100% correct in a quiz session', 'star', '{"type": "perfect_score"}'),
('top_1', 'quiz', '1st place in lecture', '🥇', '{"type": "top_position", "position": 1}'),
('top_2', 'quiz', '2nd place in lecture', '🥈', '{"type": "top_position", "position": 2}'),
('top_3', 'quiz', '3rd place in lecture', '🥉', '{"type": "top_position", "position": 3}'),
-- Attendance streak badges
('attendance_streak_3', 'attendance_streak', '3 day attendance streak', 'streak_3', '{"streak_count": 3, "course_specific": true}'),
('attendance_streak_7', 'attendance_streak', '7 day attendance streak', 'streak_7', '{"streak_count": 7, "course_specific": true}'),
('attendance_streak_14', 'attendance_streak', '14 day attendance streak', 'streak_14', '{"streak_count": 14, "course_specific": true}'),
('attendance_streak_30', 'attendance_streak', '30 day attendance streak', 'streak_30', '{"streak_count": 30, "course_specific": true}')
ON CONFLICT (badge_name) DO NOTHING;

-- ============================================
-- Schema Creation Complete
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'ClassLens database schema created successfully!';
    RAISE NOTICE 'All tables, indexes, views, functions, and triggers have been created.';
END $$;

