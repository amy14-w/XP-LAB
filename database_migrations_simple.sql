-- Simplified XP Lab v2.0 Migrations - Essential Tables Only

-- Streak Savers
CREATE TABLE IF NOT EXISTS streak_savers (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255),
    class_id VARCHAR(255),
    used_at TIMESTAMP DEFAULT NOW(),
    restored_to INTEGER
);

-- Streak Resets
CREATE TABLE IF NOT EXISTS streak_resets (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255),
    class_id VARCHAR(255),
    teacher_id VARCHAR(255),
    reset_at TIMESTAMP DEFAULT NOW(),
    new_streak INTEGER,
    reason VARCHAR(500)
);

-- Teacher Settings
CREATE TABLE IF NOT EXISTS teacher_settings (
    class_id VARCHAR(255) PRIMARY KEY,
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

-- Teacher Bonus Points
CREATE TABLE IF NOT EXISTS teacher_bonus_points (
    bonus_id SERIAL PRIMARY KEY,
    student_id VARCHAR(255),
    lecture_id VARCHAR(255),
    teacher_id VARCHAR(255),
    points_awarded INTEGER CHECK (points_awarded >= 0 AND points_awarded <= 50),
    reason TEXT,
    awarded_at TIMESTAMP DEFAULT NOW()
);

-- Add topic to questions if not exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

-- Add total_points to student_profiles if not exists
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Done!
SELECT 'Migration completed!' as status;
