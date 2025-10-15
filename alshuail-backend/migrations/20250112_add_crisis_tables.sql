-- Crisis Alerts and Responses Tables
-- Created: 2025-01-12
-- Updated: 2025-01-12 (Fixed UUID compatibility)
-- Purpose: Support mobile crisis management features

-- Create crisis_alerts table
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_by UUID REFERENCES members(id),  -- Changed from INTEGER to UUID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crisis_responses table (member safe check-ins)
CREATE TABLE IF NOT EXISTS crisis_responses (
  id SERIAL PRIMARY KEY,
  crisis_id INTEGER NOT NULL REFERENCES crisis_alerts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,  -- Changed from INTEGER to UUID
  status VARCHAR(50) DEFAULT 'safe' CHECK (status IN ('safe', 'needs_help', 'no_response')),
  location TEXT,
  notes TEXT,
  response_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(crisis_id, member_id) -- One response per member per crisis
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_created_at ON crisis_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_responses_crisis_id ON crisis_responses(crisis_id);
CREATE INDEX IF NOT EXISTS idx_crisis_responses_member_id ON crisis_responses(member_id);
CREATE INDEX IF NOT EXISTS idx_crisis_responses_status ON crisis_responses(status);

-- Add comments for documentation
COMMENT ON TABLE crisis_alerts IS 'Emergency crisis alerts sent to all family members';
COMMENT ON TABLE crisis_responses IS 'Member responses to crisis alerts (I am safe check-ins)';

COMMENT ON COLUMN crisis_alerts.severity IS 'Crisis severity level: low, medium, high, critical';
COMMENT ON COLUMN crisis_alerts.status IS 'Alert status: active, resolved, cancelled';
COMMENT ON COLUMN crisis_responses.status IS 'Response status: safe, needs_help, no_response';

-- Sample data for testing (optional)
-- INSERT INTO crisis_alerts (title, message, status, severity, created_by)
-- VALUES
--   ('Test Crisis Alert', 'This is a test crisis alert. Please confirm you are safe.', 'active', 'medium', 1);
