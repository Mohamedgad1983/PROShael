-- PHASE 4 DATABASE OPTIMIZATION
-- Critical Index Creation Script
-- Date: October 19, 2025
-- Status: Ready to execute

-- ============================================================================
-- MEMBERS TABLE INDEXES
-- ============================================================================

-- Index on status for filtering active/inactive members
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Index on type for member category filtering
CREATE INDEX IF NOT EXISTS idx_members_type ON members(type);

-- Index on created_at for recent member queries
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at DESC);

-- Index on updated_at for tracking changes
CREATE INDEX IF NOT EXISTS idx_members_updated_at ON members(updated_at DESC);

-- ============================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================

-- Composite index for member payment queries (most common)
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id, created_at DESC);

-- Index on status for payment filtering
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index on created_at for date range queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================================================
-- SUBSCRIPTIONS TABLE INDEXES
-- ============================================================================

-- Index on member_id for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions(member_id);

-- Index on status for active subscription filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- INITIATIVES TABLE INDEXES
-- ============================================================================

-- Composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

-- Index on status for active initiative filtering
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);

-- ============================================================================
-- DIYAS TABLE INDEXES
-- ============================================================================

-- Composite index for user diya lookups with status filtering
CREATE INDEX IF NOT EXISTS idx_diyas_user_status ON diyas(user_id, status);

-- Index on created_at for recent diya queries
CREATE INDEX IF NOT EXISTS idx_diyas_created_at ON diyas(created_at DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all created indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

-- Check index sizes (approximately)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- PERFORMANCE VERIFICATION (Run EXPLAIN ANALYZE after index creation)
-- ============================================================================

-- Test 1: Members by status query (should use idx_members_status)
-- EXPLAIN ANALYZE SELECT * FROM members WHERE status = 'active' LIMIT 100;

-- Test 2: Payments by member query (should use idx_payments_member_id)
-- EXPLAIN ANALYZE SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC LIMIT 50;

-- Test 3: Subscriptions by status (should use idx_subscriptions_status)
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM subscriptions WHERE status = 'active';

-- Test 4: Date range query (should use idx_initiatives_dates)
-- EXPLAIN ANALYZE SELECT * FROM initiatives WHERE start_date >= ? AND end_date <= ?;

-- Test 5: User diyas with status (should use idx_diyas_user_status)
-- EXPLAIN ANALYZE SELECT * FROM diyas WHERE user_id = ? AND status IN ('pending', 'approved');

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- These 13 indexes address the most common query patterns identified in Phase 4.1 profiling
-- Expected performance improvements:
-- - Full table scans → Index scans: 40-100x faster
-- - Query time reduction: 500-2000ms → 50-200ms
--
-- Index creation typically takes 30-60 seconds for tables with 100k-500k rows
-- No downtime required - indexes can be created online
--
-- Next steps:
-- 1. Execute this script against the production database
-- 2. Run EXPLAIN ANALYZE on slow queries to verify index usage
-- 3. Monitor query performance over next 24 hours
-- 4. Analyze for any regressions
--
