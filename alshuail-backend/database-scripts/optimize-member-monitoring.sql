-- Member Monitoring Database Optimization Script
-- Performance optimizations for handling 1000+ members with < 300ms response time
-- Created: 2025-09-27

-- ============================================
-- 1. ADD INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ============================================

-- Index for member ID searches (both membership_number and id)
CREATE INDEX IF NOT EXISTS idx_members_membership_number
ON members(membership_number);

CREATE INDEX IF NOT EXISTS idx_members_id
ON members(id);

-- Index for full name searches (Arabic text support)
CREATE INDEX IF NOT EXISTS idx_members_full_name
ON members(full_name);

-- GIN index for full-text search on Arabic names
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_members_full_name_trgm
ON members USING gin(full_name gin_trgm_ops);

-- Index for phone number searches
CREATE INDEX IF NOT EXISTS idx_members_phone
ON members(phone);

CREATE INDEX IF NOT EXISTS idx_members_mobile
ON members(mobile);

-- Index for tribal section filtering
CREATE INDEX IF NOT EXISTS idx_members_tribal_section
ON members(tribal_section);

-- Index for suspension status
CREATE INDEX IF NOT EXISTS idx_members_is_suspended
ON members(is_suspended);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_members_status_tribal
ON members(is_suspended, tribal_section);

-- ============================================
-- 2. PAYMENT TABLE INDEXES
-- ============================================

-- Index for payer_id (critical for balance calculations)
CREATE INDEX IF NOT EXISTS idx_payments_payer_id
ON payments(payer_id);

-- Index for payment status
CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

-- Composite index for balance queries
CREATE INDEX IF NOT EXISTS idx_payments_payer_status
ON payments(payer_id, status);

-- Index for payment date range queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at
ON payments(created_at DESC);

-- ============================================
-- 3. RPC FUNCTION FOR AGGREGATED PAYMENT DATA
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_payment_summary();

-- Create optimized payment summary function
CREATE OR REPLACE FUNCTION get_payment_summary()
RETURNS TABLE (
    payer_id UUID,
    total_amount DECIMAL,
    payment_count INTEGER,
    last_payment_date TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.payer_id,
        SUM(p.amount)::DECIMAL as total_amount,
        COUNT(*)::INTEGER as payment_count,
        MAX(p.created_at) as last_payment_date
    FROM payments p
    WHERE p.status IN ('completed', 'approved')
    GROUP BY p.payer_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_payment_summary() TO service_role;

-- ============================================
-- 4. MEMBER BALANCE VIEW (MATERIALIZED)
-- ============================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS member_balances;

-- Create materialized view for member balances
CREATE MATERIALIZED VIEW member_balances AS
SELECT
    m.id,
    m.membership_number,
    m.full_name,
    m.phone,
    m.mobile,
    m.email,
    m.tribal_section,
    m.is_suspended,
    COALESCE(p.total_amount, 0) as balance,
    COALESCE(p.payment_count, 0) as payment_count,
    p.last_payment_date,
    CASE
        WHEN COALESCE(p.total_amount, 0) >= 5000 THEN 'excellent'
        WHEN COALESCE(p.total_amount, 0) >= 3000 THEN 'compliant'
        WHEN COALESCE(p.total_amount, 0) >= 1000 THEN 'non-compliant'
        ELSE 'critical'
    END as compliance_status,
    m.created_at,
    m.updated_at
FROM members m
LEFT JOIN (
    SELECT
        payer_id,
        SUM(amount) as total_amount,
        COUNT(*) as payment_count,
        MAX(created_at) as last_payment_date
    FROM payments
    WHERE status IN ('completed', 'approved')
    GROUP BY payer_id
) p ON m.id = p.payer_id;

-- Create indexes on materialized view
CREATE INDEX idx_member_balances_id ON member_balances(id);
CREATE INDEX idx_member_balances_balance ON member_balances(balance);
CREATE INDEX idx_member_balances_compliance ON member_balances(compliance_status);
CREATE INDEX idx_member_balances_tribal ON member_balances(tribal_section);

-- ============================================
-- 5. FUNCTION TO REFRESH MATERIALIZED VIEW
-- ============================================

CREATE OR REPLACE FUNCTION refresh_member_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_balances;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_member_balances() TO service_role;

-- ============================================
-- 6. AUDIT LOG TABLE INDEXES
-- ============================================

-- Create audit_log table if not exists
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    target_type VARCHAR(100),
    performed_by VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
ON audit_log(action_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_type
ON audit_log(target_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by
ON audit_log(performed_by);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
ON audit_log(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_action_target
ON audit_log(action_type, target_type, created_at DESC);

-- ============================================
-- 7. SMS QUEUE TABLE
-- ============================================

-- Create SMS queue table if not exists
CREATE TABLE IF NOT EXISTS sms_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    member_id UUID REFERENCES members(id),
    notification_id UUID,
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for SMS queue
CREATE INDEX IF NOT EXISTS idx_sms_queue_status
ON sms_queue(status);

CREATE INDEX IF NOT EXISTS idx_sms_queue_member_id
ON sms_queue(member_id);

CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at
ON sms_queue(created_at);

-- ============================================
-- 8. UPDATE MEMBERS TABLE STRUCTURE
-- ============================================

-- Add missing columns to members table if they don't exist
ALTER TABLE members
ADD COLUMN IF NOT EXISTS tribal_section VARCHAR(100);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(255);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS reactivated_by VARCHAR(255);

ALTER TABLE members
ADD COLUMN IF NOT EXISTS joined_date DATE;

-- ============================================
-- 9. STATISTICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_member_statistics()
RETURNS TABLE (
    total_members BIGINT,
    compliant_members BIGINT,
    non_compliant_members BIGINT,
    critical_members BIGINT,
    excellent_members BIGINT,
    suspended_members BIGINT,
    average_balance DECIMAL,
    total_balance DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_members,
        COUNT(CASE WHEN balance >= 3000 THEN 1 END)::BIGINT as compliant_members,
        COUNT(CASE WHEN balance < 3000 THEN 1 END)::BIGINT as non_compliant_members,
        COUNT(CASE WHEN balance < 1000 THEN 1 END)::BIGINT as critical_members,
        COUNT(CASE WHEN balance >= 5000 THEN 1 END)::BIGINT as excellent_members,
        COUNT(CASE WHEN is_suspended = true THEN 1 END)::BIGINT as suspended_members,
        AVG(balance)::DECIMAL as average_balance,
        SUM(balance)::DECIMAL as total_balance
    FROM member_balances;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_member_statistics() TO service_role;

-- ============================================
-- 10. TRIBAL SECTION STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION get_tribal_section_stats()
RETURNS TABLE (
    tribal_section VARCHAR,
    member_count BIGINT,
    compliant_count BIGINT,
    average_balance DECIMAL,
    total_balance DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mb.tribal_section,
        COUNT(*)::BIGINT as member_count,
        COUNT(CASE WHEN mb.balance >= 3000 THEN 1 END)::BIGINT as compliant_count,
        AVG(mb.balance)::DECIMAL as average_balance,
        SUM(mb.balance)::DECIMAL as total_balance
    FROM member_balances mb
    WHERE mb.tribal_section IS NOT NULL
    GROUP BY mb.tribal_section
    ORDER BY member_count DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tribal_section_stats() TO service_role;

-- ============================================
-- 11. PERFORMANCE MONITORING
-- ============================================

-- Create table for query performance monitoring
CREATE TABLE IF NOT EXISTS query_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_type VARCHAR(100),
    execution_time INTEGER, -- in milliseconds
    filters_used JSONB,
    result_count INTEGER,
    cached BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance analysis
CREATE INDEX IF NOT EXISTS idx_query_performance_type
ON query_performance(query_type);

CREATE INDEX IF NOT EXISTS idx_query_performance_created_at
ON query_performance(created_at DESC);

-- ============================================
-- 12. VACUUM AND ANALYZE
-- ============================================

-- Analyze tables for query optimizer
ANALYZE members;
ANALYZE payments;
ANALYZE audit_log;
ANALYZE notifications;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('members', 'payments', 'audit_log', 'notifications', 'sms_queue')
ORDER BY tablename, indexname;

-- Check table sizes
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- Check query performance
SELECT
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%members%'
ORDER BY mean_time DESC
LIMIT 10;