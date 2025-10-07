# 🎯 MISSION #1: INITIATIVES MANAGEMENT SYSTEM
## **Code Name: "FALCON" - Financial Initiative Tracking & Collection System**

**Status:** MISSION CRITICAL  
**Timeline:** 5 Working Days  
**Complexity:** Medium  
**Priority:** HIGH ⭐⭐⭐⭐  
**Target Users:** 344 Active Families  

---

## 🚀 MISSION BRIEFING

You are elite engineering agents tasked with building a world-class optional fundraising system for the Al-Shuail Family Management System. This is not just a feature—this is a precision-engineered financial transparency platform that will enable charitable initiatives, community projects, and emergency funds with full accountability.

**Your Challenge:** Transform a simple concept into a production-ready system that handles real money, tracks contributions from 344 families, and provides crystal-clear transparency. Every line of code you write will be used by real people contributing real money to real causes.

**The Standard:** This must feel like it was built by a Silicon Valley fintech startup. Clean, modern, trustworthy, and bulletproof.

---

## 📋 BUSINESS REQUIREMENTS (From Arabic Scope Section 5)

### **Core Requirements:**
1. ✅ Initiatives are **OPTIONAL** (not mandatory like subscriptions)
2. ✅ Set minimum and maximum contribution amounts per member
3. ✅ Start and end dates (optional - initiatives can run indefinitely)
4. ✅ Secretary can terminate or reopen initiatives at any time
5. ✅ Archive system for completed initiatives (hide from mobile, preserve history)
6. ✅ Document total amount collected after completion
7. ✅ Display active initiatives in mobile app for member participation
8. ✅ Show past initiatives in "Previous Initiatives" section
9. ✅ Full audit trail of all contributions
10. ✅ Support for partial payments (members can contribute multiple times)

---

## 🗄️ DATABASE SCHEMA (ALREADY EXISTS)

**CRITICAL:** These tables are already in your Supabase database. DO NOT CREATE THEM AGAIN.

```sql
-- TABLE 1: initiatives
CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    min_contribution DECIMAL(10,2),
    max_contribution DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active', -- active, completed, archived
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    terminated_at TIMESTAMP,
    terminated_by UUID REFERENCES users(id),
    archived_at TIMESTAMP,
    archived_by UUID REFERENCES users(id)
);

-- TABLE 2: initiative_donations
CREATE TABLE initiative_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    donor_member_id UUID REFERENCES members(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT, -- bank_transfer, cash, online
    receipt_image_url TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 3: initiative_volunteers
CREATE TABLE initiative_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    volunteer_member_id UUID REFERENCES members(id),
    role TEXT, -- organizer, coordinator, helper
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id)
);
```

**What You Need to Add:**

```sql
-- Add these columns if they don't exist
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS total_contributors INTEGER DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS category TEXT; -- charity, emergency, project, social

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiative_donations_initiative_id ON initiative_donations(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_donations_donor ON initiative_donations(donor_member_id);
```

---

## 👥 AGENT TASK DISTRIBUTION

---

## 🔧 AGENT 1: BACKEND ENGINEER - API DEVELOPMENT
**Timeline:** 2 Days  
**Skill Required:** Node.js, Express, PostgreSQL, JWT Authentication  
**Mission:** Build bulletproof backend API with 10 endpoints

---

### **TASK 1.1: Project Setup & Dependencies** (30 minutes)

**File:** `backend/routes/initiatives.js`

```javascript
// Install required packages first:
// npm install express pg jsonwebtoken multer sharp

const express = require('express');
const router = express.Router();
const { authenticateUser, checkRole } = require('../middleware/auth');
const initiativesController = require('../controllers/initiativesController');
const upload = require('../middleware/uploadMiddleware');

// ========================================
// ADMIN ROUTES (Secretary/Authorized Staff Only)
// ========================================
router.post('/initiatives', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary', 'initiatives_manager']),
    initiativesController.createInitiative
);

router.put('/initiatives/:id', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary', 'initiatives_manager']),
    initiativesController.updateInitiative
);

router.get('/initiatives', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary', 'initiatives_manager']),
    initiativesController.getAllInitiatives
);

router.get('/initiatives/:id', 
    authenticateUser,
    initiativesController.getInitiativeDetails
);

router.post('/initiatives/:id/terminate', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary']),
    initiativesController.terminateInitiative
);

router.post('/initiatives/:id/reopen', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary']),
    initiativesController.reopenInitiative
);

router.post('/initiatives/:id/archive', 
    authenticateUser, 
    checkRole(['super_admin', 'secretary']),
    initiativesController.archiveInitiative
);

router.get('/initiatives/:id/contributions',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'initiatives_manager']),
    initiativesController.getInitiativeContributions
);

router.put('/initiatives/:id/contributions/:contribution_id/approve',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'initiatives_manager']),
    initiativesController.approveContribution
);

// ========================================
// MEMBER ROUTES (Mobile App)
// ========================================
router.get('/mobile/initiatives/active', 
    authenticateUser,
    initiativesController.getMobileActiveInitiatives
);

router.post('/mobile/initiatives/:id/contribute', 
    authenticateUser,
    upload.single('receipt'),
    initiativesController.contribute
);

router.get('/mobile/initiatives/my-contributions', 
    authenticateUser,
    initiativesController.getMyContributions
);

router.get('/mobile/initiatives/previous',
    authenticateUser,
    initiativesController.getPreviousInitiatives
);

module.exports = router;
```

---

### **TASK 1.2: Controller Implementation** (1 day)

**File:** `backend/controllers/initiativesController.js`

```javascript
const pool = require('../config/database');

// ========================================
// HELPER FUNCTIONS
// ========================================

const calculateProgress = async (initiativeId) => {
    const result = await pool.query(`
        UPDATE initiatives 
        SET 
            current_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM initiative_donations 
                WHERE initiative_id = $1 AND status = 'approved'
            ),
            total_contributors = (
                SELECT COUNT(DISTINCT donor_member_id) 
                FROM initiative_donations 
                WHERE initiative_id = $1 AND status = 'approved'
            ),
            progress_percentage = CASE 
                WHEN target_amount > 0 THEN 
                    (current_amount / target_amount * 100)
                ELSE 0 
            END
        WHERE id = $1
        RETURNING *
    `, [initiativeId]);
    
    return result.rows[0];
};

const validateContributionAmount = async (initiativeId, amount) => {
    const result = await pool.query(
        'SELECT min_contribution, max_contribution FROM initiatives WHERE id = $1',
        [initiativeId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Initiative not found');
    }
    
    const { min_contribution, max_contribution } = result.rows[0];
    
    if (min_contribution && amount < min_contribution) {
        return {
            valid: false,
            message_ar: `الحد الأدنى للمساهمة هو ${min_contribution} ريال`,
            message_en: `Minimum contribution is ${min_contribution} SAR`
        };
    }
    
    if (max_contribution && amount > max_contribution) {
        return {
            valid: false,
            message_ar: `الحد الأقصى للمساهمة هو ${max_contribution} ريال`,
            message_en: `Maximum contribution is ${max_contribution} SAR`
        };
    }
    
    return { valid: true };
};

// ========================================
// ADMIN CONTROLLERS
// ========================================

exports.createInitiative = async (req, res) => {
    try {
        const {
            title_ar,
            title_en,
            description_ar,
            description_en,
            target_amount,
            min_contribution,
            max_contribution,
            start_date,
            end_date,
            category,
            image_url
        } = req.body;
        
        const created_by = req.user.id;
        
        // Validation
        if (!title_ar || !title_en || !target_amount) {
            return res.status(400).json({
                success: false,
                message: 'Title (Arabic & English) and target amount are required'
            });
        }
        
        if (target_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Target amount must be greater than 0'
            });
        }
        
        if (min_contribution && max_contribution && min_contribution > max_contribution) {
            return res.status(400).json({
                success: false,
                message: 'Minimum contribution cannot be greater than maximum'
            });
        }
        
        // Insert initiative
        const result = await pool.query(`
            INSERT INTO initiatives (
                title_ar, title_en, description_ar, description_en,
                target_amount, min_contribution, max_contribution,
                start_date, end_date, category, image_url, created_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
            RETURNING *
        `, [
            title_ar, title_en, description_ar, description_en,
            target_amount, min_contribution, max_contribution,
            start_date, end_date, category, image_url, created_by
        ]);
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'initiative_created', $2)
        `, [created_by, JSON.stringify({ initiative_id: result.rows[0].id })]);
        
        res.status(201).json({
            success: true,
            message_ar: 'تم إنشاء المبادرة بنجاح',
            message_en: 'Initiative created successfully',
            initiative: result.rows[0]
        });
        
    } catch (error) {
        console.error('Create initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create initiative',
            error: error.message
        });
    }
};

exports.updateInitiative = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updated_by = req.user.id;
        
        // Build dynamic UPDATE query
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        for (const [key, value] of Object.entries(updates)) {
            if (['title_ar', 'title_en', 'description_ar', 'description_en', 
                 'target_amount', 'min_contribution', 'max_contribution',
                 'start_date', 'end_date', 'category', 'image_url'].includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }
        
        fields.push(`updated_at = NOW()`);
        values.push(id);
        
        const result = await pool.query(`
            UPDATE initiatives 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Initiative not found'
            });
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'initiative_updated', $2)
        `, [updated_by, JSON.stringify({ initiative_id: id, changes: updates })]);
        
        res.json({
            success: true,
            message_ar: 'تم تحديث المبادرة بنجاح',
            message_en: 'Initiative updated successfully',
            initiative: result.rows[0]
        });
        
    } catch (error) {
        console.error('Update initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update initiative',
            error: error.message
        });
    }
};

exports.getAllInitiatives = async (req, res) => {
    try {
        const { status, category, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                i.*,
                u.full_name as created_by_name,
                COALESCE(i.current_amount, 0) as current_amount,
                COALESCE(i.total_contributors, 0) as total_contributors,
                CASE 
                    WHEN i.end_date IS NOT NULL THEN 
                        EXTRACT(DAY FROM (i.end_date - CURRENT_DATE))
                    ELSE NULL 
                END as days_remaining
            FROM initiatives i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;
        
        if (status) {
            query += ` AND i.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        
        if (category) {
            query += ` AND i.category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        query += ` ORDER BY i.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        // Get statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'archived') as archived,
                COALESCE(SUM(current_amount), 0) as total_collected,
                COUNT(DISTINCT 
                    (SELECT donor_member_id FROM initiative_donations WHERE initiative_id = initiatives.id)
                ) as total_contributors
            FROM initiatives
        `);
        
        res.json({
            success: true,
            initiatives: result.rows,
            statistics: statsResult.rows[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: statsResult.rows[0].total
            }
        });
        
    } catch (error) {
        console.error('Get all initiatives error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch initiatives',
            error: error.message
        });
    }
};

exports.getInitiativeDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get initiative details
        const initiativeResult = await pool.query(`
            SELECT 
                i.*,
                u.full_name as created_by_name,
                CASE 
                    WHEN i.end_date IS NOT NULL THEN 
                        EXTRACT(DAY FROM (i.end_date - CURRENT_DATE))
                    ELSE NULL 
                END as days_remaining
            FROM initiatives i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.id = $1
        `, [id]);
        
        if (initiativeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Initiative not found'
            });
        }
        
        // Get contributors
        const contributorsResult = await pool.query(`
            SELECT 
                id.id,
                id.amount,
                id.payment_method,
                id.receipt_image_url,
                id.notes,
                id.status,
                id.created_at,
                m.full_name_ar as member_name_ar,
                m.full_name_en as member_name_en,
                m.member_number
            FROM initiative_donations id
            JOIN members m ON id.donor_member_id = m.id
            WHERE id.initiative_id = $1
            ORDER BY id.created_at DESC
        `, [id]);
        
        // Get volunteers
        const volunteersResult = await pool.query(`
            SELECT 
                iv.role,
                m.full_name_ar as member_name_ar,
                m.full_name_en as member_name_en,
                m.member_number,
                iv.assigned_at
            FROM initiative_volunteers iv
            JOIN members m ON iv.volunteer_member_id = m.id
            WHERE iv.initiative_id = $1
        `, [id]);
        
        // Calculate statistics
        const statsResult = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_collected,
                COUNT(*) as total_contributions,
                COUNT(DISTINCT donor_member_id) as total_contributors,
                MAX(amount) as highest_contribution,
                AVG(amount) as average_contribution
            FROM initiative_donations
            WHERE initiative_id = $1 AND status = 'approved'
        `, [id]);
        
        res.json({
            success: true,
            initiative: initiativeResult.rows[0],
            contributors: contributorsResult.rows,
            volunteers: volunteersResult.rows,
            statistics: statsResult.rows[0]
        });
        
    } catch (error) {
        console.error('Get initiative details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch initiative details',
            error: error.message
        });
    }
};

exports.terminateInitiative = async (req, res) => {
    try {
        const { id } = req.params;
        const terminated_by = req.user.id;
        
        const result = await pool.query(`
            UPDATE initiatives 
            SET 
                status = 'completed',
                terminated_at = NOW(),
                terminated_by = $1
            WHERE id = $2 AND status = 'active'
            RETURNING *
        `, [terminated_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Initiative not found or already terminated'
            });
        }
        
        // Recalculate final amount
        await calculateProgress(id);
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'initiative_terminated', $2)
        `, [terminated_by, JSON.stringify({ 
            initiative_id: id, 
            final_amount: result.rows[0].current_amount 
        })]);
        
        res.json({
            success: true,
            message_ar: 'تم إنهاء المبادرة بنجاح',
            message_en: 'Initiative terminated successfully',
            final_amount: result.rows[0].current_amount
        });
        
    } catch (error) {
        console.error('Terminate initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to terminate initiative',
            error: error.message
        });
    }
};

exports.reopenInitiative = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            UPDATE initiatives 
            SET 
                status = 'active',
                terminated_at = NULL,
                terminated_by = NULL,
                updated_at = NOW()
            WHERE id = $1 AND status = 'completed'
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Initiative not found or not in completed status'
            });
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'initiative_reopened', $2)
        `, [req.user.id, JSON.stringify({ initiative_id: id })]);
        
        res.json({
            success: true,
            message_ar: 'تم إعادة فتح المبادرة بنجاح',
            message_en: 'Initiative reopened successfully',
            initiative: result.rows[0]
        });
        
    } catch (error) {
        console.error('Reopen initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reopen initiative',
            error: error.message
        });
    }
};

exports.archiveInitiative = async (req, res) => {
    try {
        const { id } = req.params;
        const archived_by = req.user.id;
        
        const result = await pool.query(`
            UPDATE initiatives 
            SET 
                status = 'archived',
                archived_at = NOW(),
                archived_by = $1
            WHERE id = $2 AND status = 'completed'
            RETURNING *
        `, [archived_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Initiative not found or not in completed status'
            });
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'initiative_archived', $2)
        `, [archived_by, JSON.stringify({ initiative_id: id })]);
        
        res.json({
            success: true,
            message_ar: 'تم أرشفة المبادرة بنجاح',
            message_en: 'Initiative archived successfully'
        });
        
    } catch (error) {
        console.error('Archive initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to archive initiative',
            error: error.message
        });
    }
};

exports.getInitiativeContributions = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                id.id,
                id.amount,
                id.payment_method,
                id.receipt_image_url,
                id.notes,
                id.status,
                id.created_at,
                id.approved_at,
                m.full_name_ar as member_name_ar,
                m.full_name_en as member_name_en,
                m.member_number,
                m.phone,
                u.full_name as approved_by_name
            FROM initiative_donations id
            JOIN members m ON id.donor_member_id = m.id
            LEFT JOIN users u ON id.approved_by = u.id
            WHERE id.initiative_id = $1
        `;
        
        const params = [id];
        let paramCount = 2;
        
        if (status) {
            query += ` AND id.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY id.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        // Get count
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM initiative_donations
            WHERE initiative_id = $1 ${status ? 'AND status = $2' : ''}
        `, status ? [id, status] : [id]);
        
        res.json({
            success: true,
            contributions: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: parseInt(countResult.rows[0].total)
            }
        });
        
    } catch (error) {
        console.error('Get contributions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contributions',
            error: error.message
        });
    }
};

exports.approveContribution = async (req, res) => {
    try {
        const { id, contribution_id } = req.params;
        const approved_by = req.user.id;
        const { status } = req.body; // 'approved' or 'rejected'
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either approved or rejected'
            });
        }
        
        const result = await pool.query(`
            UPDATE initiative_donations 
            SET 
                status = $1,
                approved_by = $2,
                approved_at = NOW()
            WHERE id = $3 AND initiative_id = $4 AND status = 'pending'
            RETURNING *
        `, [status, approved_by, contribution_id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contribution not found or already processed'
            });
        }
        
        // Recalculate initiative progress
        if (status === 'approved') {
            await calculateProgress(id);
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'contribution_${status}', $2)
        `, [approved_by, JSON.stringify({ 
            initiative_id: id, 
            contribution_id,
            amount: result.rows[0].amount
        })]);
        
        res.json({
            success: true,
            message_ar: status === 'approved' ? 'تم الموافقة على المساهمة' : 'تم رفض المساهمة',
            message_en: status === 'approved' ? 'Contribution approved' : 'Contribution rejected',
            contribution: result.rows[0]
        });
        
    } catch (error) {
        console.error('Approve contribution error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contribution status',
            error: error.message
        });
    }
};

// ========================================
// MOBILE CONTROLLERS
// ========================================

exports.getMobileActiveInitiatives = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.id,
                i.title_ar,
                i.title_en,
                i.description_ar,
                i.description_en,
                i.target_amount,
                i.current_amount,
                i.min_contribution,
                i.max_contribution,
                i.start_date,
                i.end_date,
                i.category,
                i.image_url,
                i.progress_percentage,
                i.total_contributors,
                CASE 
                    WHEN i.end_date IS NOT NULL THEN 
                        EXTRACT(DAY FROM (i.end_date - CURRENT_DATE))
                    ELSE NULL 
                END as days_remaining,
                CASE 
                    WHEN i.end_date < CURRENT_DATE THEN true
                    ELSE false
                END as is_expired
            FROM initiatives i
            WHERE i.status = 'active'
            ORDER BY i.created_at DESC
        `);
        
        res.json({
            success: true,
            initiatives: result.rows
        });
        
    } catch (error) {
        console.error('Get mobile initiatives error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch initiatives',
            error: error.message
        });
    }
};

exports.contribute = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_method, notes } = req.body;
        const donor_member_id = req.user.member_id; // From JWT token
        
        // Get member ID if not in token
        let memberId = donor_member_id;
        if (!memberId) {
            const memberResult = await pool.query(
                'SELECT id FROM members WHERE phone = $1 OR email = $2',
                [req.user.phone, req.user.email]
            );
            
            if (memberResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member profile not found'
                });
            }
            memberId = memberResult.rows[0].id;
        }
        
        // Validate initiative is active
        const initiativeResult = await pool.query(
            'SELECT * FROM initiatives WHERE id = $1 AND status = $active',
            [id]
        );
        
        if (initiativeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message_ar: 'المبادرة غير موجودة أو غير نشطة',
                message_en: 'Initiative not found or not active'
            });
        }
        
        // Validate amount
        const validation = await validateContributionAmount(id, amount);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                ...validation
            });
        }
        
        // Handle receipt upload if provided
        let receipt_image_url = null;
        if (req.file) {
            // Upload to storage (Supabase Storage or AWS S3)
            receipt_image_url = await uploadReceipt(req.file);
        }
        
        // Insert contribution
        const result = await pool.query(`
            INSERT INTO initiative_donations (
                initiative_id,
                donor_member_id,
                amount,
                payment_method,
                receipt_image_url,
                notes,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *
        `, [id, memberId, amount, payment_method, receipt_image_url, notes]);
        
        res.status(201).json({
            success: true,
            message_ar: 'شكراً لمساهمتك! سيتم مراجعة الدفعة قريباً',
            message_en: 'Thank you for your contribution! Payment will be reviewed soon',
            contribution_id: result.rows[0].id,
            status: 'pending'
        });
        
    } catch (error) {
        console.error('Contribute error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process contribution',
            error: error.message
        });
    }
};

exports.getMyContributions = async (req, res) => {
    try {
        const donor_member_id = req.user.member_id;
        
        // Get member ID if not in token
        let memberId = donor_member_id;
        if (!memberId) {
            const memberResult = await pool.query(
                'SELECT id FROM members WHERE phone = $1 OR email = $2',
                [req.user.phone, req.user.email]
            );
            
            if (memberResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member profile not found'
                });
            }
            memberId = memberResult.rows[0].id;
        }
        
        const result = await pool.query(`
            SELECT 
                id.id,
                id.amount,
                id.payment_method,
                id.receipt_image_url,
                id.notes,
                id.status,
                id.created_at,
                id.approved_at,
                i.title_ar as initiative_title_ar,
                i.title_en as initiative_title_en,
                i.status as initiative_status
            FROM initiative_donations id
            JOIN initiatives i ON id.initiative_id = i.id
            WHERE id.donor_member_id = $1
            ORDER BY id.created_at DESC
        `, [memberId]);
        
        // Calculate total contributed
        const totalResult = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_contributed,
                COUNT(*) as total_contributions,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_contributions
            FROM initiative_donations
            WHERE donor_member_id = $1
        `, [memberId]);
        
        res.json({
            success: true,
            contributions: result.rows,
            statistics: totalResult.rows[0]
        });
        
    } catch (error) {
        console.error('Get my contributions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contributions',
            error: error.message
        });
    }
};

exports.getPreviousInitiatives = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.id,
                i.title_ar,
                i.title_en,
                i.description_ar,
                i.description_en,
                i.target_amount,
                i.current_amount,
                i.image_url,
                i.progress_percentage,
                i.total_contributors,
                i.start_date,
                i.end_date,
                i.terminated_at,
                i.category
            FROM initiatives i
            WHERE i.status = 'completed'
            ORDER BY i.terminated_at DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            previous_initiatives: result.rows
        });
        
    } catch (error) {
        console.error('Get previous initiatives error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch previous initiatives',
            error: error.message
        });
    }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const uploadReceipt = async (file) => {
    // TODO: Implement actual upload to Supabase Storage or AWS S3
    // For now, return placeholder
    return `/uploads/receipts/${Date.now()}_${file.originalname}`;
};
```

---

### **TASK 1.3: Testing with Postman** (2 hours)

Create Postman collection with these tests:

```json
{
  "info": {
    "name": "Initiatives API Tests",
    "description": "Complete test suite for initiatives management"
  },
  "item": [
    {
      "name": "Admin - Create Initiative",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "url": "{{base_url}}/api/initiatives",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title_ar\": \"مبادرة خيرية للأيتام\",\n  \"title_en\": \"Charity Initiative for Orphans\",\n  \"description_ar\": \"جمع تبرعات لدعم الأيتام\",\n  \"description_en\": \"Collecting donations to support orphans\",\n  \"target_amount\": 50000,\n  \"min_contribution\": 100,\n  \"max_contribution\": 10000,\n  \"category\": \"charity\"\n}"
        }
      }
    },
    {
      "name": "Admin - Get All Initiatives",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/initiatives?status=active&limit=20"
      }
    },
    {
      "name": "Mobile - Get Active Initiatives",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/mobile/initiatives/active"
      }
    },
    {
      "name": "Mobile - Contribute to Initiative",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{member_token}}"
          }
        ],
        "url": "{{base_url}}/api/mobile/initiatives/{{initiative_id}}/contribute",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"amount\": 500,\n  \"payment_method\": \"bank_transfer\",\n  \"notes\": \"تبرع من القلب\"\n}"
        }
      }
    }
  ]
}
```

**Test Checklist:**
- [ ] Create initiative with all fields
- [ ] Create initiative with minimal fields
- [ ] Validate min/max contribution rules
- [ ] Test permission system (admin vs member)
- [ ] Contribute to active initiative
- [ ] Try contributing below minimum amount (should fail)
- [ ] Try contributing above maximum amount (should fail)
- [ ] Terminate initiative
- [ ] Reopen terminated initiative
- [ ] Archive completed initiative
- [ ] Get mobile active initiatives
- [ ] Get member's contribution history

**Agent 1 Deliverable:** ✅ 13 fully functional API endpoints + Postman collection

---

## 🎨 AGENT 2: FRONTEND ENGINEER - ADMIN DASHBOARD
**Timeline:** 2 Days  
**Skill Required:** React.js, Chakra UI, API Integration  
**Mission:** Build beautiful, intuitive admin interface

---

### **TASK 2.1: Initiatives List Page** (4 hours)

**File:** `frontend/src/pages/admin/InitiativesPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  ButtonGroup,
  Input,
  InputGroup,
  InputLeftElement,
  Select
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiEdit,
  FiArchive,
  FiCheck,
  FiX,
  FiEye,
  FiTarget,
  FiDollarSign,
  FiUsers,
  FiActivity,
  FiSearch
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CreateInitiativeModal from '../../components/initiatives/CreateInitiativeModal';
import EditInitiativeModal from '../../components/initiatives/EditInitiativeModal';

const InitiativesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  // State management
  const [initiatives, setInitiatives] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    archived: 0,
    total_collected: 0,
    total_contributors: 0
  });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  // Fetch initiatives
  useEffect(() => {
    fetchInitiatives();
  }, [filter]);

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/initiatives', { params });
      
      setInitiatives(response.data.initiatives);
      setStatistics(response.data.statistics);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المبادرات',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async (id) => {
    if (!window.confirm('هل أنت متأكد من إنهاء هذه المبادرة؟')) return;

    try {
      await api.post(`/initiatives/${id}/terminate`);
      toast({
        title: 'تم الإنهاء',
        description: 'تم إنهاء المبادرة بنجاح',
        status: 'success',
        duration: 3000
      });
      fetchInitiatives();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.message || 'فشل في إنهاء المبادرة',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleReopen = async (id) => {
    try {
      await api.post(`/initiatives/${id}/reopen`);
      toast({
        title: 'تم إعادة الفتح',
        description: 'تم إعادة فتح المبادرة بنجاح',
        status: 'success',
        duration: 3000
      });
      fetchInitiatives();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إعادة فتح المبادرة',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('هل أنت متأكد من أرشفة هذه المبادرة؟')) return;

    try {
      await api.post(`/initiatives/${id}/archive`);
      toast({
        title: 'تم الأرشفة',
        description: 'تم أرشفة المبادرة بنجاح',
        status: 'success',
        duration: 3000
      });
      fetchInitiatives();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في أرشفة المبادرة',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleEdit = (initiative) => {
    setSelectedInitiative(initiative);
    onEditOpen();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { colorScheme: 'green', text: 'نشطة' },
      completed: { colorScheme: 'blue', text: 'مكتملة' },
      archived: { colorScheme: 'gray', text: 'أرشيف' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge colorScheme={config.colorScheme}>{config.text}</Badge>;
  };

  const filteredInitiatives = initiatives.filter(initiative =>
    initiative.title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
    initiative.title_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box p={6} dir="rtl">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">إدارة المبادرات</Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="green"
          onClick={onCreateOpen}
        >
          إضافة مبادرة جديدة
        </Button>
      </Flex>

      {/* Statistics Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Stat
          p={4}
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          borderRight="4px solid"
          borderColor="blue.500"
        >
          <Flex align="center" justify="space-between">
            <Box>
              <StatLabel color="gray.600">إجمالي المبادرات</StatLabel>
              <StatNumber fontSize="2xl">{statistics.total}</StatNumber>
            </Box>
            <Icon as={FiTarget} boxSize={8} color="blue.500" />
          </Flex>
        </Stat>

        <Stat
          p={4}
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          borderRight="4px solid"
          borderColor="green.500"
        >
          <Flex align="center" justify="space-between">
            <Box>
              <StatLabel color="gray.600">المبلغ المحصل</StatLabel>
              <StatNumber fontSize="2xl">
                {(statistics.total_collected || 0).toLocaleString()}
              </StatNumber>
              <StatHelpText>ريال سعودي</StatHelpText>
            </Box>
            <Icon as={FiDollarSign} boxSize={8} color="green.500" />
          </Flex>
        </Stat>

        <Stat
          p={4}
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          borderRight="4px solid"
          borderColor="purple.500"
        >
          <Flex align="center" justify="space-between">
            <Box>
              <StatLabel color="gray.600">إجمالي المساهمين</StatLabel>
              <StatNumber fontSize="2xl">{statistics.total_contributors || 0}</StatNumber>
            </Box>
            <Icon as={FiUsers} boxSize={8} color="purple.500" />
          </Flex>
        </Stat>

        <Stat
          p={4}
          bg="white"
          borderRadius="md"
          boxShadow="sm"
          borderRight="4px solid"
          borderColor="orange.500"
        >
          <Flex align="center" justify="space-between">
            <Box>
              <StatLabel color="gray.600">المبادرات النشطة</StatLabel>
              <StatNumber fontSize="2xl">{statistics.active || 0}</StatNumber>
            </Box>
            <Icon as={FiActivity} boxSize={8} color="orange.500" />
          </Flex>
        </Stat>
      </SimpleGrid>

      {/* Filters and Search */}
      <Flex gap={4} mb={4} wrap="wrap">
        <ButtonGroup isAttached variant="outline">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'solid' : 'outline'}
            colorScheme={filter === 'all' ? 'blue' : 'gray'}
          >
            الكل ({statistics.total})
          </Button>
          <Button
            onClick={() => setFilter('active')}
            variant={filter === 'active' ? 'solid' : 'outline'}
            colorScheme={filter === 'active' ? 'green' : 'gray'}
          >
            نشطة ({statistics.active})
          </Button>
          <Button
            onClick={() => setFilter('completed')}
            variant={filter === 'completed' ? 'solid' : 'outline'}
            colorScheme={filter === 'completed' ? 'blue' : 'gray'}
          >
            مكتملة ({statistics.completed})
          </Button>
          <Button
            onClick={() => setFilter('archived')}
            variant={filter === 'archived' ? 'solid' : 'outline'}
            colorScheme={filter === 'archived' ? 'gray' : 'gray'}
          >
            أرشيف ({statistics.archived})
          </Button>
        </ButtonGroup>

        <InputGroup maxW="300px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="بحث عن مبادرة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </Flex>

      {/* Initiatives Table */}
      <Box bg="white" borderRadius="md" boxShadow="sm" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>اسم المبادرة</Th>
              <Th>الهدف المالي</Th>
              <Th>المبلغ المحصل</Th>
              <Th>التقدم</Th>
              <Th>المساهمين</Th>
              <Th>الحالة</Th>
              <Th>تاريخ الإنشاء</Th>
              <Th>الإجراءات</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={8} textAlign="center" py={8}>
                  جاري التحميل...
                </Td>
              </Tr>
            ) : filteredInitiatives.length === 0 ? (
              <Tr>
                <Td colSpan={8} textAlign="center" py={8}>
                  لا توجد مبادرات
                </Td>
              </Tr>
            ) : (
              filteredInitiatives.map((initiative) => (
                <Tr key={initiative.id} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <Box>
                      <Box fontWeight="bold">{initiative.title_ar}</Box>
                      <Box fontSize="sm" color="gray.600">
                        {initiative.title_en}
                      </Box>
                    </Box>
                  </Td>
                  <Td>{initiative.target_amount.toLocaleString()} ريال</Td>
                  <Td fontWeight="bold" color="green.600">
                    {(initiative.current_amount || 0).toLocaleString()} ريال
                  </Td>
                  <Td>
                    <Box>
                      <Progress
                        value={initiative.progress_percentage || 0}
                        colorScheme="green"
                        size="sm"
                        borderRadius="full"
                        mb={1}
                      />
                      <Box fontSize="sm" color="gray.600">
                        {(initiative.progress_percentage || 0).toFixed(1)}%
                      </Box>
                    </Box>
                  </Td>
                  <Td>{initiative.total_contributors || 0}</Td>
                  <Td>{getStatusBadge(initiative.status)}</Td>
                  <Td fontSize="sm">
                    {new Date(initiative.created_at).toLocaleDateString('ar-SA')}
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<FiEye />}
                          onClick={() => navigate(`/admin/initiatives/${initiative.id}`)}
                        >
                          عرض التفاصيل
                        </MenuItem>
                        <MenuItem
                          icon={<FiEdit />}
                          onClick={() => handleEdit(initiative)}
                        >
                          تعديل
                        </MenuItem>
                        
                        {initiative.status === 'active' && (
                          <MenuItem
                            icon={<FiCheck />}
                            onClick={() => handleTerminate(initiative.id)}
                            color="blue.600"
                          >
                            إنهاء المبادرة
                          </MenuItem>
                        )}
                        
                        {initiative.status === 'completed' && (
                          <>
                            <MenuItem
                              icon={<FiActivity />}
                              onClick={() => handleReopen(initiative.id)}
                              color="green.600"
                            >
                              إعادة فتح
                            </MenuItem>
                            <MenuItem
                              icon={<FiArchive />}
                              onClick={() => handleArchive(initiative.id)}
                              color="gray.600"
                            >
                              أرشفة
                            </MenuItem>
                          </>
                        )}
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Modals */}
      <CreateInitiativeModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onSuccess={fetchInitiatives}
      />

      {selectedInitiative && (
        <EditInitiativeModal
          isOpen={isEditOpen}
          onClose={onEditClose}
          initiative={selectedInitiative}
          onSuccess={fetchInitiatives}
        />
      )}
    </Box>
  );
};

export default InitiativesPage;
```

---

### **TASK 2.2: Create Initiative Modal** (2 hours)

**File:** `frontend/src/components/initiatives/CreateInitiativeModal.jsx`

```jsx
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  useToast,
  FormErrorMessage
} from '@chakra-ui/react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const InitiativeSchema = Yup.object().shape({
  title_ar: Yup.string().required('العنوان بالعربي مطلوب'),
  title_en: Yup.string().required('العنوان بالإنجليزي مطلوب'),
  description_ar: Yup.string(),
  description_en: Yup.string(),
  target_amount: Yup.number()
    .positive('يجب أن يكون المبلغ أكبر من صفر')
    .required('المبلغ المستهدف مطلوب'),
  min_contribution: Yup.number()
    .positive('يجب أن يكون الحد الأدنى أكبر من صفر')
    .nullable(),
  max_contribution: Yup.number()
    .positive('يجب أن يكون الحد الأقصى أكبر من صفر')
    .nullable()
    .test(
      'is-greater',
      'الحد الأقصى يجب أن يكون أكبر من الحد الأدنى',
      function(value) {
        const { min_contribution } = this.parent;
        if (!value || !min_contribution) return true;
        return value >= min_contribution;
      }
    ),
  category: Yup.string(),
  start_date: Yup.date().nullable(),
  end_date: Yup.date()
    .nullable()
    .min(Yup.ref('start_date'), 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
});

const CreateInitiativeModal = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values, actions) => {
    try {
      setLoading(true);
      await api.post('/initiatives', values);
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المبادرة بنجاح',
        status: 'success',
        duration: 3000
      });
      
      onSuccess();
      onClose();
      actions.resetForm();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.message || 'فشل في إنشاء المبادرة',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent dir="rtl">
        <ModalHeader>إنشاء مبادرة جديدة</ModalHeader>
        <ModalCloseButton />

        <Formik
          initialValues={{
            title_ar: '',
            title_en: '',
            description_ar: '',
            description_en: '',
            target_amount: '',
            min_contribution: '',
            max_contribution: '',
            category: 'charity',
            start_date: '',
            end_date: '',
            image_url: ''
          }}
          validationSchema={InitiativeSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <ModalBody>
                <SimpleGrid columns={2} spacing={4}>
                  {/* Arabic Title */}
                  <Field name="title_ar">
                    {({ field }) => (
                      <FormControl isInvalid={errors.title_ar && touched.title_ar} isRequired>
                        <FormLabel>العنوان بالعربي</FormLabel>
                        <Input {...field} placeholder="مثال: مبادرة خيرية للأيتام" />
                        <FormErrorMessage>{errors.title_ar}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>

                  {/* English Title */}
                  <Field name="title_en">
                    {({ field }) => (
                      <FormControl isInvalid={errors.title_en && touched.title_en} isRequired>
                        <FormLabel>العنوان بالإنجليزي</FormLabel>
                        <Input {...field} placeholder="Example: Charity Initiative for Orphans" />
                        <FormErrorMessage>{errors.title_en}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>

                  {/* Arabic Description */}
                  <Field name="description_ar">
                    {({ field }) => (
                      <FormControl>
                        <FormLabel>الوصف بالعربي</FormLabel>
                        <Textarea {...field} placeholder="وصف المبادرة..." rows={4} />
                      </FormControl>
                    )}
                  </Field>

                  {/* English Description */}
                  <Field name="description_en">
                    {({ field }) => (
                      <FormControl>
                        <FormLabel>الوصف بالإنجليزي</FormLabel>
                        <Textarea {...field} placeholder="Initiative description..." rows={4} />
                      </FormControl>
                    )}
                  </Field>

                  {/* Target Amount */}
                  <Field name="target_amount">
                    {({ field }) => (
                      <FormControl isInvalid={errors.target_amount && touched.target_amount} isRequired>
                        <FormLabel>المبلغ المستهدف (ريال)</FormLabel>
                        <NumberInput min={0}>
                          <NumberInputField {...field} placeholder="50000" />
                        </NumberInput>
                        <FormErrorMessage>{errors.target_amount}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>

                  {/* Category */}
                  <Field name="category">
                    {({ field }) => (
                      <FormControl>
                        <FormLabel>التصنيف</FormLabel>
                        <Select {...field}>
                          <option value="charity">خيري</option>
                          <option value="emergency">طارئ</option>
                          <option value="project">مشروع</option>
                          <option value="social">اجتماعي</option>
                        </Select>
                      </FormControl>
                    )}
                  </Field>

                  {/* Min Contribution */}
                  <Field name="min_contribution">
                    {({ field }) => (
                      <FormControl isInvalid={errors.min_contribution && touched.min_contribution}>
                        <FormLabel>الحد الأدنى للمساهمة (ريال)</FormLabel>
                        <NumberInput min={0}>
                          <NumberInputField {...field} placeholder="100" />
                        </NumberInput>
                        <FormErrorMessage>{errors.min_contribution}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>

                  {/* Max Contribution */}
                  <Field name="max_contribution">
                    {({ field }) => (
                      <FormControl isInvalid={errors.max_contribution && touched.max_contribution}>
                        <FormLabel>الحد الأقصى للمساهمة (ريال)</FormLabel>
                        <NumberInput min={0}>
                          <NumberInputField {...field} placeholder="10000" />
                        </NumberInput>
                        <FormErrorMessage>{errors.max_contribution}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>

                  {/* Start Date */}
                  <Field name="start_date">
                    {({ field }) => (
                      <FormControl>
                        <FormLabel>تاريخ البداية (اختياري)</FormLabel>
                        <Input {...field} type="date" />
                      </FormControl>
                    )}
                  </Field>

                  {/* End Date */}
                  <Field name="end_date">
                    {({ field }) => (
                      <FormControl isInvalid={errors.end_date && touched.end_date}>
                        <FormLabel>تاريخ الانتهاء (اختياري)</FormLabel>
                        <Input {...field} type="date" />
                        <FormErrorMessage>{errors.end_date}</FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>
                </SimpleGrid>
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  colorScheme="green"
                  isLoading={loading || isSubmitting}
                  loadingText="جاري الإنشاء..."
                >
                  إنشاء المبادرة
                </Button>
              </ModalFooter>
            </Form>
          )}
        </Formik>
      </ModalContent>
    </Modal>
  );
};

export default CreateInitiativeModal;
```

---

### **TASK 2.3: Initiative Details Page** (3 hours)

**File:** `frontend/src/pages/admin/InitiativeDetailsPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Avatar,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  useToast,
  Image
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiDownload } from 'react-icons/fi';
import api from '../../services/api';

const InitiativeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [initiative, setInitiative] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitiativeDetails();
  }, [id]);

  const fetchInitiativeDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/initiatives/${id}`);
      
      setInitiative(response.data.initiative);
      setContributors(response.data.contributors);
      setStatistics(response.data.statistics);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل تفاصيل المبادرة',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContribution = async (contributionId) => {
    try {
      await api.put(`/initiatives/${id}/contributions/${contributionId}/approve`, {
        status: 'approved'
      });
      
      toast({
        title: 'تم الموافقة',
        description: 'تم الموافقة على المساهمة بنجاح',
        status: 'success',
        duration: 3000
      });
      
      fetchInitiativeDetails();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في الموافقة على المساهمة',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleRejectContribution = async (contributionId) => {
    if (!window.confirm('هل أنت متأكد من رفض هذه المساهمة؟')) return;

    try {
      await api.put(`/initiatives/${id}/contributions/${contributionId}/approve`, {
        status: 'rejected'
      });
      
      toast({
        title: 'تم الرفض',
        description: 'تم رفض المساهمة',
        status: 'info',
        duration: 3000
      });
      
      fetchInitiativeDetails();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في رفض المساهمة',
        status: 'error',
        duration: 3000
      });
    }
  };

  if (loading || !initiative) {
    return (
      <Box p={6} textAlign="center">
        جاري التحميل...
      </Box>
    );
  }

  return (
    <Box p={6} dir="rtl">
      {/* Header */}
      <Flex mb={6} align="center" justify="space-between">
        <Flex align="center" gap={4}>
          <IconButton
            icon={<FiArrowLeft />}
            onClick={() => navigate('/admin/initiatives')}
            variant="ghost"
          />
          <Box>
            <Heading size="lg">{initiative.title_ar}</Heading>
            <Text color="gray.600" fontSize="sm">{initiative.title_en}</Text>
          </Box>
        </Flex>
        <Badge colorScheme={initiative.status === 'active' ? 'green' : 'blue'} fontSize="md" px={3} py={1}>
          {initiative.status === 'active' ? 'نشطة' : 'مكتملة'}
        </Badge>
      </Flex>

      {/* Statistics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Stat bg="white" p={4} borderRadius="md" boxShadow="sm">
          <StatLabel>المبلغ المستهدف</StatLabel>
          <StatNumber color="blue.600">
            {initiative.target_amount.toLocaleString()} ريال
          </StatNumber>
        </Stat>

        <Stat bg="white" p={4} borderRadius="md" boxShadow="sm">
          <StatLabel>المبلغ المحصل</StatLabel>
          <StatNumber color="green.600">
            {(initiative.current_amount || 0).toLocaleString()} ريال
          </StatNumber>
          <StatHelpText>
            {((initiative.current_amount / initiative.target_amount) * 100).toFixed(1)}% من الهدف
          </StatHelpText>
        </Stat>

        <Stat bg="white" p={4} borderRadius="md" boxShadow="sm">
          <StatLabel>عدد المساهمين</StatLabel>
          <StatNumber>{statistics.total_contributors || 0}</StatNumber>
        </Stat>

        <Stat bg="white" p={4} borderRadius="md" boxShadow="sm">
          <StatLabel>متوسط المساهمة</StatLabel>
          <StatNumber>
            {(statistics.average_contribution || 0).toLocaleString()} ريال
          </StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Progress Bar */}
      <Box bg="white" p={6} borderRadius="md" boxShadow="sm" mb={6}>
        <Text fontWeight="bold" mb={2}>
          التقدم نحو الهدف
        </Text>
        <Progress
          value={(initiative.current_amount / initiative.target_amount) * 100}
          colorScheme="green"
          size="lg"
          borderRadius="full"
          mb={2}
        />
        <Flex justify="space-between" fontSize="sm" color="gray.600">
          <Text>{(initiative.current_amount || 0).toLocaleString()} ريال</Text>
          <Text>{initiative.target_amount.toLocaleString()} ريال</Text>
        </Flex>
      </Box>

      {/* Tabs */}
      <Tabs>
        <TabList>
          <Tab>المساهمات ({contributors.length})</Tab>
          <Tab>تفاصيل المبادرة</Tab>
        </TabList>

        <TabPanels>
          {/* Contributors Tab */}
          <TabPanel>
            <Box bg="white" borderRadius="md" boxShadow="sm" overflow="hidden">
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>المساهم</Th>
                    <Th>المبلغ</Th>
                    <Th>طريقة الدفع</Th>
                    <Th>الحالة</Th>
                    <Th>التاريخ</Th>
                    <Th>الإيصال</Th>
                    <Th>الإجراءات</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {contributors.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={8}>
                        لا توجد مساهمات حتى الآن
                      </Td>
                    </Tr>
                  ) : (
                    contributors.map((contributor) => (
                      <Tr key={contributor.id}>
                        <Td>
                          <Flex align="center" gap={3}>
                            <Avatar size="sm" name={contributor.member_name_ar} />
                            <Box>
                              <Text fontWeight="bold">{contributor.member_name_ar}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {contributor.member_number}
                              </Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td fontWeight="bold" color="green.600">
                          {contributor.amount.toLocaleString()} ريال
                        </Td>
                        <Td>
                          {contributor.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                          {contributor.payment_method === 'cash' && 'نقداً'}
                          {contributor.payment_method === 'online' && 'أونلاين'}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              contributor.status === 'approved'
                                ? 'green'
                                : contributor.status === 'rejected'
                                ? 'red'
                                : 'yellow'
                            }
                          >
                            {contributor.status === 'approved' && 'موافق'}
                            {contributor.status === 'rejected' && 'مرفوض'}
                            {contributor.status === 'pending' && 'قيد المراجعة'}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">
                          {new Date(contributor.created_at).toLocaleDateString('ar-SA')}
                        </Td>
                        <Td>
                          {contributor.receipt_image_url ? (
                            <Button
                              size="sm"
                              leftIcon={<FiDownload />}
                              as="a"
                              href={contributor.receipt_image_url}
                              target="_blank"
                            >
                              عرض
                            </Button>
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              لا يوجد
                            </Text>
                          )}
                        </Td>
                        <Td>
                          {contributor.status === 'pending' && (
                            <Flex gap={2}>
                              <IconButton
                                size="sm"
                                colorScheme="green"
                                icon={<FiCheck />}
                                onClick={() => handleApproveContribution(contributor.id)}
                              />
                              <IconButton
                                size="sm"
                                colorScheme="red"
                                icon={<FiX />}
                                onClick={() => handleRejectContribution(contributor.id)}
                              />
                            </Flex>
                          )}
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>

          {/* Details Tab */}
          <TabPanel>
            <Box bg="white" p={6} borderRadius="md" boxShadow="sm">
              <SimpleGrid columns={2} spacing={6}>
                <Box>
                  <Text fontWeight="bold" mb={2}>الوصف بالعربي</Text>
                  <Text color="gray.700">{initiative.description_ar || 'لا يوجد وصف'}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>الوصف بالإنجليزي</Text>
                  <Text color="gray.700">{initiative.description_en || 'No description'}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>الحد الأدنى للمساهمة</Text>
                  <Text color="gray.700">
                    {initiative.min_contribution
                      ? `${initiative.min_contribution.toLocaleString()} ريال`
                      : 'غير محدد'}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>الحد الأقصى للمساهمة</Text>
                  <Text color="gray.700">
                    {initiative.max_contribution
                      ? `${initiative.max_contribution.toLocaleString()} ريال`
                      : 'غير محدد'}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>تاريخ البداية</Text>
                  <Text color="gray.700">
                    {initiative.start_date
                      ? new Date(initiative.start_date).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>تاريخ الانتهاء</Text>
                  <Text color="gray.700">
                    {initiative.end_date
                      ? new Date(initiative.end_date).toLocaleDateString('ar-SA')
                      : 'مفتوحة'}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>التصنيف</Text>
                  <Badge colorScheme="purple">
                    {initiative.category === 'charity' && 'خيري'}
                    {initiative.category === 'emergency' && 'طارئ'}
                    {initiative.category === 'project' && 'مشروع'}
                    {initiative.category === 'social' && 'اجتماعي'}
                  </Badge>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>أنشئت بواسطة</Text>
                  <Text color="gray.700">{initiative.created_by_name}</Text>
                </Box>
              </SimpleGrid>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default InitiativeDetailsPage;
```

**Agent 2 Deliverable:** ✅ Complete admin dashboard with 3 pages + 2 modals

---

## 📱 AGENT 3: MOBILE ENGINEER - PWA Interface
**Timeline:** 1 Day  
**Skill Required:** React.js, Mobile UI/UX, PWA  
**Mission:** Build mobile-first interface for members

---

### **TASK 3.1: Mobile Initiatives List** (3 hours)

**File:** `mobile-pwa/src/pages/InitiativesPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Progress,
  Badge,
  Icon,
  Flex,
  Image
} from '@chakra-ui/react';
import { FiHeart, FiUsers, FiCalendar, FiTarget } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const InitiativesPage = () => {
  const navigate = useNavigate();
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const fetchInitiatives = async () => {
    try {
      const response = await api.get('/mobile/initiatives/active');
      setInitiatives(response.data.initiatives);
    } catch (error) {
      console.error('Failed to fetch initiatives:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        جاري التحميل...
      </Box>
    );
  }

  return (
    <Container maxW="container.md" py={6} dir="rtl">
      {/* Header */}
      <Box mb={6}>
        <Heading size="lg" mb={2}>المبادرات الحالية</Heading>
        <Text color="gray.600">شارك في المبادرات الخيرية والاجتماعية</Text>
      </Box>

      {/* Initiatives List */}
      <VStack spacing={4} align="stretch">
        {initiatives.length === 0 ? (
          <Box bg="white" p={8} borderRadius="xl" textAlign="center">
            <Icon as={FiTarget} boxSize={12} color="gray.400" mb={4} />
            <Text color="gray.600">لا توجد مبادرات نشطة حالياً</Text>
          </Box>
        ) : (
          initiatives.map((initiative) => (
            <Box
              key={initiative.id}
              bg="white"
              borderRadius="xl"
              boxShadow="md"
              overflow="hidden"
              onClick={() => navigate(`/initiatives/${initiative.id}`)}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
            >
              {/* Image */}
              {initiative.image_url && (
                <Image
                  src={initiative.image_url}
                  alt={initiative.title_ar}
                  h="180px"
                  w="100%"
                  objectFit="cover"
                />
              )}

              <Box p={5}>
                {/* Category Badge */}
                <Badge
                  colorScheme={
                    initiative.category === 'charity'
                      ? 'green'
                      : initiative.category === 'emergency'
                      ? 'red'
                      : 'blue'
                  }
                  mb={2}
                >
                  {initiative.category === 'charity' && 'خيري'}
                  {initiative.category === 'emergency' && 'طارئ'}
                  {initiative.category === 'project' && 'مشروع'}
                  {initiative.category === 'social' && 'اجتماعي'}
                </Badge>

                {/* Title */}
                <Heading size="md" mb={2} noOfLines={2}>
                  {initiative.title_ar}
                </Heading>

                {/* Description */}
                <Text color="gray.600" fontSize="sm" mb={4} noOfLines={2}>
                  {initiative.description_ar}
                </Text>

                {/* Progress */}
                <Box mb={4}>
                  <Flex justify="space-between" mb={1} fontSize="sm">
                    <Text fontWeight="bold" color="green.600">
                      {(initiative.current_amount || 0).toLocaleString()} ريال
                    </Text>
                    <Text color="gray.600">
                      الهدف: {initiative.target_amount.toLocaleString()} ريال
                    </Text>
                  </Flex>
                  <Progress
                    value={initiative.progress_percentage || 0}
                    colorScheme="green"
                    size="sm"
                    borderRadius="full"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {(initiative.progress_percentage || 0).toFixed(1)}% مكتمل
                  </Text>
                </Box>

                {/* Stats */}
                <HStack spacing={4} fontSize="sm" color="gray.600" mb={4}>
                  <Flex align="center" gap={1}>
                    <Icon as={FiUsers} />
                    <Text>{initiative.total_contributors || 0} مساهم</Text>
                  </Flex>
                  
                  {initiative.days_remaining !== null && (
                    <Flex align="center" gap={1}>
                      <Icon as={FiCalendar} />
                      <Text>
                        {initiative.days_remaining > 0
                          ? `${initiative.days_remaining} يوم متبقي`
                          : 'انتهى'}
                      </Text>
                    </Flex>
                  )}
                </HStack>

                {/* Contribution Range */}
                {(initiative.min_contribution || initiative.max_contribution) && (
                  <Text fontSize="xs" color="gray.500" mb={4}>
                    المساهمة:{' '}
                    {initiative.min_contribution && `من ${initiative.min_contribution} ريال`}
                    {initiative.min_contribution && initiative.max_contribution && ' - '}
                    {initiative.max_contribution && `إلى ${initiative.max_contribution} ريال`}
                  </Text>
                )}

                {/* Contribute Button */}
                <Button
                  colorScheme="green"
                  leftIcon={<FiHeart />}
                  w="100%"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/initiatives/${initiative.id}/contribute`);
                  }}
                >
                  ساهم الآن
                </Button>
              </Box>
            </Box>
          ))
        )}
      </VStack>

      {/* Previous Initiatives Link */}
      <Button
        variant="ghost"
        w="100%"
        mt={6}
        onClick={() => navigate('/initiatives/previous')}
      >
        عرض المبادرات السابقة
      </Button>
    </Container>
  );
};

export default InitiativesPage;
```

---

### **TASK 3.2: Contribution Page** (2 hours)

**File:** `mobile-pwa/src/pages/ContributePage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Radio,
  RadioGroup,
  Textarea,
  useToast,
  Icon,
  Progress,
  Flex,
  Image as ChakraImage
} from '@chakra-ui/react';
import { FiArrowLeft, FiCamera, FiCheck } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ContributePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [initiative, setInitiative] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitiative();
  }, [id]);

  const fetchInitiative = async () => {
    try {
      const response = await api.get(`/mobile/initiatives/active`);
      const found = response.data.initiatives.find((i) => i.id === id);
      setInitiative(found);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المبادرة',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceipt(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال مبلغ صحيح',
        status: 'error',
        duration: 3000
      });
      return;
    }

    // Validate min/max amounts
    if (initiative.min_contribution && parseFloat(amount) < initiative.min_contribution) {
      toast({
        title: 'خطأ',
        description: `الحد الأدنى للمساهمة هو ${initiative.min_contribution} ريال`,
        status: 'error',
        duration: 3000
      });
      return;
    }

    if (initiative.max_contribution && parseFloat(amount) > initiative.max_contribution) {
      toast({
        title: 'خطأ',
        description: `الحد الأقصى للمساهمة هو ${initiative.max_contribution} ريال`,
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('payment_method', paymentMethod);
      formData.append('notes', notes);
      if (receipt) {
        formData.append('receipt', receipt);
      }

      await api.post(`/mobile/initiatives/${id}/contribute`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast({
        title: 'شكراً لمساهمتك!',
        description: 'سيتم مراجعة دفعتك قريباً',
        status: 'success',
        duration: 5000
      });

      navigate('/initiatives');
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error.response?.data?.message || 'فشل في إرسال المساهمة',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  if (!initiative) {
    return (
      <Box p={6} textAlign="center">
        جاري التحميل...
      </Box>
    );
  }

  return (
    <Container maxW="container.md" py={6} dir="rtl">
      {/* Header */}
      <Flex align="center" gap={4} mb={6}>
        <Icon
          as={FiArrowLeft}
          boxSize={6}
          onClick={() => navigate(-1)}
          cursor="pointer"
        />
        <Box>
          <Heading size="md">المساهمة في المبادرة</Heading>
          <Text color="gray.600" fontSize="sm">{initiative.title_ar}</Text>
        </Box>
      </Flex>

      {/* Initiative Summary */}
      <Box bg="white" p={5} borderRadius="xl" boxShadow="md" mb={6}>
        <Flex justify="space-between" mb={2} fontSize="sm">
          <Text fontWeight="bold" color="green.600">
            {(initiative.current_amount || 0).toLocaleString()} ريال
          </Text>
          <Text color="gray.600">
            الهدف: {initiative.target_amount.toLocaleString()} ريال
          </Text>
        </Flex>
        <Progress
          value={initiative.progress_percentage || 0}
          colorScheme="green"
          size="sm"
          borderRadius="full"
          mb={2}
        />
        <Text fontSize="xs" color="gray.500">
          {(initiative.progress_percentage || 0).toFixed(1)}% مكتمل • {initiative.total_contributors || 0} مساهم
        </Text>
      </Box>

      {/* Contribution Form */}
      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={5} align="stretch">
          {/* Amount */}
          <FormControl isRequired>
            <FormLabel>المبلغ (ريال سعودي)</FormLabel>
            <NumberInput
              min={initiative.min_contribution || 0}
              max={initiative.max_contribution || 999999}
              value={amount}
              onChange={setAmount}
              size="lg"
            >
              <NumberInputField
                placeholder="أدخل المبلغ"
                fontSize="2xl"
                textAlign="center"
              />
            </NumberInput>
            {(initiative.min_contribution || initiative.max_contribution) && (
              <Text fontSize="sm" color="gray.600" mt={2}>
                {initiative.min_contribution && `الحد الأدنى: ${initiative.min_contribution} ريال`}
                {initiative.min_contribution && initiative.max_contribution && ' • '}
                {initiative.max_contribution && `الحد الأقصى: ${initiative.max_contribution} ريال`}
              </Text>
            )}
          </FormControl>

          {/* Quick Amounts */}
          <Flex gap={2} wrap="wrap">
            {[100, 250, 500, 1000].map((quickAmount) => (
              <Button
                key={quickAmount}
                size="sm"
                variant="outline"
                onClick={() => setAmount(quickAmount.toString())}
              >
                {quickAmount} ريال
              </Button>
            ))}
          </Flex>

          {/* Payment Method */}
          <FormControl isRequired>
            <FormLabel>طريقة الدفع</FormLabel>
            <RadioGroup value={paymentMethod} onChange={setPaymentMethod}>
              <VStack align="start" spacing={3}>
                <Radio value="bank_transfer">تحويل بنكي</Radio>
                <Radio value="cash">نقداً</Radio>
                <Radio value="online">دفع أونلاين</Radio>
              </VStack>
            </RadioGroup>
          </FormControl>

          {/* Receipt Upload */}
          <FormControl>
            <FormLabel>إرفاق الإيصال (اختياري)</FormLabel>
            <Button
              leftIcon={<FiCamera />}
              variant="outline"
              w="100%"
              onClick={() => document.getElementById('receipt-upload').click()}
            >
              {receipt ? 'تم رفع الإيصال' : 'التقاط صورة الإيصال'}
            </Button>
            <input
              id="receipt-upload"
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleReceiptChange}
            />
            {receiptPreview && (
              <Box mt={3}>
                <ChakraImage
                  src={receiptPreview}
                  alt="Receipt preview"
                  borderRadius="md"
                  maxH="200px"
                  objectFit="cover"
                />
              </Box>
            )}
          </FormControl>

          {/* Notes */}
          <FormControl>
            <FormLabel>ملاحظات (اختياري)</FormLabel>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات إن وجدت..."
              rows={3}
            />
          </FormControl>

          {/* Submit Button */}
          <Button
            type="submit"
            colorScheme="green"
            size="lg"
            leftIcon={<FiCheck />}
            isLoading={loading}
            loadingText="جاري الإرسال..."
          >
            تأكيد المساهمة
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default ContributePage;
```

---

### **TASK 3.3: My Contributions Page** (1 hour)

**File:** `mobile-pwa/src/pages/MyContributionsPage.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { FiCheck, FiClock, FiX, FiDollarSign, FiActivity } from 'react-icons/fi';
import api from '../services/api';

const MyContributionsPage = () => {
  const [contributions, setContributions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      const response = await api.get('/mobile/initiatives/my-contributions');
      setContributions(response.data.contributions);
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      approved: { colorScheme: 'green', icon: FiCheck, text: 'موافق' },
      pending: { colorScheme: 'yellow', icon: FiClock, text: 'قيد المراجعة' },
      rejected: { colorScheme: 'red', icon: FiX, text: 'مرفوض' }
    };
    const { colorScheme, icon, text } = config[status] || config.pending;
    
    return (
      <Badge colorScheme={colorScheme} display="flex" alignItems="center" gap={1}>
        <Icon as={icon} boxSize={3} />
        {text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        جاري التحميل...
      </Box>
    );
  }

  return (
    <Container maxW="container.md" py={6} dir="rtl">
      {/* Header */}
      <Heading size="lg" mb={6}>مساهماتي</Heading>

      {/* Statistics */}
      <HStack spacing={4} mb={6}>
        <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm" flex={1}>
          <StatLabel fontSize="sm">إجمالي المساهمات</StatLabel>
          <StatNumber color="green.600">
            {(statistics.total_contributed || 0).toLocaleString()} ريال
          </StatNumber>
        </Stat>

        <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm" flex={1}>
          <StatLabel fontSize="sm">عدد المساهمات</StatLabel>
          <StatNumber>{statistics.total_contributions || 0}</StatNumber>
          <StatHelpText>
            {statistics.approved_contributions || 0} موافق عليها
          </StatHelpText>
        </Stat>
      </HStack>

      {/* Contributions List */}
      <VStack spacing={4} align="stretch">
        {contributions.length === 0 ? (
          <Box bg="white" p={8} borderRadius="xl" textAlign="center">
            <Icon as={FiActivity} boxSize={12} color="gray.400" mb={4} />
            <Text color="gray.600">لم تساهم في أي مبادرة بعد</Text>
          </Box>
        ) : (
          contributions.map((contribution) => (
            <Box
              key={contribution.id}
              bg="white"
              p={5}
              borderRadius="xl"
              boxShadow="md"
            >
              <Flex justify="space-between" align="start" mb={3}>
                <Box flex={1}>
                  <Text fontWeight="bold" fontSize="lg" mb={1}>
                    {contribution.initiative_title_ar}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {new Date(contribution.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                </Box>
                {getStatusBadge(contribution.status)}
              </Flex>

              <HStack justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FiDollarSign} color="green.600" />
                  <Text fontWeight="bold" fontSize="xl" color="green.600">
                    {contribution.amount.toLocaleString()} ريال
                  </Text>
                </Flex>

                <Text fontSize="sm" color="gray.600">
                  {contribution.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                  {contribution.payment_method === 'cash' && 'نقداً'}
                  {contribution.payment_method === 'online' && 'أونلاين'}
                </Text>
              </HStack>

              {contribution.notes && (
                <Text fontSize="sm" color="gray.600" mt={3} p={3} bg="gray.50" borderRadius="md">
                  {contribution.notes}
                </Text>
              )}
            </Box>
          ))
        )}
      </VStack>
    </Container>
  );
};

export default MyContributionsPage;
```

**Agent 3 Deliverable:** ✅ Complete mobile PWA interface with 3 pages

---

## 🧪 AGENT 4: QA ENGINEER - Testing & Documentation
**Timeline:** 1 Day  
**Skill Required:** Testing, Documentation  
**Mission:** Ensure bulletproof quality

---

### **TASK 4.1: Test Scenarios** (4 hours)

**File:** `INITIATIVES_TEST_PLAN.md`

```markdown
# Initiatives Management - Test Plan

## Test Categories

### 1. API Testing (Backend)

#### Create Initiative
- [ ] Create with all fields
- [ ] Create with minimum required fields
- [ ] Validate target_amount > 0
- [ ] Validate min_contribution < max_contribution
- [ ] Test with invalid dates (end_date < start_date)
- [ ] Test authorization (only admin/secretary can create)

#### Update Initiative
- [ ] Update single field
- [ ] Update multiple fields
- [ ] Test authorization
- [ ] Verify updated_at timestamp changes

#### Get Initiatives
- [ ] Get all initiatives
- [ ] Filter by status (active/completed/archived)
- [ ] Filter by category
- [ ] Test pagination (limit/offset)
- [ ] Verify statistics calculation

#### Terminate/Reopen/Archive
- [ ] Terminate active initiative
- [ ] Cannot terminate already terminated
- [ ] Reopen completed initiative
- [ ] Archive completed initiative
- [ ] Verify final amount calculation

#### Contributions
- [ ] Valid contribution within min/max range
- [ ] Reject contribution below minimum
- [ ] Reject contribution above maximum
- [ ] Upload receipt image
- [ ] Approve contribution
- [ ] Reject contribution
- [ ] Verify progress recalculation

### 2. Admin Dashboard Testing

#### Initiatives List Page
- [ ] Display all initiatives
- [ ] Filter by status works
- [ ] Search by title works
- [ ] Statistics cards show correct data
- [ ] Create modal opens
- [ ] Edit modal opens with correct data
- [ ] Actions menu works (terminate/reopen/archive)

#### Create Initiative Modal
- [ ] All fields render correctly
- [ ] Form validation works
- [ ] Arabic/English titles required
- [ ] Min/max validation works
- [ ] Date validation works
- [ ] Success toast shows
- [ ] Error handling works

#### Initiative Details Page
- [ ] Shows correct initiative data
- [ ] Progress bar displays correctly
- [ ] Contributors table populates
- [ ] Approve contribution works
- [ ] Reject contribution works
- [ ] Statistics are accurate

### 3. Mobile PWA Testing

#### Initiatives List (Mobile)
- [ ] Shows only active initiatives
- [ ] Cards display correctly on mobile
- [ ] Progress bars work
- [ ] Images load (if present)
- [ ] Tap to view details works
- [ ] "Contribute Now" button works

#### Contribution Page
- [ ] Amount input works
- [ ] Quick amount buttons work
- [ ] Min/max validation displays
- [ ] Payment method selection works
- [ ] Receipt upload works (camera)
- [ ] Form submission works
- [ ] Success message shows

#### My Contributions Page
- [ ] Shows all user contributions
- [ ] Status badges display correctly
- [ ] Statistics are accurate
- [ ] Empty state displays when no contributions

### 4. Integration Testing

- [ ] Create initiative → appears in mobile app
- [ ] Member contributes → shows in admin dashboard
- [ ] Admin approves → statistics update
- [ ] Initiative reaches target → status updates
- [ ] Terminate initiative → removed from mobile active list
- [ ] Archive initiative → not visible anywhere

### 5. Performance Testing

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Handle 100+ initiatives
- [ ] Handle 1000+ contributions
- [ ] Image upload size limit (5MB)
- [ ] Receipt compression works

### 6. Security Testing

- [ ] Members cannot access admin endpoints
- [ ] JWT token validation works
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] File upload validation
- [ ] CORS configured correctly

### 7. Mobile Responsiveness

- [ ] Works on iPhone (Safari)
- [ ] Works on Android (Chrome)
- [ ] Touch interactions smooth
- [ ] Forms are thumb-friendly
- [ ] Images responsive
- [ ] Arabic RTL layout correct

## Test Results

**Date:** _____________  
**Tested By:** _____________  
**Pass Rate:** _____ / _____ (___%)  
**Blocker Issues:** _____  
**Critical Issues:** _____  
**Minor Issues:** _____  

## Sign-off

- [ ] All critical tests passed
- [ ] Documentation complete
- [ ] Ready for production deployment

**QA Lead:** _____________  
**Date:** _____________
```

---

### **TASK 4.2: API Documentation** (2 hours)

**File:** `INITIATIVES_API_DOCUMENTATION.md`

```markdown
# Initiatives Management API Documentation

**Base URL:** `https://proshael.onrender.com/api`

## Authentication

All endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Admin Endpoints

### 1. Create Initiative

**POST** `/initiatives`

**Permission:** Secretary, Initiatives Manager

**Request Body:**
```json
{
  "title_ar": "مبادرة خيرية للأيتام",
  "title_en": "Charity Initiative for Orphans",
  "description_ar": "وصف المبادرة بالعربي",
  "description_en": "Initiative description in English",
  "target_amount": 50000,
  "min_contribution": 100,
  "max_contribution": 10000,
  "category": "charity",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}
```

**Response (201):**
```json
{
  "success": true,
  "message_ar": "تم إنشاء المبادرة بنجاح",
  "message_en": "Initiative created successfully",
  "initiative": {
    "id": "uuid",
    "title_ar": "مبادرة خيرية للأيتام",
    ...
  }
}
```

---

### 2. Get All Initiatives

**GET** `/initiatives?status=active&limit=20&offset=0`

**Permission:** Admin, Secretary, Initiatives Manager

**Query Parameters:**
- `status` (optional): `active`, `completed`, `archived`, `all`
- `category` (optional): `charity`, `emergency`, `project`, `social`
- `limit` (optional): Default 20
- `offset` (optional): Default 0

**Response (200):**
```json
{
  "success": true,
  "initiatives": [
    {
      "id": "uuid",
      "title_ar": "مبادرة خيرية",
      "title_en": "Charity Initiative",
      "target_amount": 50000,
      "current_amount": 25000,
      "progress_percentage": 50.0,
      "total_contributors": 45,
      "status": "active",
      ...
    }
  ],
  "statistics": {
    "total": 10,
    "active": 5,
    "completed": 3,
    "archived": 2,
    "total_collected": 150000,
    "total_contributors": 234
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 10
  }
}
```

---

### 3. Get Initiative Details

**GET** `/initiatives/:id`

**Permission:** All authenticated users

**Response (200):**
```json
{
  "success": true,
  "initiative": { ... },
  "contributors": [
    {
      "id": "uuid",
      "member_name_ar": "أحمد محمد",
      "member_name_en": "Ahmed Mohammed",
      "amount": 500,
      "status": "approved",
      "created_at": "2025-10-01T10:30:00Z"
    }
  ],
  "statistics": {
    "total_collected": 25000,
    "total_contributions": 50,
    "total_contributors": 45,
    "highest_contribution": 5000,
    "average_contribution": 500
  }
}
```

---

### 4. Terminate Initiative

**POST** `/initiatives/:id/terminate`

**Permission:** Super Admin, Secretary

**Response (200):**
```json
{
  "success": true,
  "message_ar": "تم إنهاء المبادرة بنجاح",
  "message_en": "Initiative terminated successfully",
  "final_amount": 25000
}
```

---

### 5. Approve Contribution

**PUT** `/initiatives/:id/contributions/:contribution_id/approve`

**Permission:** Admin, Secretary, Initiatives Manager

**Request Body:**
```json
{
  "status": "approved"  // or "rejected"
}
```

**Response (200):**
```json
{
  "success": true,
  "message_ar": "تم الموافقة على المساهمة",
  "message_en": "Contribution approved",
  "contribution": { ... }
}
```

---

## Member Endpoints (Mobile)

### 6. Get Active Initiatives

**GET** `/mobile/initiatives/active`

**Permission:** All authenticated members

**Response (200):**
```json
{
  "success": true,
  "initiatives": [
    {
      "id": "uuid",
      "title_ar": "مبادرة خيرية",
      "title_en": "Charity Initiative",
      "description_ar": "وصف",
      "description_en": "Description",
      "target_amount": 50000,
      "current_amount": 25000,
      "min_contribution": 100,
      "max_contribution": 10000,
      "progress_percentage": 50.0,
      "total_contributors": 45,
      "days_remaining": 60
    }
  ]
}
```

---

### 7. Contribute to Initiative

**POST** `/mobile/initiatives/:id/contribute`

**Permission:** All authenticated members

**Request Body (multipart/form-data):**
```
amount: 500
payment_method: "bank_transfer"
notes: "تبرع من القلب"
receipt: <file>
```

**Response (201):**
```json
{
  "success": true,
  "message_ar": "شكراً لمساهمتك! سيتم مراجعة الدفعة قريباً",
  "message_en": "Thank you for your contribution! Payment will be reviewed soon",
  "contribution_id": "uuid",
  "status": "pending"
}
```

**Error Responses:**
- `400` - Amount below minimum or above maximum
- `404` - Initiative not found or not active
- `500` - Server error

---

### 8. Get My Contributions

**GET** `/mobile/initiatives/my-contributions`

**Permission:** All authenticated members

**Response (200):**
```json
{
  "success": true,
  "contributions": [
    {
      "id": "uuid",
      "initiative_title_ar": "مبادرة خيرية",
      "initiative_title_en": "Charity Initiative",
      "amount": 500,
      "payment_method": "bank_transfer",
      "status": "approved",
      "created_at": "2025-10-01T10:30:00Z"
    }
  ],
  "statistics": {
    "total_contributed": 1500,
    "total_contributions": 3,
    "approved_contributions": 2
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Admin endpoints:** 100 requests/minute
- **Member endpoints:** 60 requests/minute

---

## Best Practices

1. **Always validate input** on frontend before sending
2. **Handle errors gracefully** with user-friendly messages
3. **Upload receipts** to improve approval rate
4. **Check min/max** contribution limits before submitting
5. **Use pagination** for large datasets

---

**Last Updated:** October 7, 2025  
**Version:** 1.0.0
```

**Agent 4 Deliverable:** ✅ Complete test plan + API documentation

---

## 📊 PROJECT MILESTONES

| Day | Agent | Tasks | Deliverable |
|-----|-------|-------|-------------|
| **Day 1** | Agent 1 | Backend API (10 endpoints) | Working API + Postman collection |
| **Day 2** | Agent 1 | Testing & bug fixes | Stable backend |
| **Day 3** | Agent 2 | Admin dashboard (List + Create) | Admin interface 60% |
| **Day 4** | Agent 2 | Admin dashboard (Details + Edit) | Admin interface 100% |
| **Day 5** | Agent 3 | Mobile PWA (3 pages) | Mobile interface 100% |
| **Day 5** | Agent 4 | Testing + Documentation | Test report + docs |

**Total Timeline:** 5 working days

---

## ✅ SUCCESS CRITERIA

This mission is complete when ALL of these are true:

### **Backend (Agent 1):**
- [ ] 13 API endpoints functional
- [ ] All validation rules working
- [ ] Permission system enforced
- [ ] Progress calculation accurate
- [ ] Audit logs recording all actions

### **Admin Dashboard (Agent 2):**
- [ ] Can create initiatives with all fields
- [ ] Can view list with filters
- [ ] Can see detailed statistics
- [ ] Can approve/reject contributions
- [ ] Can terminate/reopen/archive initiatives

### **Mobile PWA (Agent 3):**
- [ ] Members can view active initiatives
- [ ] Members can contribute with receipt upload
- [ ] Members can see their contribution history
- [ ] All pages mobile-responsive
- [ ] Arabic RTL layout working

### **Quality (Agent 4):**
- [ ] All test scenarios passed
- [ ] API documentation complete
- [ ] No critical bugs
- [ ] Performance acceptable (<3s page load)

---

## 🚀 DEPLOYMENT CHECKLIST

Before launching to production:

1. [ ] **Database Migration:** Run schema updates
2. [ ] **Environment Variables:** Set production URLs
3. [ ] **File Storage:** Configure Supabase Storage for receipts
4. [ ] **Testing:** Run full test suite
5. [ ] **Admin Training:** Train secretary/staff on new features
6. [ ] **Member Communication:** Announce new initiative system
7. [ ] **Monitoring:** Set up error tracking (Sentry)
8. [ ] **Backup:** Create database backup before deployment

---

## 🎯 MISSION COMPLETE!

When all agents finish their tasks, you will have:

✅ A complete initiative management system  
✅ Backend API with 13 endpoints  
✅ Beautiful admin dashboard  
✅ Mobile-first PWA interface  
✅ Full documentation  
✅ Test coverage  

**Status:** Ready for **344 active families** to start contributing! 🎉

---

**Mission Document Version:** 1.0  
**Created:** October 7, 2025  
**For:** Al-Shuail Family Management System  
**Code Name:** FALCON

**Remember:** You're not just building a feature. You're building trust, transparency, and a platform that will handle real charitable contributions for real families. Make it bulletproof. Make it beautiful. Make it work.

🦅 **FALCON - Cleared for takeoff!**
