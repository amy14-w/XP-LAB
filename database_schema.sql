-- ClassLens Database Schema for Supabase PostgreSQL

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
    rank TEXT NOT NULL DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum')),
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lectures_class_id ON lectures(class_id);
CREATE INDEX IF NOT EXISTS idx_lectures_code ON lectures(lecture_code);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance_logs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_questions_lecture ON questions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_student ON question_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_participation_student ON participation_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_participation_lecture ON participation_logs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_streaks_student_class ON student_streaks(student_id, class_id);

