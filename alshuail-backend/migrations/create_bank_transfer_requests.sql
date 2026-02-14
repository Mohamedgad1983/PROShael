-- Migration: Create bank_transfer_requests table
-- Required by: /api/bank-transfers endpoints
-- Date: 2026-02-14

CREATE TABLE IF NOT EXISTS bank_transfer_requests (
  id SERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES members(id),
  beneficiary_id UUID NOT NULL REFERENCES members(id),
  amount DECIMAL(10, 2) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'general',
  purpose_reference_id UUID,
  receipt_url VARCHAR(500),
  receipt_filename VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_btr_status ON bank_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_btr_requester ON bank_transfer_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_btr_beneficiary ON bank_transfer_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_btr_created_at ON bank_transfer_requests(created_at DESC);
