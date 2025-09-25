-- Manual Schema Update for Al-Shuail Members Management System
-- Run this SQL directly in Supabase SQL Editor

-- 1. Create excel_import_batches table
DROP TABLE IF EXISTS excel_import_batches CASCADE;
CREATE TABLE excel_import_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    total_records INTEGER NOT NULL,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    error_details JSONB,
    imported_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_import_batches_status ON excel_import_batches(status);
CREATE INDEX idx_import_batches_created_at ON excel_import_batches(created_at);

-- 2. Create member_registration_tokens table
DROP TABLE IF EXISTS member_registration_tokens CASCADE;
CREATE TABLE member_registration_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    token VARCHAR(8) UNIQUE NOT NULL,
    temp_password VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_registration_tokens_token ON member_registration_tokens(token);
CREATE INDEX idx_registration_tokens_member_id ON member_registration_tokens(member_id);
CREATE INDEX idx_registration_tokens_expires_at ON member_registration_tokens(expires_at);
CREATE INDEX idx_registration_tokens_used ON member_registration_tokens(is_used);

-- 3. Add new columns to members table if they don't exist
ALTER TABLE members
ADD COLUMN IF NOT EXISTS social_security_beneficiary BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS employer VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS excel_import_batch UUID,
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);

-- 4. Create a test record to verify everything works
INSERT INTO excel_import_batches (filename, total_records, status)
VALUES ('test.xlsx', 0, 'test');

INSERT INTO member_registration_tokens (member_id, token, temp_password, expires_at, is_used)
VALUES (
    (SELECT id FROM members LIMIT 1),
    'TEST1234',
    'testpass',
    NOW() + INTERVAL '30 days',
    false
);

-- Clean up test records
DELETE FROM excel_import_batches WHERE filename = 'test.xlsx';
DELETE FROM member_registration_tokens WHERE token = 'TEST1234';

-- 5. Verify the schema
SELECT 'excel_import_batches' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'excel_import_batches'
ORDER BY ordinal_position;

SELECT 'member_registration_tokens' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'member_registration_tokens'
ORDER BY ordinal_position;

-- Success message
SELECT 'Schema update completed successfully!' as status;