-- XP Lab v2.0 Database Migrations
-- New tables for advanced points and gamification system

-- ============================================
-- Streak Savers Table
-- Tracks when students use their monthly streak restore
-- ============================================
CREATE TABLE IF NOT EXISTS streak_savers (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    restored_to INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_streak_saver_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_streak_saver_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
);

CREATE INDEX idx_streak_savers_student_class ON streak_savers(student_id, class_id);
CREATE INDEX idx_streak_savers_used_at ON streak_savers(used_at DESC);

-- ============================================
-- Streak Resets Table
-- Tracks when teachers reset student streaks
-- ============================================
CREATE TABLE IF NOT EXISTS streak_resets (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
    new_streak INTEGER NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_streak_reset_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_streak_reset_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    CONSTRAINT fk_streak_reset_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_streak_resets_student_class ON streak_resets(student_id, class_id);
CREATE INDEX idx_streak_resets_reset_at ON streak_resets(reset_at DESC);

-- ============================================
-- Teacher Settings Table
-- Custom point values and thresholds per class
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_settings (
    class_id VARCHAR(255) PRIMARY KEY,
    
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
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_teacher_settings_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
);

-- ============================================
-- Update student_profiles table
-- Add total_points column if it doesn't exist
-- ============================================
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Update rank column to support new tiers
-- Note: If using enum, you may need to alter the type
-- For VARCHAR/TEXT columns, this is not needed

-- ============================================
-- Add topic column to questions table
-- For engagement analytics
-- ============================================
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);

-- ============================================
-- Class Enrollments Table (if not exists)
-- Needed for tracking student-class relationships
-- ============================================
CREATE TABLE IF NOT EXISTS class_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    CONSTRAINT unique_student_class UNIQUE(student_id, class_id)
);

CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);

-- ============================================
-- Teacher Bonus Points Table
-- Track bonus points awarded by teachers
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_bonus_points (
    bonus_id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    lecture_id VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0 AND points_awarded <= 50),
    reason TEXT,
    awarded_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_bonus_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bonus_lecture FOREIGN KEY (lecture_id) REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    CONSTRAINT fk_bonus_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_bonus_student_lecture ON teacher_bonus_points(student_id, lecture_id);
CREATE INDEX idx_bonus_awarded_at ON teacher_bonus_points(awarded_at DESC);

-- ============================================
-- Update badge_definitions with new badges
-- ============================================
INSERT INTO badge_definitions (badge_id, badge_name, description, icon_name, badge_type, created_at)
VALUES
    -- Question badges (if not exists)
    ('hot_streak', 'Hot Streak', '3 correct answers in a row', '🔥', 'quiz', NOW()),
    ('fastest_answerer', 'Fastest Answerer', 'First to answer correctly', '⚡', 'quiz', NOW()),
    ('cold_badge', 'Cold Badge', '3 wrong answers in a row', '❄️', 'quiz', NOW()),
    ('perfect_score', 'Perfect Score', '100% correct in lecture', '💯', 'quiz', NOW()),
    ('top_1', 'Top 1', '1st place in lecture', '🥇', 'quiz', NOW()),
    ('top_2', 'Top 2', '2nd place in lecture', '🥈', 'quiz', NOW()),
    ('top_3', 'Top 3', '3rd place in lecture', '🥉', 'quiz', NOW())
ON CONFLICT (badge_id) DO NOTHING;

-- ============================================
-- Functions for automatic timestamp updates
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to teacher_settings
DROP TRIGGER IF EXISTS update_teacher_settings_updated_at ON teacher_settings;
CREATE TRIGGER update_teacher_settings_updated_at
    BEFORE UPDATE ON teacher_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views for easier querying
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
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert default teacher settings for existing classes
-- INSERT INTO teacher_settings (class_id)
-- SELECT class_id FROM classes
-- ON CONFLICT (class_id) DO NOTHING;

-- ============================================
-- Permissions (if using Row Level Security)
-- ============================================

-- Enable RLS on new tables (if using Supabase)
-- ALTER TABLE streak_savers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE streak_resets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teacher_bonus_points ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your auth setup)
-- CREATE POLICY "Students can view their own streak savers"
--     ON streak_savers FOR SELECT
--     USING (auth.uid()::text = student_id);

-- CREATE POLICY "Teachers can manage settings for their classes"
--     ON teacher_settings FOR ALL
--     USING (
--         EXISTS (
--             SELECT 1 FROM classes 
--             WHERE classes.class_id = teacher_settings.class_id 
--             AND classes.professor_id = auth.uid()::text
--         )
--     );

-- ============================================
-- Cleanup and Maintenance
-- ============================================

-- Function to clean up old streak saver records (optional)
CREATE OR REPLACE FUNCTION cleanup_old_streak_savers()
RETURNS void AS $$
BEGIN
    DELETE FROM streak_savers 
    WHERE used_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables created
SELECT 
    'streak_savers' as table_name, 
    COUNT(*) as record_count 
FROM streak_savers
UNION ALL
SELECT 'streak_resets', COUNT(*) FROM streak_resets
UNION ALL
SELECT 'teacher_settings', COUNT(*) FROM teacher_settings
UNION ALL
SELECT 'teacher_bonus_points', COUNT(*) FROM teacher_bonus_points;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'XP Lab v2.0 database migration completed successfully!';
    RAISE NOTICE 'New tables created: streak_savers, streak_resets, teacher_settings, teacher_bonus_points';
    RAISE NOTICE 'Views created: student_points_summary, class_leaderboard';
END $$;
