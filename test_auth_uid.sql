-- Simple test to check if auth.uid() is working
-- Execute this while logged in

-- 1. Check if auth.uid() returns something
SELECT auth.uid() as current_user_id;

-- 2. If above returns a UUID, check if user exists in users table
SELECT 
    id,
    email,
    clinic_id,
    role
FROM users
WHERE id = auth.uid();

-- 3. If nothing returned, try to see ALL users (for debugging)
SELECT COUNT(*) as total_users FROM users;
