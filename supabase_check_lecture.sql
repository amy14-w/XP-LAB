-- Check if lecture exists and its status

-- Replace with your actual lecture_id
SELECT 
    lecture_id,
    class_id,
    lecture_code,
    status,
    start_time,
    end_time,
    transcript IS NOT NULL as has_transcript,
    LENGTH(transcript) as transcript_length
FROM lectures 
WHERE lecture_id = '4118fae1-6c6f-4afa-a18b-16afb309cd80';

-- Check all recent lectures
SELECT 
    lecture_id,
    status,
    start_time,
    created_at
FROM lectures 
ORDER BY created_at DESC 
LIMIT 10;

