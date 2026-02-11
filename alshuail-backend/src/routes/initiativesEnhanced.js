// ============================================
// INITIATIVES API - COMPLETE IMPLEMENTATION
// File: backend/routes/initiativesEnhanced.js
// Purpose: Full CRUD + lifecycle management for initiatives
// ============================================

import express from 'express';
import { query } from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// Helper function to check if user is admin
const isAdmin = async (userId) => {
    try {
        const result = await query(
            `SELECT role FROM users WHERE id = $1`,
            [userId]
        );
        const user = result.rows[0];

        // Accept both 'admin' and 'super_admin' roles
        return user?.role === 'admin' || user?.role === 'super_admin';
    } catch (error) {
        log.error('Error checking admin status', { error: error.message });
        return false;
    }
};

// Admin middleware
const adminOnly = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

// 1. CREATE INITIATIVE (Admin Only)
router.post('/', authenticateToken, adminOnly, async (req, res) => {
    try {
        const {
            title_ar,
            title_en,
            description_ar,
            description_en,
            beneficiary_name_ar,
            beneficiary_name_en,
            target_amount,
            min_contribution,
            max_contribution,
            start_date,
            end_date,
            status // draft or active
        } = req.body;

        // Validation
        if (!title_ar || !target_amount) {
            return res.status(400).json({ error: 'Title and target amount required' });
        }

        if (min_contribution && max_contribution && min_contribution > max_contribution) {
            return res.status(400).json({ error: 'Min contribution cannot exceed max' });
        }

        // Convert empty strings to null for date fields
        const startDate = start_date && start_date.trim() !== '' ? start_date : null;
        const endDate = end_date && end_date.trim() !== '' ? end_date : null;

        const result = await query(
            `INSERT INTO initiatives
             (title, title_ar, title_en, description_ar, description_en, beneficiary_name_ar, beneficiary_name_en,
              target_amount, current_amount, min_contribution, max_contribution, start_date, end_date, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [title_ar || title_en || 'بدون عنوان', title_ar, title_en, description_ar, description_en,
             beneficiary_name_ar, beneficiary_name_en, target_amount, min_contribution || 0, max_contribution,
             startDate, endDate, status || 'draft', req.user.id]
        );
        const _data = result.rows[0];

        res.status(201).json({
            message: 'Initiative created successfully',
            initiative: _data
        });
    } catch (error) {
        log.error('Create initiative error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 2. UPDATE INITIATIVE (Admin Only)
router.put('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Don't allow updating current_amount directly (calculated by trigger)
        delete updates.current_amount;

        // Build dynamic UPDATE query
        const fields = Object.keys(updates);
        const setClause = fields.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
        const values = Object.values(updates);

        const result = await query(
            `UPDATE initiatives SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        const _data = result.rows[0];

        res.json({
            message: 'Initiative updated successfully',
            initiative: _data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. DELETE INITIATIVE (Admin Only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM initiatives WHERE id = $1 RETURNING *',
            [id]
        );
        const _data = result.rows[0];

        if (!_data) {
            return res.status(404).json({ error: 'Initiative not found' });
        }

        res.json({
            message: 'Initiative deleted successfully',
            initiative: _data
        });
    } catch (error) {
        log.error('Delete initiative error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 4. CHANGE INITIATIVE STATUS (Admin Only)
router.patch('/:id/status', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, completion_notes } = req.body;

        const validStatuses = ['draft', 'active', 'completed', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Build dynamic SET clause
        const setClauses = ['status = $2'];
        const params = [id, status];
        let paramIdx = 3;

        if (status === 'archived') {
            setClauses.push(`archived_at = $${paramIdx}`);
            params.push(new Date());
            paramIdx++;
            setClauses.push(`archived_by = $${paramIdx}`);
            params.push(req.user.id);
            paramIdx++;
        }

        if (completion_notes) {
            setClauses.push(`completion_notes = $${paramIdx}`);
            params.push(completion_notes);
            paramIdx++;
        }

        const result = await query(
            `UPDATE initiatives SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
            params
        );
        const _data = result.rows[0];

        if (!_data) {
            return res.status(404).json({ error: 'Initiative not found' });
        }

        res.json({
            message: `Initiative ${status} successfully`,
            initiative: _data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. GET ALL INITIATIVES (Admin - All statuses)
router.get('/admin/all', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { status } = req.query;

        let sql = 'SELECT * FROM initiatives';
        const params = [];

        if (status) {
            sql += ' WHERE status = $1';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);

        res.json({ initiatives: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. GET INITIATIVE DETAILS WITH CONTRIBUTIONS (Admin)
router.get('/:id/details', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        // Get initiative and donations in parallel
        const [initResult, donResult] = await Promise.all([
            query('SELECT * FROM initiatives WHERE id = $1', [id]),
            query(
                `SELECT d.*,
                    json_build_object(
                        'id', m.id,
                        'full_name', m.full_name,
                        'full_name_en', m.full_name_en,
                        'membership_number', m.membership_number
                    ) AS donor
                 FROM initiative_donations d
                 LEFT JOIN members m ON m.id = d.donor_member_id
                 WHERE d.initiative_id = $1
                 ORDER BY d.created_at DESC`,
                [id]
            )
        ]);

        const initiative = initResult.rows[0];
        if (!initiative) {
            return res.status(404).json({ error: 'Initiative not found' });
        }

        const donations = donResult.rows;

        // Calculate stats
        const totalDonations = donations.length;
        const uniqueDonors = new Set(donations.map(d => d.donor_member_id)).size;
        const approvedAmount = donations
            .filter(d => d.approved_by)
            .reduce((sum, d) => sum + parseFloat(d.amount), 0);

        res.json({
            initiative,
            donations,
            stats: {
                totalDonations,
                uniqueDonors,
                approvedAmount,
                progressPercentage: (approvedAmount / initiative.target_amount * 100).toFixed(2)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. APPROVE DONATION (Admin Only)
router.patch('/donations/:donationId/approve', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { donationId } = req.params;

        const result = await query(
            `UPDATE initiative_donations
             SET approved_by = $1, approval_date = $2
             WHERE id = $3
             RETURNING *`,
            [req.user.id, new Date(), donationId]
        );
        const _data = result.rows[0];

        if (!_data) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        // Trigger will auto-update initiative current_amount

        res.json({
            message: 'Donation approved successfully',
            donation: _data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. GET NON-CONTRIBUTORS FOR INITIATIVE (Admin Only)
router.get('/:id/non-contributors', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        log.info('[Non-Contributors] Fetching for initiative ID', { id });

        // Get all active members and all donors for this initiative in parallel
        const [membersResult, donationsResult] = await Promise.all([
            query(
                `SELECT id, member_id, full_name, full_name_en, email, phone, membership_number
                 FROM members
                 WHERE is_active = true AND membership_status = 'active'`
            ),
            query(
                'SELECT donor_member_id FROM initiative_donations WHERE initiative_id = $1',
                [id]
            )
        ]);

        const allMembers = membersResult.rows;
        const donations = donationsResult.rows;

        // Create set of donor member IDs for fast lookup
        const donorIds = new Set(donations.map(d => d.donor_member_id));

        // Filter members who haven't contributed
        const nonContributors = allMembers.filter(member => !donorIds.has(member.id));

        log.info('[Non-Contributors] Statistics', {
            totalActiveMembers: allMembers.length,
            totalDonors: donorIds.size,
            nonContributors: nonContributors.length
        });

        res.json({
            nonContributors,
            stats: {
                totalActiveMembers: allMembers.length,
                totalContributors: donorIds.size,
                totalNonContributors: nonContributors.length,
                contributionRate: ((donorIds.size / allMembers.length) * 100).toFixed(2)
            }
        });
    } catch (error) {
        log.error('[Non-Contributors] Error', { error: error.message });
        res.status(500).json({
            error: error.message,
            errorAr: 'خطأ في جلب الأعضاء غير المساهمين'
        });
    }
});

// 8. PUSH NOTIFICATION TO NON-CONTRIBUTORS (Admin Only)
router.post('/:id/notify-non-contributors', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        log.info('[Notify Non-Contributors] Starting for initiative ID', { id });

        // Get initiative details
        const initResult = await query(
            'SELECT * FROM initiatives WHERE id = $1',
            [id]
        );
        const initiative = initResult.rows[0];

        if (!initiative) {
            return res.status(404).json({
                error: 'Initiative not found',
                errorAr: 'المبادرة غير موجودة'
            });
        }

        // Get non-contributors using the same logic
        const [membersResult, donationsResult] = await Promise.all([
            query(
                `SELECT id, member_id, full_name, full_name_en, email, phone, membership_number
                 FROM members
                 WHERE is_active = true AND membership_status = 'active'`
            ),
            query(
                'SELECT donor_member_id FROM initiative_donations WHERE initiative_id = $1',
                [id]
            )
        ]);

        const allMembers = membersResult.rows;
        const donations = donationsResult.rows;

        const donorIds = new Set(donations.map(d => d.donor_member_id));
        const nonContributors = allMembers.filter(member => !donorIds.has(member.id));

        log.info('[Notify Non-Contributors] Found non-contributors', { count: nonContributors.length });

        if (nonContributors.length === 0) {
            return res.status(400).json({
                error: 'All active members have already contributed',
                errorAr: 'جميع الأعضاء النشطين قد ساهموا بالفعل'
            });
        }

        // Create ONE notification for admin to track this targeted broadcast
        await query(
            `INSERT INTO notifications
             (user_id, type, priority, title, title_ar, message, message_ar,
              related_id, related_type, icon, action_url, is_read, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                req.user.id,
                'initiative_reminder',
                'high',
                `تم إرسال تذكير لـ ${nonContributors.length} عضو غير مساهم`,
                `تم إرسال تذكير لـ ${nonContributors.length} عضو غير مساهم`,
                `تم إرسال تذكير بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${nonContributors.length} عضو لم يساهموا بعد`,
                `تم إرسال تذكير بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${nonContributors.length} عضو لم يساهموا بعد`,
                initiative.id,
                'initiative',
                '🔔',
                `/admin/initiatives/${initiative.id}/report`,
                false,
                JSON.stringify({
                    broadcast_to: nonContributors.length,
                    member_ids: nonContributors.map(m => m.id),
                    initiative_title: initiative.title_ar || initiative.title,
                    notification_type: 'non_contributor_reminder'
                })
            ]
        );

        log.info('[Notify Non-Contributors] Admin notification created successfully');

        res.json({
            message: `تم إرسال تذكير إلى ${nonContributors.length} عضو غير مساهم بنجاح`,
            recipient_count: nonContributors.length,
            contributionRate: ((donorIds.size / allMembers.length) * 100).toFixed(2)
        });
    } catch (error) {
        log.error('[Notify Non-Contributors] Error', { error: error.message });
        res.status(500).json({
            error: error.message,
            errorAr: 'فشل إرسال التذكير'
        });
    }
});

// 9. PUSH NOTIFICATION FOR INITIATIVE (Admin Only)
router.post('/:id/push-notification', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        log.info('[Push Notification] Starting for initiative ID', { id });

        // Get initiative details
        const initResult = await query(
            'SELECT * FROM initiatives WHERE id = $1',
            [id]
        );
        const initiative = initResult.rows[0];

        if (!initiative) {
            return res.status(404).json({
                error: 'Initiative not found',
                errorAr: 'المبادرة غير موجودة'
            });
        }

        // Get all active members
        const membersResult = await query(
            `SELECT id, member_id, email, phone, full_name
             FROM members
             WHERE is_active = true AND membership_status = 'active'`
        );
        const members = membersResult.rows;

        log.info('[Push Notification] Found active members', { count: members.length });

        if (!members || members.length === 0) {
            return res.status(400).json({
                error: 'No active members found',
                errorAr: 'لا يوجد أعضاء نشطين'
            });
        }

        // Create ONE notification for admin to track this broadcast
        // (Following exact news.js pattern)
        await query(
            `INSERT INTO notifications
             (user_id, type, priority, title, title_ar, message, message_ar,
              related_id, related_type, icon, action_url, is_read, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                req.user.id,
                'initiative_broadcast',
                'normal',
                `تم إرسال إشعار لـ ${members.length} عضو`,
                `تم إرسال إشعار لـ ${members.length} عضو`,
                `تم إرسال إشعار بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${members.length} عضو من أعضاء العائلة`,
                `تم إرسال إشعار بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${members.length} عضو من أعضاء العائلة`,
                initiative.id,
                'initiative',
                '📢',
                '/admin/initiatives',
                false,
                JSON.stringify({
                    broadcast_to: members.length,
                    member_ids: members.map(m => m.id),
                    initiative_title: initiative.title_ar || initiative.title
                })
            ]
        );

        log.info('[Push Notification] Admin notification created successfully');

        // In a real implementation, you would send push notifications via FCM/OneSignal here
        // For now, we're just tracking the broadcast in the admin notifications

        res.json({
            message: `تم إرسال الإشعار إلى ${members.length} عضو بنجاح`,
            recipient_count: members.length
        });
    } catch (error) {
        log.error('Push notification error', { error: error.message });
        res.status(500).json({
            error: error.message,
            errorAr: 'فشل إرسال الإشعار'
        });
    }
});

// ============================================
// MEMBER ENDPOINTS (Mobile App)
// ============================================

// 7. GET ACTIVE INITIATIVES (Members)
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM initiatives WHERE status = $1 ORDER BY start_date DESC',
            ['active']
        );

        // Calculate progress for each
        const initiativesWithProgress = result.rows.map(init => ({
            ...init,
            progress_percentage: (parseFloat(init.current_amount) / parseFloat(init.target_amount) * 100).toFixed(2)
        }));

        res.json({ initiatives: initiativesWithProgress });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. GET PREVIOUS INITIATIVES (Members - Completed/Archived)
router.get('/previous', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM initiatives WHERE status = ANY($1) ORDER BY end_date DESC LIMIT 50',
            [['completed', 'archived']]
        );

        res.json({ initiatives: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. CONTRIBUTE TO INITIATIVE (Members)
router.post('/:id/contribute', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_method, receipt_url } = req.body;

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );
        const userData = userResult.rows[0];

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        // Get initiative details
        const initResult = await query(
            'SELECT * FROM initiatives WHERE id = $1',
            [id]
        );
        const initiative = initResult.rows[0];

        if (!initiative) {
            return res.status(404).json({ error: 'Initiative not found' });
        }

        // Validation
        if (initiative.status !== 'active') {
            return res.status(400).json({ error: 'Initiative is not active' });
        }

        const contributionAmount = parseFloat(amount);

        if (initiative.min_contribution && contributionAmount < initiative.min_contribution) {
            return res.status(400).json({
                error: `Minimum contribution is ${initiative.min_contribution} SAR`
            });
        }

        if (initiative.max_contribution && contributionAmount > initiative.max_contribution) {
            return res.status(400).json({
                error: `Maximum contribution is ${initiative.max_contribution} SAR`
            });
        }

        // Create donation record
        const donResult = await query(
            `INSERT INTO initiative_donations
             (initiative_id, donor_member_id, amount, payment_method, receipt_url, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, userData.member_id, contributionAmount, payment_method || 'bank_transfer', receipt_url, new Date()]
        );
        const donation = donResult.rows[0];

        res.status(201).json({
            message: 'Contribution submitted successfully. Pending approval.',
            donation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 10. GET MY CONTRIBUTIONS (Members)
router.get('/my-contributions', authenticateToken, async (req, res) => {
    try {
        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );
        const userData = userResult.rows[0];

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const result = await query(
            `SELECT d.*,
                json_build_object(
                    'id', i.id,
                    'title_ar', i.title_ar,
                    'title_en', i.title_en,
                    'status', i.status
                ) AS initiative
             FROM initiative_donations d
             LEFT JOIN initiatives i ON i.id = d.initiative_id
             WHERE d.donor_member_id = $1
             ORDER BY d.created_at DESC`,
            [userData.member_id]
        );

        res.json({ contributions: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
