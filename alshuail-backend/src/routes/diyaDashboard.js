/**
 * Diya Dashboard Routes
 * Provides endpoints for blood money (diya) contribution tracking
 */

import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/diya/dashboard
 * Get all diya activities with statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Get all diya activities
        const { data: activities, error: _activitiesError } = await supabaseAdmin
            .from('activities')
            .select('*')
            .or('title_ar.ilike.%دية%,title_en.ilike.%Diya%')
            .order('created_at', { ascending: false });

        if (_activitiesError) {throw _activitiesError;}

        // Get statistics for each activity
        const diyaStats = await Promise.all(activities.map(async (activity) => {
            // Get contribution stats
            const { data: contributions, error: _contribError } = await supabaseAdmin
                .from('financial_contributions')
                .select('contribution_amount, contributor_id')
                .eq('activity_id', activity.id);

            if (_contribError) {
                log.error('Error fetching contributions:', { error: _contribError.message });
                return {
                    ...activity,
                    total_contributors: 0,
                    total_collected: 0,
                    average_contribution: 0
                };
            }

            // Calculate statistics
            const uniqueContributors = new Set(contributions?.map(c => c.contributor_id) || []);
            const totalAmount = contributions?.reduce((sum, c) => sum + (parseFloat(c.contribution_amount) || 0), 0) || 0;
            const avgAmount = contributions?.length > 0 ? totalAmount / contributions.length : 0;

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
        const { count, error: _countError } = await supabaseAdmin
            .from('financial_contributions')
            .select('*', { count: 'exact', head: true })
            .eq('activity_id', id);

        if (_countError) {throw _countError;}

        // Get paginated contributions
        const { data: contributions, error: _contribError } = await supabaseAdmin
            .from('financial_contributions')
            .select('*')
            .eq('activity_id', id)
            .order('contribution_date', { ascending: false })
            .range(offset, offset + limit - 1);

        if (_contribError) {throw _contribError;}

        // Get all member IDs for this page
        const memberIds = [...new Set(contributions.map(c => c.contributor_id))];

        // Get member details for this page only
        const { data: members, error: _membersError } = await supabaseAdmin
            .from('members')
            .select('id, full_name, membership_number, tribal_section, phone')
            .in('id', memberIds);

        if (_membersError) {throw _membersError;}

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
 * GET /api/diya/:id/stats
 * Get detailed statistics for a specific diya case
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Get activity details
        const { data: activity, error: _activityError } = await supabaseAdmin
            .from('activities')
            .select('*')
            .eq('id', id)
            .single();

        if (_activityError) {throw _activityError;}

        // Get contributions
        const { data: contributions, error: _contribError } = await supabaseAdmin
            .from('financial_contributions')
            .select(`
                contribution_amount,
                contributor_id,
                contribution_date,
                members:contributor_id (
                    tribal_section
                )
            `)
            .eq('activity_id', id);

        if (_contribError) {throw _contribError;}

        // Calculate statistics
        const uniqueContributors = new Set(contributions?.map(c => c.contributor_id) || []);
        const totalAmount = contributions?.reduce((sum, c) => sum + (c.contribution_amount || 0), 0) || 0;

        // Group by tribal section
        const bySection = {};
        contributions?.forEach(contrib => {
            const section = contrib.members?.tribal_section || 'غير محدد';
            if (!bySection[section]) {
                bySection[section] = { count: 0, amount: 0 };
            }
            bySection[section].count++;
            bySection[section].amount += contrib.contribution_amount || 0;
        });

        // Get contribution dates
        const dates = contributions?.map(c => c.contribution_date).filter(d => d) || [];
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
                average_contribution: contributions?.length > 0 ? totalAmount / contributions.length : 0,
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
        const { data: activities, error: _activitiesError } = await supabaseAdmin
            .from('activities')
            .select('id')
            .or('title_ar.ilike.%دية%,title_en.ilike.%Diya%');

        if (_activitiesError) {throw _activitiesError;}

        const activityIds = activities.map(a => a.id);

        // Get all contributions for diya activities
        const { data: contributions, error: _contribError } = await supabaseAdmin
            .from('financial_contributions')
            .select('contribution_amount, contributor_id')
            .in('activity_id', activityIds);

        if (_contribError) {throw _contribError;}

        // Calculate summary statistics
        const uniqueContributors = new Set(contributions?.map(c => c.contributor_id) || []);
        const totalAmount = contributions?.reduce((sum, c) => sum + (c.contribution_amount || 0), 0) || 0;

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
        const { data: contribution, error } = await supabaseAdmin
            .from('financial_contributions')
            .insert({
                activity_id: id,
                contributor_id,
                contribution_amount: amount,
                payment_method,
                contribution_date: new Date().toISOString().split('T')[0],
                notes
            })
            .select()
            .single();

        if (error) {throw error;}

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