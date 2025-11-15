-- Seed Data for Emily Doe and Classmates
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create a Professor
-- ============================================
INSERT INTO users (user_id, email, password, role, created_at)
VALUES 
    ('prof-001', 'professor.smith@university.edu', 'hashed_password', 'professor', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 2. Create a Class (Computer Science)
-- ============================================
INSERT INTO classes (class_id, professor_id, name, created_at)
VALUES 
    ('class-cs101', 'prof-001', 'Computer Science 101', NOW())
ON CONFLICT (class_id) DO NOTHING;

-- ============================================
-- 3. Create Emily Doe (if not exists)
-- ============================================
INSERT INTO users (user_id, email, password, role, created_at)
VALUES 
    ('emily-doe-001', 'emilydoe12@gmail.com', 'hashed_password', 'student', NOW())
ON CONFLICT (email) DO UPDATE SET user_id = 'emily-doe-001';

-- ============================================
-- 4. Create Classmates
-- ============================================
INSERT INTO users (user_id, email, password, role, created_at)
VALUES 
    ('student-002', 'sarah.chen@university.edu', 'hashed_password', 'student', NOW()),
    ('student-003', 'mike.thompson@university.edu', 'hashed_password', 'student', NOW()),
    ('student-004', 'alex.rodriguez@university.edu', 'hashed_password', 'student', NOW()),
    ('student-005', 'david.park@university.edu', 'hashed_password', 'student', NOW()),
    ('student-006', 'lisa.wang@university.edu', 'hashed_password', 'student', NOW()),
    ('student-007', 'james.miller@university.edu', 'hashed_password', 'student', NOW()),
    ('student-008', 'anna.kim@university.edu', 'hashed_password', 'student', NOW()),
    ('student-009', 'tom.bradley@university.edu', 'hashed_password', 'student', NOW()),
    ('student-010', 'nina.patel@university.edu', 'hashed_password', 'student', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 5. Enroll Students in Class
-- ============================================
INSERT INTO class_enrollments (student_id, class_id, enrolled_at, is_active)
VALUES 
    ('emily-doe-001', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-002', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-003', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-004', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-005', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-006', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-007', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-008', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-009', 'class-cs101', NOW() - INTERVAL '30 days', true),
    ('student-010', 'class-cs101', NOW() - INTERVAL '30 days', true)
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ============================================
-- 6. Create Student Profiles with Points
-- ============================================
INSERT INTO student_profiles (student_id, total_points, rank, total_correct_answers)
VALUES 
    ('emily-doe-001', 425, 'gold', 34),        -- Emily in Gold tier
    ('student-002', 1550, 'master', 120),      -- Sarah - Master
    ('student-003', 1280, 'diamond', 98),      -- Mike - Diamond  
    ('student-004', 900, 'platinum', 72),      -- Alex - Platinum
    ('student-005', 850, 'platinum', 68),      -- David - Platinum
    ('student-006', 600, 'gold', 48),          -- Lisa - Gold
    ('student-007', 380, 'silver', 30),        -- James - Silver
    ('student-008', 280, 'silver', 22),        -- Anna - Silver
    ('student-009', 140, 'bronze', 11),        -- Tom - Bronze
    ('student-010', 95, 'bronze', 8)           -- Nina - Bronze
ON CONFLICT (student_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    rank = EXCLUDED.rank,
    total_correct_answers = EXCLUDED.total_correct_answers;

-- ============================================
-- 7. Create Streaks for Students
-- ============================================
INSERT INTO student_streaks (student_id, class_id, current_streak, longest_streak)
VALUES 
    ('emily-doe-001', 'class-cs101', 12, 15),  -- Emily has 12-day streak
    ('student-002', 'class-cs101', 21, 25),    -- Sarah
    ('student-003', 'class-cs101', 18, 20),    -- Mike
    ('student-004', 'class-cs101', 14, 16),    -- Alex
    ('student-005', 'class-cs101', 10, 14),    -- David
    ('student-006', 'class-cs101', 8, 12),     -- Lisa
    ('student-007', 'class-cs101', 5, 9),      -- James
    ('student-008', 'class-cs101', 3, 7),      -- Anna
    ('student-009', 'class-cs101', 2, 5),      -- Tom
    ('student-010', 'class-cs101', 1, 3)       -- Nina
ON CONFLICT (student_id, class_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak;

-- ============================================
-- 8. Create Some Lectures
-- ============================================
INSERT INTO lectures (lecture_id, class_id, lecture_code, status, started_at, created_at)
VALUES 
    ('lecture-001', 'class-cs101', 'CS101A', 'completed', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ('lecture-002', 'class-cs101', 'CS101B', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('lecture-003', 'class-cs101', 'CS101C', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('lecture-004', 'class-cs101', 'CS101D', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (lecture_id) DO NOTHING;

-- ============================================
-- 9. Create Attendance Records for Emily
-- ============================================
INSERT INTO attendance (student_id, lecture_id, checked_in_at, status)
VALUES 
    ('emily-doe-001', 'lecture-001', NOW() - INTERVAL '7 days', 'present'),
    ('emily-doe-001', 'lecture-002', NOW() - INTERVAL '5 days', 'present'),
    ('emily-doe-001', 'lecture-003', NOW() - INTERVAL '3 days', 'present'),
    ('emily-doe-001', 'lecture-004', NOW() - INTERVAL '1 day', 'present')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. Create Some Questions and Responses for Emily
-- ============================================
INSERT INTO questions (question_id, lecture_id, question_text, correct_answer, mode, topic, created_at)
VALUES 
    ('q-001', 'lecture-004', 'What is the time complexity of binary search?', 'O(log n)', 'multiple_choice', 'Algorithms', NOW() - INTERVAL '1 day'),
    ('q-002', 'lecture-004', 'Which data structure uses LIFO?', 'Stack', 'multiple_choice', 'Data Structures', NOW() - INTERVAL '1 day'),
    ('q-003', 'lecture-004', 'What does CPU stand for?', 'Central Processing Unit', 'multiple_choice', 'Computer Basics', NOW() - INTERVAL '1 day'),
    ('q-004', 'lecture-004', 'What is recursion?', 'A function calling itself', 'multiple_choice', 'Programming Concepts', NOW() - INTERVAL '1 day')
ON CONFLICT (question_id) DO NOTHING;

-- Quiz sessions for Emily
INSERT INTO quiz_sessions (quiz_session_id, lecture_id, student_id, question_id, is_correct, response_time_ms, answered_at)
VALUES 
    (gen_random_uuid()::text, 'lecture-004', 'emily-doe-001', 'q-001', true, 3500, NOW() - INTERVAL '1 day'),
    (gen_random_uuid()::text, 'lecture-004', 'emily-doe-001', 'q-002', true, 2800, NOW() - INTERVAL '1 day'),
    (gen_random_uuid()::text, 'lecture-004', 'emily-doe-001', 'q-003', true, 2200, NOW() - INTERVAL '1 day'),
    (gen_random_uuid()::text, 'lecture-004', 'emily-doe-001', 'q-004', false, 4500, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. Award Emily Some Badges
-- ============================================
-- First, ensure badge definitions exist
INSERT INTO badge_definitions (badge_id, badge_name, description, icon_name, badge_type, created_at)
VALUES 
    ('hot_streak', 'Hot Streak', '3 correct answers in a row', '🔥', 'quiz', NOW()),
    ('fastest_answerer', 'Fastest Answerer', 'First to answer correctly', '⚡', 'quiz', NOW()),
    ('attendance_streak_7', '7-Day Streak', 'Attended 7 classes in a row', '📅', 'attendance', NOW()),
    ('attendance_streak_14', '14-Day Streak', 'Attended 14 classes in a row', '🔥📅', 'attendance', NOW())
ON CONFLICT (badge_id) DO NOTHING;

-- Award badges to Emily
INSERT INTO student_badges (student_badge_id, student_id, badge_id, lecture_id, class_id, is_temporary, earned_at)
VALUES 
    (gen_random_uuid()::text, 'emily-doe-001', 'hot_streak', 'lecture-004', NULL, true, NOW() - INTERVAL '1 day'),
    (gen_random_uuid()::text, 'emily-doe-001', 'attendance_streak_7', NULL, 'class-cs101', false, NOW() - INTERVAL '5 days'),
    (gen_random_uuid()::text, 'emily-doe-001', 'attendance_streak_14', NULL, 'class-cs101', false, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. Create Participation Records
-- ============================================
INSERT INTO participation (participation_id, student_id, lecture_id, points_awarded, awarded_at)
VALUES 
    (gen_random_uuid()::text, 'emily-doe-001', 'lecture-001', 40, NOW() - INTERVAL '7 days'),
    (gen_random_uuid()::text, 'emily-doe-001', 'lecture-002', 35, NOW() - INTERVAL '5 days'),
    (gen_random_uuid()::text, 'emily-doe-001', 'lecture-003', 45, NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::text, 'emily-doe-001', 'lecture-004', 38, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================
-- Summary Query - Verify Data
-- ============================================
SELECT 
    '✅ Data Created Successfully!' as status,
    (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM class_enrollments WHERE class_id = 'class-cs101') as students_in_class,
    (SELECT total_points FROM student_profiles WHERE student_id = 'emily-doe-001') as emily_points,
    (SELECT rank FROM student_profiles WHERE student_id = 'emily-doe-001') as emily_rank,
    (SELECT current_streak FROM student_streaks WHERE student_id = 'emily-doe-001' AND class_id = 'class-cs101') as emily_streak,
    (SELECT COUNT(*) FROM student_badges WHERE student_id = 'emily-doe-001') as emily_badges;

-- Show Emily's position in leaderboard
SELECT 
    ROW_NUMBER() OVER (ORDER BY sp.total_points DESC) as position,
    u.email,
    sp.total_points,
    sp.rank,
    ss.current_streak
FROM student_profiles sp
JOIN users u ON sp.student_id = u.user_id
LEFT JOIN student_streaks ss ON sp.student_id = ss.student_id AND ss.class_id = 'class-cs101'
WHERE u.role = 'student'
ORDER BY sp.total_points DESC
LIMIT 10;
