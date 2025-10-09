// ============================================
// INITIATIVES API - COMPLETE IMPLEMENTATION
// File: backend/routes/initiativesEnhanced.js
// Purpose: Full CRUD + lifecycle management for initiatives
// ============================================

import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// Helper function to check if user is admin
const isAdmin = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        // Accept both 'admin' and 'super_admin' roles
        return data?.role === 'admin' || data?.role === 'super_admin';
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

        const { data, error} = await supabase
            .from('initiatives')
            .insert([{
                title: title_ar || title_en || 'بدون عنوان', // Use title_ar as primary title, fallback to title_en or default
                title_ar,
                title_en,
                description_ar,
                description_en,
                beneficiary_name_ar,
                beneficiary_name_en,
                target_amount,
                current_amount: 0,
                min_contribution: min_contribution || 0,
                max_contribution,
                start_date: startDate,
                end_date: endDate,
                status: status || 'draft',
                created_by: req.user.id
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Initiative created successfully',
            initiative: data
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

        const { data, error } = await supabase
            .from('initiatives')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'Initiative updated successfully',
            initiative: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. DELETE INITIATIVE (Admin Only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('initiatives')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'Initiative deleted successfully',
            initiative: data
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

        const updateData = { status };

        if (status === 'archived') {
            updateData.archived_at = new Date();
            updateData.archived_by = req.user.id;
        }

        if (completion_notes) {
            updateData.completion_notes = completion_notes;
        }

        const { data, error } = await supabase
            .from('initiatives')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: `Initiative ${status} successfully`,
            initiative: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. GET ALL INITIATIVES (Admin - All statuses)
router.get('/admin/all', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabase
            .from('initiatives')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ initiatives: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. GET INITIATIVE DETAILS WITH CONTRIBUTIONS (Admin)
router.get('/:id/details', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        // Get initiative
        const { data: initiative, error: initError } = await supabase
            .from('initiatives')
            .select('*')
            .eq('id', id)
            .single();

        if (initError) throw initError;

        // Get all donations for this initiative
        const { data: donations, error: donError} = await supabase
            .from('initiative_donations')
            .select(`
                *,
                donor:members!donor_member_id(id, full_name, full_name_en, membership_number)
            `)
            .eq('initiative_id', id)
            .order('created_at', { ascending: false });

        if (donError) throw donError;

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

        const { data, error } = await supabase
            .from('initiative_donations')
            .update({
                approved_by: req.user.id,
                approval_date: new Date()
            })
            .eq('id', donationId)
            .select()
            .single();

        if (error) throw error;

        // Trigger will auto-update initiative current_amount

        res.json({
            message: 'Donation approved successfully',
            donation: data
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

        // Get all active members
        const { data: allMembers, error: membersError } = await supabase
            .from('members')
            .select('id, member_id, full_name, full_name_en, email, phone, membership_number')
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (membersError) {
            log.error('[Non-Contributors] Error fetching members', { error: membersError.message });
            throw membersError;
        }

        // Get all donors for this initiative
        const { data: donations, error: donError } = await supabase
            .from('initiative_donations')
            .select('donor_member_id')
            .eq('initiative_id', id);

        if (donError) {
            log.error('[Non-Contributors] Error fetching donations', { error: donError.message });
            throw donError;
        }

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
        const { data: initiative, error: initError } = await supabase
            .from('initiatives')
            .select('*')
            .eq('id', id)
            .single();

        if (initError) {
            log.error('[Notify Non-Contributors] Initiative not found', { error: initError.message });
            throw initError;
        }

        // Get non-contributors using the same logic
        const { data: allMembers, error: membersError } = await supabase
            .from('members')
            .select('id, member_id, full_name, full_name_en, email, phone, membership_number')
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (membersError) throw membersError;

        const { data: donations, error: donError } = await supabase
            .from('initiative_donations')
            .select('donor_member_id')
            .eq('initiative_id', id);

        if (donError) throw donError;

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
        const adminNotification = {
            user_id: req.user.id,
            type: 'initiative_reminder',
            priority: 'high',
            title: `تم إرسال تذكير لـ ${nonContributors.length} عضو غير مساهم`,
            title_ar: `تم إرسال تذكير لـ ${nonContributors.length} عضو غير مساهم`,
            message: `تم إرسال تذكير بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${nonContributors.length} عضو لم يساهموا بعد`,
            message_ar: `تم إرسال تذكير بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${nonContributors.length} عضو لم يساهموا بعد`,
            related_id: initiative.id,
            related_type: 'initiative',
            icon: '🔔',
            action_url: `/admin/initiatives/${initiative.id}/report`,
            is_read: false,
            metadata: {
                broadcast_to: nonContributors.length,
                member_ids: nonContributors.map(m => m.id),
                initiative_title: initiative.title_ar || initiative.title,
                notification_type: 'non_contributor_reminder'
            }
        };

        const { error: notifError } = await supabase
            .from('notifications')
            .insert([adminNotification]);

        if (notifError) {
            log.error('[Notify Non-Contributors] Error creating notification', { error: notifError.message });
            throw notifError;
        }

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
        const { data: initiative, error: initError } = await supabase
            .from('initiatives')
            .select('*')
            .eq('id', id)
            .single();

        if (initError) {
            log.error('[Push Notification] Initiative not found', { error: initError.message });
            throw initError;
        }

        if (!initiative) {
            return res.status(404).json({
                error: 'Initiative not found',
                errorAr: 'المبادرة غير موجودة'
            });
        }

        // Get all active members
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, member_id, email, phone, full_name')
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (membersError) {
            log.error('[Push Notification] Error fetching members', { error: membersError.message });
            throw membersError;
        }

        log.info('[Push Notification] Found active members', { count: members.length });

        if (!members || members.length === 0) {
            return res.status(400).json({
                error: 'No active members found',
                errorAr: 'لا يوجد أعضاء نشطين'
            });
        }

        // Create ONE notification for admin to track this broadcast
        // (Following exact news.js pattern)
        const adminNotification = {
            user_id: req.user.id,  // Admin who sent the notification
            type: 'initiative_broadcast',
            priority: 'normal',
            title: `تم إرسال إشعار لـ ${members.length} عضو`,
            title_ar: `تم إرسال إشعار لـ ${members.length} عضو`,
            message: `تم إرسال إشعار بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${members.length} عضو من أعضاء العائلة`,
            message_ar: `تم إرسال إشعار بالمبادرة "${initiative.title_ar || initiative.title}" إلى ${members.length} عضو من أعضاء العائلة`,
            related_id: initiative.id,
            related_type: 'initiative',
            icon: '📢',
            action_url: `/admin/initiatives`,
            is_read: false,
            metadata: {
                broadcast_to: members.length,
                member_ids: members.map(m => m.id),
                initiative_title: initiative.title_ar || initiative.title
            }
        };

        const { error: notifError } = await supabase
            .from('notifications')
            .insert([adminNotification]);

        if (notifError) {
            log.error('[Push Notification] Error creating admin notification', { error: notifError.message });
            throw notifError;
        }

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
        const { data, error } = await supabase
            .from('initiatives')
            .select('*')
            .eq('status', 'active')
            .order('start_date', { ascending: false });

        if (error) throw error;

        // Calculate progress for each
        const initiativesWithProgress = data.map(init => ({
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
        const { data, error } = await supabase
            .from('initiatives')
            .select('*')
            .in('status', ['completed', 'archived'])
            .order('end_date', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ initiatives: data });
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
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        // Get initiative details
        const { data: initiative, error: initError } = await supabase
            .from('initiatives')
            .select('*')
            .eq('id', id)
            .single();

        if (initError) throw initError;

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
        const { data: donation, error: donError } = await supabase
            .from('initiative_donations')
            .insert([{
                initiative_id: id,
                donor_member_id: userData.member_id,
                amount: contributionAmount,
                payment_method: payment_method || 'bank_transfer',
                receipt_url,
                payment_date: new Date()
            }])
            .select()
            .single();

        if (donError) throw donError;

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
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const { data, error } = await supabase
            .from('initiative_donations')
            .select(`
                *,
                initiative:initiatives(id, title_ar, title_en, status)
            `)
            .eq('donor_member_id', userData.member_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ contributions: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;