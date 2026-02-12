-- Create admin@alshuail.com user in PostgreSQL (VPS)
-- Password: Admin@123456
-- This script should be run on the VPS database

-- First, check if users table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'users table does not exist! Please run migrations first.';
    END IF;
END $$;

-- Insert or update admin user
INSERT INTO public.users (
    email,
    phone,
    password_hash,
    role,
    is_active,
    full_name_ar,
    full_name_en,
    created_at,
    updated_at
)
VALUES (
    'admin@alshuail.com',
    '0551234567',
    '$2a$10$YQmGvN8K0hzJ5xKqX8.zOuFj5qL8vZ9nH3wXY4tK2lM6rN8pQ0sWu', -- Hash for: Admin@123456
    'super_admin',
    true,
    'المدير الأعلى',
    'Super Administrator',
    NOW(),
    NOW()
)
ON CONFLICT (email)
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the user was created
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users WHERE email = 'admin@alshuail.com';

    IF user_count > 0 THEN
        RAISE NOTICE '✅ Admin user created/updated successfully!';
        RAISE NOTICE '   Email: admin@alshuail.com';
        RAISE NOTICE '   Password: Admin@123456';
        RAISE NOTICE '   Role: super_admin';
    ELSE
        RAISE EXCEPTION '❌ Failed to create admin user!';
    END IF;
END $$;
