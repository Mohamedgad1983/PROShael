-- Migration: Create audit_logs table
-- Purpose: Track all admin actions for compliance and auditing
-- File: 04-ADMIN-APIS.md implementation
-- Date: 2025-01-20

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE audit_logs IS 'Audit trail for all admin actions';
COMMENT ON COLUMN audit_logs.admin_id IS 'User ID of admin who performed action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., member_created, member_approved)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., member, user, subdivision)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing details of changes made';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of admin at time of action';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent string';

-- Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all audit logs
CREATE POLICY "Super admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Policy: Admins can view their own audit logs
CREATE POLICY "Admins can view own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

-- Policy: Only authenticated users (admins) can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
