-- Diagnostic queries to check transcript column and permissions

-- 1. Check if transcript column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lectures' 
AND column_name = 'transcript';

-- 2. Check RLS policies on lectures table
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'lectures';

-- 3. Test update (replace with your actual lecture_id)
-- SELECT lecture_id FROM lectures LIMIT 1;  -- Get a lecture_id first
-- UPDATE lectures SET transcript = 'Test transcript' WHERE lecture_id = 'YOUR_LECTURE_ID_HERE';

-- 4. Check if service role has permissions
-- This query shows all policies - look for any that might block service_role
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies 
WHERE tablename = 'lectures'
ORDER BY policyname;

