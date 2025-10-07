// ============================================
// INITIATIVES API - COMPLETE IMPLEMENTATION
// File: backend/routes/initiatives.js
// Purpose: Full CRUD + lifecycle management for initiatives
// ============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ============================================
// ADMIN ENDPOINTS
// ============================================

// 1. CREATE INITIATIVE (Admin Only)
router.post('/initiatives', authMiddleware, adminOnly, async (req, res) => {
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

        const { data, error } = await supabase
            .from('initiatives')
            .insert([{
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
                start_date: start_date || new Date(),
                end_date,
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
        console.error('Create initiative error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. UPDATE INITIATIVE (Admin Only)
router.put('/initiatives/:id', authMiddleware, adminOnly, async (req, res) => {
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

// 3. CHANGE INITIATIVE STATUS (Admin Only)
router.patch('/initiatives/:id/status', authMiddleware, adminOnly, async (req, res) => {
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
router.get('/initiatives/admin/all', authMiddleware, adminOnly, async (req, res) => {
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
router.get('/initiatives/:id/details', authMiddleware, adminOnly, async (req, res) => {
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
        const { data: donations, error: donError } = await supabase
            .from('initiative_donations')
            .select(`
                *,
                donor:members!donor_member_id(id, full_name_ar, full_name_en, member_number)
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
router.patch('/initiatives/donations/:donationId/approve', authMiddleware, adminOnly, async (req, res) => {
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

// ============================================
// MEMBER ENDPOINTS (Mobile App)
// ============================================

// 7. GET ACTIVE INITIATIVES (Members)
router.get('/initiatives/active', authMiddleware, async (req, res) => {
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
router.get('/initiatives/previous', authMiddleware, async (req, res) => {
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
router.post('/initiatives/:id/contribute', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_method, receipt_url } = req.body;

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
                donor_member_id: req.user.member_id,
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
router.get('/initiatives/my-contributions', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('initiative_donations')
            .select(`
                *,
                initiative:initiatives(id, title_ar, title_en, status)
            `)
            .eq('donor_member_id', req.user.member_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ contributions: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
