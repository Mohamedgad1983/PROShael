-- ============================================================================
-- DIYA DASHBOARD - SQL QUERIES
-- ============================================================================
-- These queries power the diya cards on the dashboard
-- Copy these to your backend API to fetch real data
-- ============================================================================

-- 1. GET ALL DIYA CASES WITH STATISTICS
-- ============================================================================
-- Use this for the dashboard cards

CREATE OR REPLACE VIEW diya_dashboard_stats AS
SELECT 
    a.id as activity_id,
    a.title_ar,
    a.title_en,
    COUNT(DISTINCT fc.contributor_id) as total_contributors,
    COUNT(fc.id) as total_contributions,
    COALESCE(SUM(fc.amount), 0) as total_collected,
    COALESCE(AVG(fc.amount), 0) as average_contribution,
    MAX(fc.contribution_date) as last_contribution_date,
    a.status,
    a.collection_status
FROM activities a
LEFT JOIN financial_contributions fc ON a.id = fc.activity_id
WHERE a.title_ar LIKE '%دية%' 
   OR a.title_en LIKE '%Diya%'
   OR fc.contribution_type = 'diya'
GROUP BY a.id, a.title_ar, a.title_en, a.status, a.collection_status
ORDER BY a.created_at;

-- Query to use in API:
SELECT * FROM diya_dashboard_stats;

-- Expected Result:
-- activity_id | title_ar      | total_contributors | total_collected
-- xxx         | دية نادر      | 282               | 28,200 SAR
-- xxx         | دية شرهان 1   | 292               | 29,200 SAR
-- xxx         | دية شرهان 2   | 278               | 83,400 SAR


-- ============================================================================
-- 2. GET CONTRIBUTORS FOR A SPECIFIC DIYA CASE
-- ============================================================================
-- Use this when user clicks on a diya card

CREATE OR REPLACE FUNCTION get_diya_contributors(p_activity_id UUID)
RETURNS TABLE (
    member_id UUID,
    member_name VARCHAR,
    membership_number VARCHAR,
    tribal_section VARCHAR,
    amount DECIMAL,
    contribution_date DATE,
    payment_method VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.full_name,
        m.membership_number,
        m.tribal_section,
        fc.amount,
        fc.contribution_date,
        fc.payment_method,
        fc.status
    FROM financial_contributions fc
    JOIN members m ON fc.contributor_id = m.id
    WHERE fc.activity_id = p_activity_id
    ORDER BY fc.contribution_date DESC, m.full_name;
END;
$$ LANGUAGE plpgsql;

-- Query to use in API:
SELECT * FROM get_diya_contributors('activity_id_here');


-- ============================================================================
-- 3. GET DIYA SUMMARY BY TRIBAL SECTION
-- ============================================================================
-- Shows which tribal sections contributed most

CREATE OR REPLACE VIEW diya_by_tribal_section AS
SELECT 
    a.title_ar as diya_case,
    m.tribal_section,
    COUNT(DISTINCT m.id) as members_contributed,
    COUNT(fc.id) as total_contributions,
    SUM(fc.amount) as total_amount,
    AVG(fc.amount) as average_amount
FROM financial_contributions fc
JOIN members m ON fc.contributor_id = m.id
JOIN activities a ON fc.activity_id = a.id
WHERE fc.contribution_type = 'diya'
GROUP BY a.title_ar, m.tribal_section
ORDER BY a.title_ar, total_amount DESC;

-- Query to use in API:
SELECT * FROM diya_by_tribal_section;


-- ============================================================================
-- 4. GET TOP DIYA CONTRIBUTORS (Leaderboard)
-- ============================================================================

SELECT 
    m.id,
    m.full_name,
    m.membership_number,
    m.tribal_section,
    COUNT(fc.id) as total_contributions,
    SUM(fc.amount) as total_contributed,
    STRING_AGG(DISTINCT a.title_ar, ', ') as diya_cases_supported
FROM financial_contributions fc
JOIN members m ON fc.contributor_id = m.id
JOIN activities a ON fc.activity_id = a.id
WHERE fc.contribution_type = 'diya'
GROUP BY m.id, m.full_name, m.membership_number, m.tribal_section
ORDER BY total_contributed DESC
LIMIT 20;


-- ============================================================================
-- 5. GET DASHBOARD SUMMARY CARDS DATA
-- ============================================================================
-- All numbers for the dashboard header

SELECT 
    -- Total unique contributors across all diya cases
    (SELECT COUNT(DISTINCT contributor_id) 
     FROM financial_contributions 
     WHERE contribution_type = 'diya') as total_contributors,
    
    -- Total amount collected
    (SELECT COALESCE(SUM(amount), 0) 
     FROM financial_contributions 
     WHERE contribution_type = 'diya') as total_collected,
    
    -- Number of active diya cases
    (SELECT COUNT(*) 
     FROM activities 
     WHERE (title_ar LIKE '%دية%' OR title_en LIKE '%Diya%')
     AND status = 'active') as active_cases,
    
    -- Number of completed diya cases
    (SELECT COUNT(*) 
     FROM activities 
     WHERE (title_ar LIKE '%دية%' OR title_en LIKE '%Diya%')
     AND collection_status = 'completed') as completed_cases;


-- ============================================================================
-- 6. QUICK API ENDPOINTS YOU NEED
-- ============================================================================

-- Endpoint 1: GET /api/diya/dashboard
-- Returns all diya stats for dashboard cards
SELECT 
    id,
    title_ar,
    title_en,
    (SELECT COUNT(*) FROM financial_contributions WHERE activity_id = a.id) as contributors,
    (SELECT COALESCE(SUM(amount), 0) FROM financial_contributions WHERE activity_id = a.id) as total_amount,
    collection_status,
    status
FROM activities a
WHERE title_ar LIKE '%دية%' OR title_en LIKE '%Diya%'
ORDER BY created_at;


-- Endpoint 2: GET /api/diya/:id/contributors
-- Returns list of people who contributed to specific diya
SELECT 
    m.id,
    m.full_name,
    m.membership_number,
    m.tribal_section,
    fc.amount,
    fc.contribution_date,
    fc.payment_method
FROM financial_contributions fc
JOIN members m ON fc.contributor_id = m.id
WHERE fc.activity_id = :id
ORDER BY m.full_name;


-- Endpoint 3: GET /api/diya/:id/stats
-- Returns detailed stats for one diya case
SELECT 
    a.id,
    a.title_ar,
    a.title_en,
    a.description_ar,
    COUNT(DISTINCT fc.contributor_id) as total_contributors,
    COALESCE(SUM(fc.amount), 0) as total_collected,
    MIN(fc.contribution_date) as first_contribution,
    MAX(fc.contribution_date) as last_contribution,
    a.collection_status,
    -- Breakdown by tribal section
    (SELECT json_agg(row_to_json(t))
     FROM (
         SELECT 
             m.tribal_section,
             COUNT(*) as count,
             SUM(fc2.amount) as amount
         FROM financial_contributions fc2
         JOIN members m ON fc2.contributor_id = m.id
         WHERE fc2.activity_id = a.id
         GROUP BY m.tribal_section
     ) t
    ) as by_tribal_section
FROM activities a
LEFT JOIN financial_contributions fc ON a.id = fc.activity_id
WHERE a.id = :id
GROUP BY a.id;


-- ============================================================================
-- 7. INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Create these indexes if not exist
CREATE INDEX IF NOT EXISTS idx_fc_activity_id 
ON financial_contributions(activity_id);

CREATE INDEX IF NOT EXISTS idx_fc_contributor_id 
ON financial_contributions(contributor_id);

CREATE INDEX IF NOT EXISTS idx_fc_contribution_type 
ON financial_contributions(contribution_type);

CREATE INDEX IF NOT EXISTS idx_activities_title_ar 
ON activities(title_ar);

CREATE INDEX IF NOT EXISTS idx_members_tribal_section 
ON members(tribal_section);


-- ============================================================================
-- 8. SAMPLE DATA TO TEST
-- ============================================================================

-- Check if you have diya data
SELECT 
    'Activities with diya' as check_type,
    COUNT(*) as count 
FROM activities 
WHERE title_ar LIKE '%دية%';

SELECT 
    'Financial contributions (diya type)' as check_type,
    COUNT(*) as count 
FROM financial_contributions 
WHERE contribution_type = 'diya';

-- If both are > 0, you have data!
-- If activities > 0 but contributions = 0, run the import script
-- If both = 0, need to import both activities and contributions
