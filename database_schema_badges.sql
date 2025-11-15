-- Badges Schema Additions for ClassLens

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_lecture ON student_badges(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_class ON student_badges(class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_student_lecture ON quiz_sessions(student_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_question ON quiz_sessions(question_id);

-- Insert default badge definitions
INSERT INTO badge_definitions (badge_name, badge_type, description, icon_name, criteria_config) VALUES
-- Quiz badges
('hot_streak', 'quiz', 'Got 3 correct answers in a row', 'fire', '{"streak_count": 3, "type": "correct_streak"}'),
('fastest_answerer', 'quiz', 'Answered first in a question', 'lightning', '{"type": "first_answer"}'),
('cold_badge', 'quiz', 'Got 3 wrong answers in a row', 'snowflake', '{"streak_count": 3, "type": "wrong_streak"}'),
('perfect_score', 'quiz', 'Got 100% correct in a quiz session', 'star', '{"type": "perfect_score"}'),
-- Attendance streak badges (will be created dynamically per course)
('attendance_streak_3', 'attendance_streak', '3 day attendance streak', 'streak_3', '{"streak_count": 3, "course_specific": true}'),
('attendance_streak_7', 'attendance_streak', '7 day attendance streak', 'streak_7', '{"streak_count": 7, "course_specific": true}'),
('attendance_streak_14', 'attendance_streak', '14 day attendance streak', 'streak_14', '{"streak_count": 14, "course_specific": true}'),
('attendance_streak_30', 'attendance_streak', '30 day attendance streak', 'streak_30', '{"streak_count": 30, "course_specific": true}');

