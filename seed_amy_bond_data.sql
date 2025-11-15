-- Seed data for Amy Bond and classmates in CSC2720
-- This script creates realistic student data with points, streaks, and badges

-- First, ensure Amy Birkneh (professor) exists
-- Assuming email: amy.birkneh@university.edu, password should be set separately

-- Insert Amy Birkneh as professor if not exists
INSERT INTO users (email, password_hash, role, created_at)
VALUES ('amy.birkneh@university.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'professor', NOW())
ON CONFLICT (email) DO NOTHING;

-- Get Amy Birkneh's user_id
DO $$
DECLARE
    prof_user_id INTEGER;
    class_id INTEGER;
    lecture_id INTEGER;
    student_amy_id INTEGER;
    student_sarah_id INTEGER;
    student_mike_id INTEGER;
    student_emily_id INTEGER;
    student_david_id INTEGER;
    student_lisa_id INTEGER;
    student_james_id INTEGER;
    student_anna_id INTEGER;
BEGIN
    -- Get professor user_id
    SELECT user_id INTO prof_user_id FROM users WHERE email = 'amy.birkneh@university.edu';

    -- Create CSC2720 class if not exists
    INSERT INTO classes (name, professor_id, created_at)
    VALUES ('CSC2720', prof_user_id, NOW())
    ON CONFLICT DO NOTHING
    RETURNING class_id INTO class_id;
    
    -- If class already exists, get its ID
    IF class_id IS NULL THEN
        SELECT c.class_id INTO class_id FROM classes c WHERE c.name = 'CSC2720' AND c.professor_id = prof_user_id;
    END IF;

    -- Insert student users (password: 'password123' - hashed)
    -- Amy Bond
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('amy.bond@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_amy_id;
    IF student_amy_id IS NULL THEN
        SELECT user_id INTO student_amy_id FROM users WHERE email = 'amy.bond@student.edu';
    END IF;

    -- Sarah Chen
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('sarah.chen@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_sarah_id;
    IF student_sarah_id IS NULL THEN
        SELECT user_id INTO student_sarah_id FROM users WHERE email = 'sarah.chen@student.edu';
    END IF;

    -- Mike Thompson
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('mike.thompson@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_mike_id;
    IF student_mike_id IS NULL THEN
        SELECT user_id INTO student_mike_id FROM users WHERE email = 'mike.thompson@student.edu';
    END IF;

    -- Emily Rodriguez
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('emily.rodriguez@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_emily_id;
    IF student_emily_id IS NULL THEN
        SELECT user_id INTO student_emily_id FROM users WHERE email = 'emily.rodriguez@student.edu';
    END IF;

    -- David Park
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('david.park@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_david_id;
    IF student_david_id IS NULL THEN
        SELECT user_id INTO student_david_id FROM users WHERE email = 'david.park@student.edu';
    END IF;

    -- Lisa Wang
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('lisa.wang@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_lisa_id;
    IF student_lisa_id IS NULL THEN
        SELECT user_id INTO student_lisa_id FROM users WHERE email = 'lisa.wang@student.edu';
    END IF;

    -- James Miller
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('james.miller@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_james_id;
    IF student_james_id IS NULL THEN
        SELECT user_id INTO student_james_id FROM users WHERE email = 'james.miller@student.edu';
    END IF;

    -- Anna Kim
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES ('anna.kim@student.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvZ7OqJqZHJm', 'student', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO student_anna_id;
    IF student_anna_id IS NULL THEN
        SELECT user_id INTO student_anna_id FROM users WHERE email = 'anna.kim@student.edu';
    END IF;

    -- Create students table entries
    INSERT INTO students (user_id, total_points, current_streak, longest_streak, rank)
    VALUES 
        (student_amy_id, 1850, 12, 15, 'gold'),
        (student_sarah_id, 2850, 21, 25, 'platinum'),
        (student_mike_id, 2720, 18, 20, 'platinum'),
        (student_emily_id, 2590, 15, 18, 'gold'),
        (student_david_id, 2340, 12, 16, 'gold'),
        (student_lisa_id, 2180, 14, 17, 'gold'),
        (student_james_id, 1950, 10, 12, 'silver'),
        (student_anna_id, 1820, 9, 11, 'silver')
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        rank = EXCLUDED.rank;

    -- Enroll all students in CSC2720
    INSERT INTO course_enrollments (student_id, class_id, enrolled_at)
    VALUES 
        (student_amy_id, class_id, NOW() - INTERVAL '30 days'),
        (student_sarah_id, class_id, NOW() - INTERVAL '30 days'),
        (student_mike_id, class_id, NOW() - INTERVAL '30 days'),
        (student_emily_id, class_id, NOW() - INTERVAL '30 days'),
        (student_david_id, class_id, NOW() - INTERVAL '30 days'),
        (student_lisa_id, class_id, NOW() - INTERVAL '30 days'),
        (student_james_id, class_id, NOW() - INTERVAL '30 days'),
        (student_anna_id, class_id, NOW() - INTERVAL '30 days')
    ON CONFLICT (student_id, class_id) DO NOTHING;

    -- Create a Big O Notation lecture
    INSERT INTO lectures (class_id, lecture_code, status, started_at, created_at)
    VALUES (class_id, 'BIG-O-2024', 'not_started', NULL, NOW())
    RETURNING lecture_id INTO lecture_id;

    -- Create attendance records for past lectures (for streak calculation)
    -- Simulate 12 days of attendance for Amy Bond
    FOR i IN 1..12 LOOP
        INSERT INTO attendance (student_id, lecture_id, checked_in_at, status)
        SELECT student_amy_id, l.lecture_id, NOW() - INTERVAL '1 day' * i, 'present'
        FROM lectures l
        WHERE l.class_id = class_id AND l.lecture_id != lecture_id
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Add badges for students
    -- Hot Streak badge for Amy Bond (12 day streak)
    INSERT INTO student_badges (student_id, badge_type, badge_name, earned_at, lecture_id, class_id)
    VALUES 
        (student_amy_id, 'streak', 'Hot Streak 🔥', NOW() - INTERVAL '2 days', NULL, class_id),
        (student_amy_id, 'achievement', 'Fast Responder ⚡', NOW() - INTERVAL '5 days', NULL, class_id),
        (student_amy_id, 'achievement', 'Perfect Score 💯', NOW() - INTERVAL '7 days', NULL, class_id);

    -- Badges for other top students
    INSERT INTO student_badges (student_id, badge_type, badge_name, earned_at, lecture_id, class_id)
    VALUES 
        (student_sarah_id, 'streak', 'Hot Streak 🔥', NOW() - INTERVAL '1 day', NULL, class_id),
        (student_sarah_id, 'streak', 'Streak Master 🌟', NOW() - INTERVAL '3 days', NULL, class_id),
        (student_sarah_id, 'achievement', 'Perfect Score 💯', NOW() - INTERVAL '4 days', NULL, class_id),
        (student_sarah_id, 'achievement', 'Top Performer 👑', NOW() - INTERVAL '6 days', NULL, class_id),
        
        (student_mike_id, 'streak', 'Hot Streak 🔥', NOW() - INTERVAL '2 days', NULL, class_id),
        (student_mike_id, 'achievement', 'Fast Responder ⚡', NOW() - INTERVAL '5 days', NULL, class_id),
        (student_mike_id, 'achievement', 'Perfect Score 💯', NOW() - INTERVAL '8 days', NULL, class_id),
        
        (student_emily_id, 'streak', 'Hot Streak 🔥', NOW() - INTERVAL '3 days', NULL, class_id),
        (student_emily_id, 'achievement', 'Perfect Score 💯', NOW() - INTERVAL '6 days', NULL, class_id);

    -- Create some quiz questions for the Big O lecture
    INSERT INTO questions (lecture_id, question_text, mode, options, correct_answer, points, created_at)
    VALUES 
        (lecture_id, 'What is the time complexity of binary search?', 'quiz', 
         '{"A": "O(n)", "B": "O(log n)", "C": "O(n²)", "D": "O(1)"}', 'B', 100, NOW()),
        
        (lecture_id, 'Which notation describes the worst-case scenario?', 'quiz',
         '{"A": "Big Omega (Ω)", "B": "Big Theta (Θ)", "C": "Big O (O)", "D": "Small o (o)"}', 'C', 100, NOW()),
        
        (lecture_id, 'What is the space complexity of merge sort?', 'quiz',
         '{"A": "O(1)", "B": "O(log n)", "C": "O(n)", "D": "O(n log n)"}', 'C', 100, NOW());

    -- Add some participation records for Amy Bond
    INSERT INTO participation (student_id, lecture_id, participation_type, points_awarded, timestamp)
    SELECT student_amy_id, l.lecture_id, 'question_asked', 50, NOW() - INTERVAL '1 day' * i
    FROM lectures l, generate_series(1, 5) AS i
    WHERE l.class_id = class_id AND l.lecture_id != lecture_id
    LIMIT 5
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Successfully created Amy Bond and classmates in CSC2720!';
    RAISE NOTICE 'Class ID: %', class_id;
    RAISE NOTICE 'Big O Notation Lecture ID: %', lecture_id;
    RAISE NOTICE 'Amy Bond User ID: %', student_amy_id;
    RAISE NOTICE 'Login credentials: amy.bond@student.edu / password123';
END $$;

-- Display summary
SELECT 
    u.email,
    s.total_points,
    s.current_streak,
    s.rank,
    COUNT(sb.badge_id) as badge_count
FROM users u
JOIN students s ON u.user_id = s.user_id
LEFT JOIN student_badges sb ON s.user_id = sb.student_id
WHERE u.email LIKE '%@student.edu'
GROUP BY u.email, s.total_points, s.current_streak, s.rank
ORDER BY s.total_points DESC;
