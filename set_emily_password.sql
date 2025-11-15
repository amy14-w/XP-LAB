-- Quick script to set Emily's password
-- Run this in Supabase SQL Editor AFTER running seed_emily_data.sql

-- Update Emily's password to a known value
-- Note: In production, passwords should be hashed. This is for development only.

UPDATE users 
SET password = 'password123'  -- Simple password for testing
WHERE email = 'emilydoe12@gmail.com';

-- Verify update
SELECT 
    user_id,
    email,
    role,
    'Password set to: password123' as note
FROM users 
WHERE email = 'emilydoe12@gmail.com';

-- Quick login test info
SELECT 
    '✅ Emily Login Info' as status,
    'Email: emilydoe12@gmail.com' as email,
    'Password: password123' as password;
