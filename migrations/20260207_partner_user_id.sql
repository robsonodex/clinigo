-- Migration: Add user_id column to partners table for authentication
-- This links the partner record to a Supabase auth user

-- Add user_id column
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- Add unique constraint to ensure one partner per user
ALTER TABLE partners 
ADD CONSTRAINT partners_user_id_unique UNIQUE (user_id);

COMMENT ON COLUMN partners.user_id IS 'Links partner to Supabase auth user for login';
