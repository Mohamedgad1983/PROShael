-- Migration: Create Notification Logs Table
-- Date: 2025-11-29
-- Purpose: Store push notification logs for auditing and debugging

-- Create notification_logs table if not exists
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_broadcast BOOLEAN DEFAULT false,
    topic TEXT,
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_member ON notification_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_is_broadcast ON notification_logs(is_broadcast);

-- Add comment
COMMENT ON TABLE notification_logs IS 'Stores push notification history for auditing';

-- Verify table exists
SELECT 'notification_logs table created successfully' AS result;
