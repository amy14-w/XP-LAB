-- Migration: Add transcript column to lectures table
-- Run this migration to add the transcript field to existing databases

-- Add transcript column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lectures' 
        AND column_name = 'transcript'
    ) THEN
        ALTER TABLE lectures ADD COLUMN transcript TEXT;
        RAISE NOTICE 'Added transcript column to lectures table';
    ELSE
        RAISE NOTICE 'transcript column already exists in lectures table';
    END IF;
END $$;

