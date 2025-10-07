-- ============================================
-- INITIATIVES SYSTEM DATABASE SETUP
-- File: 01_add_initiative_fields.sql
-- Purpose: Add all fields and triggers for initiatives management
-- ============================================

-- INITIATIVES TABLE ENHANCEMENTS
-- Existing table: initiatives (already exists)
-- Add these columns if missing:

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS min_contribution DECIMAL(10,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS max_contribution DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS target_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS current_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT NOW();
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS end_date TIMESTAMP DEFAULT NULL;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'; 
-- Status: draft, active, completed, archived
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS beneficiary_name_ar TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS beneficiary_name_en TEXT;

-- INITIATIVE DONATIONS TABLE ENHANCEMENTS
-- Existing table: initiative_donations (already exists)
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer';
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT NOW();
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;
ALTER TABLE initiative_donations ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_initiative_donations_member ON initiative_donations(donor_member_id);
CREATE INDEX IF NOT EXISTS idx_initiative_donations_initiative ON initiative_donations(initiative_id);

-- AUTO-UPDATE TRIGGER: Update current_amount when donation approved
CREATE OR REPLACE FUNCTION update_initiative_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.approved_by IS NOT NULL)) THEN
        UPDATE initiatives 
        SET current_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM initiative_donations
            WHERE initiative_id = NEW.initiative_id
            AND approved_by IS NOT NULL
        )
        WHERE id = NEW.initiative_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_initiative_amount ON initiative_donations;
CREATE TRIGGER trigger_update_initiative_amount
AFTER INSERT OR UPDATE ON initiative_donations
FOR EACH ROW EXECUTE FUNCTION update_initiative_amount();

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_initiatives_updated_at ON initiatives;
CREATE TRIGGER update_initiatives_updated_at 
BEFORE UPDATE ON initiatives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify setup:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'initiatives';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'initiative_donations';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Database setup complete! ✅
-- Run this script in Supabase SQL Editor
-- All initiatives fields and triggers are now active
