-- Run this in Supabase SQL Editor to add transcript column to lectures table

ALTER TABLE lectures 
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lectures' 
AND column_name = 'transcript';

