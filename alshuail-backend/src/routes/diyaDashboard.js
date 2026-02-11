/**
 * Diya Dashboard Routes
 * Provides endpoints for blood money (diya) contribution tracking
 */

import express from 'express';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/diya/dashboard
 * Get all diya activities with statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Get all diya activities
        const activitiesResult = await query(
            `SELECT * FROM activities
             WHERE title_ar ILIKE $1 OR title_en ILIKE $2
             ORDER BY created_at DESC`,
            ['%دية%', '%Diya%']
        );
        const activities = activitiesResult.rows;

        // Get statistics for each activity
        const diyaStats = await Promise.all(activities.map(async (activity) => {
            try {
                // Get contribution stats
                const contributionsResult = await query(
                    `SELECT contribution_amount, contributor_id
                     FROM financial_contributions
                     WHERE activity_id = $1`,
                    [activity.id]
                );
                const contributions = contributionsResult.rows;

                // Calculate statistics
                const uniqueContributors = new Set(contributions.map(c => c.contributor_id));
                const totalAmount = contributions.reduce((sum, c) => sum + (parseFloat(c.contribution_amount) || 0), 0);
                const avgAmount = contributions.length > 0 ? totalAmount / contributions.length : 0;

                return {
                    activity_id: activity.id,
                    title_ar: activity.title_ar,
                    title_en: activity.title_en,
                    description_ar: activity.description_ar,
                    total_contributors: uniqueContributors.size,
                    total_collected: totalAmount,
                    average_contribution: avgAmount,
                    status: activity.status,
                    collection_status: activity.collection_status,
                    target_amount: activity.target_amount || 100000
                };
            } catch (contribError) {
                log.error('Error fetching contributions:', { error: contribError.message });
                return {
                    ...activity,
                    total_contributors: 0,
                    total_collected: 0,
                    average_contribution: 0
                };
            }
        }));

        res.json({
            success: true,
            data: diyaStats
        });
    } catch (error) {
        log.error('Error fetching diya dashboard:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch diya dashboard data'
        });
    }
});

/**
 * GET /api/diya/:id/contributors
 * Get contributors for a specific diya case with server-side pagination
 * Query params: ?page=1&limit=50
 */
router.get('/:id/contributors', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get total count first for pagination metadata
        const countResult = await query(
            `SELECT COUNT(*) FROM financial_contributions WHERE activity_id = $1`,
            [id]
        );
        const count = parseInt(countResult.rows[0].count);

        // Get paginated contributions
        const contributionsResult = await query(
            `SELECT * FROM financial_contributions
             WHERE activity_id = $1
             ORDER BY contribution_date DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );
        const contributions = contributionsResult.rows;

        // Get all member IDs for this page
        const memberIds = [...new Set(contributions.map(c => c.contributor_id))];

        // Get member details for this page only
        const membersResult = await query(
            `SELECT id, full_name, membership_number, tribal_section, phone
             FROM members
             WHERE id = ANY($1)`,
            [memberIds]
        );
        const members = membersResult.rows;

        // Create a member lookup map
        const memberMap = {};
        members.forEach(m => {
            memberMap[m.id] = m;
        });

        // Format the response with member details
        const contributors = contributions.map(contrib => {
            const member = memberMap[contrib.contributor_id] || {};
            return {
                member_id: contrib.contributor_id,
                member_name: member.full_name || 'Unknown',
                membership_number: member.membership_number || '',
                tribal_section: member.tribal_section || '',
                amount: contrib.contribution_amount || 0,
                contribution_date: contrib.contribution_date,
                payment_method: contrib.payment_method,
                status: contrib.status
            };
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(count / limit);

        res.json({
            success: true,
            data: contributors,
            pagination: {
                page,
                limit,
                total: count,
                totalPages,
                hasMore: page < totalPages,
                hasPrevious: page > 1
            }
        });
    } catch (error) {
        log.error('Error fetching contributors:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contributors'
        });
    }
});

/**
 * GET /api/diya/:id/contributors/all
 * Get ALL contributors for export (no pagination)
 * Used for PDF/Excel export functionality
 */
router.get('/:id/contributors/all', async (req, res) => {
    try {
        const { id } = req.params;

        // Get ALL contributions (no pagination)
        const contributionsResult = await query(
            `SELECT * FROM financial_contributions
             WHERE activity_id = $1
             ORDER BY contribution_date DESC`,
            [id]
        );
        const contributions = contributionsResult.rows;

        // Get all member IDs
        const memberIds = [...new Set(contributions.map(c => c.contributor_id))];

        // Get member details
        const membersResult = await query(
            `SELECT id, full_name, membership_number, tribal_section, phone
             FROM members
             WHERE id = ANY($1)`,
            [memberIds]
        );
        const members = membersResult.rows;

        // Create member lookup map
        const memberMap = {};
        members.forEach(m => {
            memberMap[m.id] = m;
        });

        // Format response with member details
        const contributors = contributions.map(contrib => {
            const member = memberMap[contrib.contributor_id] || {};
            return {
                member_id: contrib.contributor_id,
                member_name: member.full_name || 'Unknown',
                membership_number: member.membership_number || '',
                tribal_section: member.tribal_section || '',
                amount: contrib.contribution_amount || 0,
                contribution_date: contrib.contribution_date,
                payment_method: contrib.payment_method,
                status: contrib.status
            };
        });

        // Get diya details for export header
        const activityResult = await query(
            `SELECT * FROM activities WHERE id = $1`,
            [id]
        );
        const activity = activityResult.rows[0];

        res.json({
            success: true,
            data: contributors,
            diya: {
                id: activity?.id,
                title: activity?.title_ar || activity?.title_en,
                totalAmount: activity?.target_amount,
                collectedAmount: activity?.current_amount,
                totalContributors: contributors.length
            }
        });
    } catch (error) {
        log.error('Error fetching all contributors:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contributors for export'
        });
    }
});

/**
 * GET /api/diya/:id/stats
 * Get detailed statistics for a specific diya case
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Get activity details
        const activityResult = await query(
            `SELECT * FROM activities WHERE id = $1`,
            [id]
        );
        const activity = activityResult.rows[0];

        if (!activity) {
            return res.status(404).json({
                success: false,
                error: 'Activity not found'
            });
        }

        // Get contributions with member tribal sections
        const contributionsResult = await query(
            `SELECT fc.contribution_amount, fc.contributor_id, fc.contribution_date,
                    m.tribal_section
             FROM financial_contributions fc
             LEFT JOIN members m ON fc.contributor_id = m.id
             WHERE fc.activity_id = $1`,
            [id]
        );
        const contributions = contributionsResult.rows;

        // Calculate statistics
        const uniqueContributors = new Set(contributions.map(c => c.contributor_id));
        const totalAmount = contributions.reduce((sum, c) => sum + (parseFloat(c.contribution_amount) || 0), 0);

        // Group by tribal section
        const bySection = {};
        contributions.forEach(contrib => {
            const section = contrib.tribal_section || 'غير محدد';
            if (!bySection[section]) {
                bySection[section] = { count: 0, amount: 0 };
            }
            bySection[section].count++;
            bySection[section].amount += parseFloat(contrib.contribution_amount) || 0;
        });

        // Get contribution dates
        const dates = contributions.map(c => c.contribution_date).filter(d => d);
        const firstDate = dates.length > 0 ? Math.min(...dates.map(d => new Date(d))) : null;
        const lastDate = dates.length > 0 ? Math.max(...dates.map(d => new Date(d))) : null;

        res.json({
            success: true,
            data: {
                activity_id: activity.id,
                title_ar: activity.title_ar,
                title_en: activity.title_en,
                description_ar: activity.description_ar,
                description_en: activity.description_en,
                total_contributors: uniqueContributors.size,
                total_collected: totalAmount,
                target_amount: activity.target_amount || 100000,
                completion_percentage: ((totalAmount / (activity.target_amount || 100000)) * 100).toFixed(2),
                average_contribution: contributions.length > 0 ? totalAmount / contributions.length : 0,
                first_contribution: firstDate ? new Date(firstDate).toISOString() : null,
                last_contribution: lastDate ? new Date(lastDate).toISOString() : null,
                collection_status: activity.collection_status,
                by_tribal_section: bySection
            }
        });
    } catch (error) {
        log.error('Error fetching diya stats:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch diya statistics'
        });
    }
});

/**
 * GET /api/diya/summary
 * Get overall diya summary statistics
 */
router.get('/summary', async (req, res) => {
    try {
        // Get all diya activities
        const activitiesResult = await query(
            `SELECT id, status, collection_status
             FROM activities
             WHERE title_ar ILIKE $1 OR title_en ILIKE $2`,
            ['%دية%', '%Diya%']
        );
        const activities = activitiesResult.rows;
        const activityIds = activities.map(a => a.id);

        // Get all contributions for diya activities
        const contributionsResult = await query(
            `SELECT contribution_amount, contributor_id
             FROM financial_contributions
             WHERE activity_id = ANY($1)`,
            [activityIds]
        );
        const contributions = contributionsResult.rows;

        // Calculate summary statistics
        const uniqueContributors = new Set(contributions.map(c => c.contributor_id));
        const totalAmount = contributions.reduce((sum, c) => sum + (parseFloat(c.contribution_amount) || 0), 0);

        res.json({
            success: true,
            data: {
                total_diya_cases: activities.length,
                total_contributors: uniqueContributors.size,
                total_collected: totalAmount,
                active_cases: activities.filter(a => a.status === 'active').length,
                completed_cases: activities.filter(a => a.collection_status === 'completed').length
            }
        });
    } catch (error) {
        log.error('Error fetching diya summary:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch diya summary'
        });
    }
});

/**
 * POST /api/diya/:id/contribution
 * Add a new contribution to a diya case
 */
router.post('/:id/contribution', async (req, res) => {
    try {
        const { id } = req.params;
        const { contributor_id, amount, payment_method = 'cash', notes } = req.body;

        // Validate input
        if (!contributor_id || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contribution data'
            });
        }

        // Create contribution record
        const result = await query(
            `INSERT INTO financial_contributions
             (activity_id, contributor_id, contribution_amount, payment_method, contribution_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, contributor_id, amount, payment_method, new Date().toISOString().split('T')[0], notes]
        );
        const contribution = result.rows[0];

        res.json({
            success: true,
            data: contribution
        });
    } catch (error) {
        log.error('Error adding contribution:', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to add contribution'
        });
    }
});

export default router;