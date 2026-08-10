// ============================================
// INITIATIVES API - COMPLETE IMPLEMENTATION
// File: backend/routes/initiativesEnhanced.js
// Purpose: Full CRUD + lifecycle management for initiatives
// ============================================

import express from 'express';
import { query, getClient } from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getSignedUrl } from '../config/documentStorage.js';
import {
    persistIdempotentMemberNotification,
    sendPushNotification
} from '../services/notificationService.js';
import { log } from '../utils/logger.js';
import {
    INITIATIVE_ADMIN_ROLES,
    INITIATIVE_STATUSES,
    initiativeProgress,
    isUuid,
    normalizeInitiativeInput
} from '../utils/initiativeInput.js';

const router = express.Router();

const DONATION_REVIEW_ROLES = new Set([
    'super_admin',
    'admin',
    'financial_manager'
]);

const APPROVED_DONATION_STATUSES = new Set(['approved', 'completed', 'confirmed']);
const CANONICAL_API_ORIGIN = 'https://api.alshailfund.com';

const UNSAFE_RECEIPT_RESPONSE_KEYS = Object.freeze([
    'receipt_url',
    'receipt_path',
    'receipt_file_path',
    'file_path',
    'path',
    'receipt',
    'receipt_metadata',
    'receipt_document',
    '_receipt_metadata_id',
    '_receipt_storage_path',
    '_receipt_original_name',
    '_receipt_file_size',
    '_receipt_mime_type'
]);

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const normalizeReviewReason = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const validateRejectionReason = (value) => {
    const reason = normalizeReviewReason(value);
    const meaningfulCharacters = reason.match(/[A-Za-z0-9ء-ي]/g) || [];

    if (reason.length < 10 || reason.length > 500 || meaningfulCharacters.length < 8) {
        return {
            reason,
            error: 'سبب الرفض يجب أن يكون واضحاً ومن 10 إلى 500 حرف'
        };
    }

    return { reason, error: null };
};

const absoluteRequestUrl = (req, value) => {
    if (!value) {
        return null;
    }

    const protocol = req.protocol || 'https';
    const host = req.get?.('host') || 'api.alshailfund.com';
    const requestedOrigin = new URL(`${protocol}://${host}`).origin;
    const requestedHostname = new URL(requestedOrigin).hostname;
    const trustedRequestOrigin = requestedOrigin === CANONICAL_API_ORIGIN
        || ['localhost', '127.0.0.1', '::1'].includes(requestedHostname)
        ? requestedOrigin
        : CANONICAL_API_ORIGIN;
    const signedUrl = new URL(value, `${trustedRequestOrigin}/`);
    const allowedOrigins = new Set([CANONICAL_API_ORIGIN, trustedRequestOrigin]);
    if (!allowedOrigins.has(signedUrl.origin)) {
        throw new Error('Signed document URL has an untrusted origin');
    }
    return signedUrl.toString();
};

const isApprovedDonation = (donation) =>
    APPROVED_DONATION_STATUSES.has(normalizeStatus(donation?.status));

const hasApprovalAudit = (donation) => Boolean(donation?.approved_by || donation?.approval_date);
const hasRejectionAudit = (donation) => Boolean(
    donation?.rejection_reason || donation?.rejected_by_id || donation?.rejected_at
);

const hasCompleteApprovalAudit = (donation) => Boolean(
    isApprovedDonation(donation)
    && donation?.approved_by
    && donation?.approval_date
    && !hasRejectionAudit(donation)
);

const donationReportReviewState = (donation) => {
    if (hasCompleteApprovalAudit(donation)) {
        return 'approved';
    }
    if (normalizeStatus(donation?.status) === 'rejected'
        && donation?.rejection_reason
        && donation?.rejected_by_id
        && donation?.rejected_at
        && !hasApprovalAudit(donation)) {
        return 'rejected';
    }
    if (normalizeStatus(donation?.status) === 'pending'
        && !hasApprovalAudit(donation)
        && !hasRejectionAudit(donation)) {
        return 'pending';
    }
    return 'inconsistent';
};

const donationWithoutRawReceipt = (donation) => {
    const safeDonation = { ...donation };
    for (const unsafeKey of UNSAFE_RECEIPT_RESPONSE_KEYS) {
        delete safeDonation[unsafeKey];
    }
    return safeDonation;
};

const donationDecisionNotification = ({ donation, decision, reason = null }) => {
    if (!donation?.member_id) {
        throw new Error('Initiative donation has no member for review notification');
    }

    const approved = decision === 'approved';
    const initiativeTitle = donation.initiative_title || 'المبادرة العائلية';
    const amount = Number(donation.amount);
    const formattedAmount = Number.isFinite(amount)
        ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(amount)
        : String(donation.amount || '');
    const title = approved ? 'تم اعتماد مساهمتك' : 'تم رفض مساهمتك';
    const body = approved
        ? `تم اعتماد مساهمتك بقيمة ${formattedAmount} ر.س في ${initiativeTitle}.`
        : `تم رفض مساهمتك بقيمة ${formattedAmount} ر.س في ${initiativeTitle}. السبب: ${reason}`;

    return {
        title,
        body,
        type: 'initiative_contribution_review',
        priority: 'high',
        relatedId: donation.initiative_id,
        relatedType: 'initiative',
        actionUrl: '/initiatives',
        data: {
            contribution_id: donation.id,
            decision
        }
    };
};

const persistDonationDecisionNotification = async ({ client, donation, decision, reason = null }) => {
    const notification = donationDecisionNotification({ donation, decision, reason });
    const persistence = await persistIdempotentMemberNotification(
        donation.member_id,
        notification,
        {
            client,
            idempotencyKey: `initiative-donation-review:${donation.id}:${decision}`
        }
    );
    return { notification, persistence };
};

const deliverDonationDecisionPush = async ({ donation, decision, notification }) => {
    try {
        const result = await sendPushNotification(
            donation.member_id,
            { title: notification.title, body: notification.body },
            { ...notification.data, type: notification.type }
        );
        if (!result?.success) {
            log.warn('Initiative contribution push was not delivered after commit', {
                donationId: donation.id,
                decision,
                error: result?.error
            });
        }
    } catch (error) {
        // The durable in-app notification was committed with the decision. An
        // idempotent HTTP replay will reuse it and retry this external delivery.
        log.warn('Initiative contribution push failed after commit', {
            donationId: donation.id,
            decision,
            error: error.message
        });
    }
};

// Helper function to check if user is admin
const getAdmin = async (userId) => {
    if (!isUuid(userId)) {
        return null;
    }

    try {
        const result = await query(
            `SELECT id, role, identity_source
               FROM (
                   SELECT id, role, 'users'::text AS identity_source, 1 AS source_priority
                     FROM users
                    WHERE id = $1
                      AND role = ANY($2::text[])
                      AND COALESCE(is_active, true) = true
                      AND COALESCE(NULLIF(LOWER(BTRIM(status)), ''), 'active') = 'active'
                   UNION ALL
                   SELECT id, role, 'members'::text AS identity_source, 2 AS source_priority
                     FROM members
                    WHERE id = $1
                      AND role = ANY($2::text[])
                      AND COALESCE(is_active, true) = true
                      AND COALESCE(NULLIF(LOWER(BTRIM(membership_status)), ''), 'active') = 'active'
                      AND NOT (
                          suspended_at IS NOT NULL
                          AND (reactivated_at IS NULL OR reactivated_at < suspended_at)
                      )
               ) privileged_identity
              ORDER BY source_priority
              LIMIT 1`,
            [userId, INITIATIVE_ADMIN_ROLES]
        );
        return result.rows[0] || null;
    } catch (error) {
        log.error('Error checking admin status', { error: error.message });
        return null;
    }
};

// Admin middleware
const adminOnly = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول أولاً' });
    }

    const admin = await getAdmin(userId);
    if (!admin) {
        return res.status(403).json({ success: false, error: 'ليس لديك صلاحية إدارة المبادرات' });
    }

    req.adminUser = admin;
    next();
};

const donationReviewerOnly = (req, res, next) => {
    if (!DONATION_REVIEW_ROLES.has(req.adminUser?.role)) {
        return res.status(403).json({
            success: false,
            error: 'ليس لديك صلاحية مراجعة المساهمات المالية'
        });
    }

    next();
};

const requireUuidParam = (paramName) => (req, res, next) => {
    if (!isUuid(req.params[paramName])) {
        return res.status(400).json({
            success: false,
            error: paramName === 'donationId' ? 'معرّف المساهمة غير صالح' : 'معرّف المبادرة غير صالح'
        });
    }
    next();
};

const initiativeIdRequired = requireUuidParam('id');
const donationIdRequired = requireUuidParam('donationId');

// ============================================
// ADMIN ENDPOINTS
// ============================================

// 1. CREATE INITIATIVE (Admin Only)
router.post('/', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { data, errors } = normalizeInitiativeInput(req.body);
        if (errors.length) {
            return res.status(400).json({ success: false, error: errors[0], errors });
        }

        const result = await query(
            `INSERT INTO initiatives
             (title, title_ar, title_en, description_ar, description_en, beneficiary_name_ar, beneficiary_name_en,
              target_amount, current_amount, min_contribution, max_contribution, start_date, end_date, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [data.title_ar || data.title_en, data.title_ar, data.title_en, data.description_ar, data.description_en,
             data.beneficiary_name_ar, data.beneficiary_name_en, data.target_amount ?? null,
             data.min_contribution ?? null, data.max_contribution ?? null,
             data.start_date ?? null, data.end_date ?? null, data.status, req.adminUser.id]
        );
        const _data = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المبادرة بنجاح',
            initiative: _data
        });
    } catch (error) {
        log.error('Create initiative error', { error: error.message, code: error.code });
        res.status(500).json({ success: false, error: 'تعذر إنشاء المبادرة، يرجى المحاولة مرة أخرى' });
    }
});

// 2. UPDATE INITIATIVE (Admin Only)
router.put('/:id', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: updates, errors } = normalizeInitiativeInput(req.body, { partial: true });
        if (errors.length) {
            return res.status(400).json({ success: false, error: errors[0], errors });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'لا توجد بيانات صالحة للتحديث' });
        }

        if (updates.title_ar !== undefined) {
            updates.title = updates.title_ar;
        } else if (updates.title_en) {
            updates.title = updates.title_en;
        }

        const fields = Object.keys(updates);
        const setClause = fields.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
        const values = Object.values(updates);

        const result = await query(
            `UPDATE initiatives SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        const _data = result.rows[0];

        if (!_data) {
            return res.status(404).json({ success: false, error: 'المبادرة غير موجودة' });
        }

        res.json({
            success: true,
            message: 'تم تحديث المبادرة بنجاح',
            initiative: _data
        });
    } catch (error) {
        log.error('Update initiative error', { error: error.message, code: error.code });
        res.status(500).json({ success: false, error: 'تعذر تحديث المبادرة، يرجى المحاولة مرة أخرى' });
    }
});

// 3. DELETE INITIATIVE (Admin Only)
router.delete('/:id', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
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
        const isEvidenceConflict = error.code === '23514';
        res.status(isEvidenceConflict ? 409 : 500).json({
            success: false,
            ...(isEvidenceConflict ? { code: 'INITIATIVE_EVIDENCE_CONFLICT' } : {}),
            error: isEvidenceConflict
                ? 'تعذر اعتماد المساهمة لأن إيصال التحويل غير صالح أو تغيرت بياناته'
                : error.message
        });
    }
});

// 4. CHANGE INITIATIVE STATUS (Admin Only)
router.patch('/:id/status', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, completion_notes } = req.body;

        if (!INITIATIVE_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'حالة المبادرة غير صالحة' });
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
            params.push(req.adminUser.id);
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

        if (status && !INITIATIVE_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'حالة المبادرة غير صالحة' });
        }

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
router.get('/:id/details', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
    let client;
    let transactionOpen = false;
    try {
        const { id } = req.params;

        // Initiative totals and donation-derived stats must come from one
        // authoritative snapshot, especially immediately after a review.
        client = await getClient();
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        transactionOpen = true;
        const initResult = await client.query(
            'SELECT * FROM initiatives WHERE id = $1',
            [id]
        );

        const initiative = initResult.rows[0];
        if (!initiative) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(404).json({ error: 'Initiative not found' });
        }

        const donResult = await client.query(
            `SELECT d.*,
                dm.id AS _receipt_metadata_id,
                dm.file_path AS _receipt_storage_path,
                dm.original_name AS _receipt_original_name,
                dm.file_size AS _receipt_file_size,
                dm.file_type AS _receipt_mime_type,
                json_build_object(
                    'id', m.id,
                    'full_name', m.full_name,
                    'full_name_en', m.full_name_en,
                    'membership_number', m.membership_number
                ) AS donor
             FROM initiative_donations d
             LEFT JOIN members m ON m.id = d.member_id
             LEFT JOIN documents_metadata dm
               ON dm.id = d.receipt_document_id
              AND dm.status = 'active'
              AND dm.member_id = d.member_id
              AND dm.category = 'receipts'
             WHERE d.initiative_id = $1
             ORDER BY d.created_at DESC`,
            [id]
        );
        await client.query('COMMIT');
        transactionOpen = false;

        const donations = (donResult.rows || []).map((row) => {
            const receiptMetadataId = row._receipt_metadata_id;
            const receiptStoragePath = row._receipt_storage_path;
            const receiptOriginalName = row._receipt_original_name;
            const receiptFileSize = row._receipt_file_size;
            const receiptMimeType = row._receipt_mime_type;
            const safeDonation = donationWithoutRawReceipt(row);

            let signedReceiptUrl = null;
            if (receiptMetadataId && receiptStoragePath) {
                try {
                    signedReceiptUrl = absoluteRequestUrl(req, getSignedUrl(receiptStoragePath));
                } catch (error) {
                    log.warn('Could not sign initiative receipt for report', {
                        donationId: row.id,
                        error: error.message
                    });
                }
            }

            return {
                ...safeDonation,
                review_state: donationReportReviewState(row),
                receipt_url: signedReceiptUrl,
                receipt_document: receiptMetadataId ? {
                    id: receiptMetadataId,
                    original_name: receiptOriginalName,
                    file_size: receiptFileSize,
                    mime_type: receiptMimeType,
                    receipt_url: signedReceiptUrl
                } : null
            };
        });

        // Calculate stats
        const totalDonations = donations.length;
        const uniqueDonors = new Set(donations.map(d => d.member_id)).size;
        const approvedAmount = donations
            .filter(d => d.review_state === 'approved')
            .reduce((sum, d) => sum + parseFloat(d.amount), 0);

        res.json({
            initiative,
            donations,
            stats: {
                totalDonations,
                uniqueDonors,
                approvedAmount,
                progressPercentage: initiativeProgress(approvedAmount, initiative.target_amount)
            }
        });
    } catch (error) {
        if (client && transactionOpen) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // Preserve the report error that caused the rollback.
            }
        }
        res.status(500).json({ error: error.message });
    } finally {
        client?.release();
    }
});

// 6. APPROVE DONATION (Financial Admin Only)
router.patch('/donations/:donationId/approve', authenticateToken, adminOnly, donationReviewerOnly, donationIdRequired, async (req, res) => {
    let client;
    let transactionOpen = false;
    try {
        const { donationId } = req.params;

        client = await getClient();
        await client.query('BEGIN');
        transactionOpen = true;
        const { rows } = await client.query(
            `SELECT d.*,
                    COALESCE(NULLIF(i.title_ar, ''), NULLIF(i.title_en, ''), i.title) AS initiative_title
               FROM initiative_donations d
               JOIN initiatives i ON i.id = d.initiative_id
              WHERE d.id = $1
              FOR UPDATE OF i, d`,
            [donationId]
        );
        const donation = rows[0];

        if (!donation) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(404).json({ success: false, error: 'المساهمة غير موجودة' });
        }

        // A lost HTTP response may cause the administrator to retry. Once the
        // row is approved, return the original reviewer/timestamp untouched.
        if (isApprovedDonation(donation)) {
            if (!hasCompleteApprovalAudit(donation)) {
                await client.query('ROLLBACK');
                transactionOpen = false;
                return res.status(409).json({
                    success: false,
                    code: 'INITIATIVE_APPROVAL_AUDIT_INCOMPLETE',
                    error: 'سجل الاعتماد القديم غير مكتمل ولا يمكن اعتباره قراراً نهائياً'
                });
            }
            const { notification } = await persistDonationDecisionNotification({
                client,
                donation,
                decision: 'approved'
            });
            await client.query('COMMIT');
            transactionOpen = false;
            await deliverDonationDecisionPush({
                donation,
                decision: 'approved',
                notification
            });
            return res.json({
                success: true,
                idempotent_replay: true,
                message: 'تم اعتماد هذه المساهمة مسبقاً',
                donation: donationWithoutRawReceipt(donation)
            });
        }

        if (normalizeStatus(donation.status) === 'pending'
            && (hasApprovalAudit(donation) || hasRejectionAudit(donation))) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_REVIEW_AUDIT_INCOMPLETE',
                error: 'سجل المراجعة القديم غير متسق ولا يمكن تعديله تلقائياً'
            });
        }

        if (normalizeStatus(donation.status) !== 'pending') {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_NOT_PENDING',
                error: 'لا يمكن اعتماد مساهمة خرجت من قائمة المراجعة'
            });
        }

        if (String(donation.payment_method || '').trim().toLowerCase() !== 'bank_transfer') {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'UNVERIFIED_INITIATIVE_PAYMENT_METHOD',
                error: 'لا يمكن اعتماد مساهمة إلكترونية غير موثقة'
            });
        }
        if (!donation.receipt_document_id) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_RECEIPT_REQUIRED',
                error: 'لا يمكن اعتماد المساهمة قبل إرفاق إيصال التحويل المؤرشف'
            });
        }

        await client.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
            [donation.receipt_document_id]
        );
        const receipt = await client.query(
            `SELECT id
               FROM documents_metadata
              WHERE id = $1 AND member_id = $2
                AND category = 'receipts' AND status = 'active'`,
            [donation.receipt_document_id, donation.member_id]
        );
        if (!receipt.rows[0]) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_RECEIPT_INVALID',
                error: 'إيصال المساهمة غير متاح أو لا يخص العضو صاحب المساهمة'
            });
        }

        const claimedReceipt = await client.query(
            `SELECT id
               FROM initiative_donations
              WHERE receipt_document_id = $1
                AND id <> $2
                AND (
                    LOWER(BTRIM(COALESCE(status, ''))) IN ('approved', 'completed', 'confirmed')
                    OR approved_by IS NOT NULL
                )
              LIMIT 1`,
            [donation.receipt_document_id, donationId]
        );
        if (claimedReceipt.rows[0]) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_RECEIPT_ALREADY_CLAIMED',
                error: 'هذا الإيصال مستخدم مسبقاً لاعتماد مساهمة أخرى'
            });
        }

        const result = await client.query(
            `UPDATE initiative_donations
                SET approved_by = $1, approval_date = NOW(), status = 'completed'
              WHERE id = $2
                AND LOWER(BTRIM(COALESCE(status, ''))) = 'pending'
              RETURNING *`,
            [req.adminUser.id, donationId]
        );
        const _data = result.rows[0];
        if (!_data) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_STATE_CHANGED',
                error: 'تغيرت حالة المساهمة أثناء المراجعة، حدّث التقرير وحاول مجدداً'
            });
        }

        // Trigger will auto-update initiative current_amount
        const approvedDonation = { ..._data, initiative_title: donation.initiative_title };
        const { notification } = await persistDonationDecisionNotification({
            client,
            donation: approvedDonation,
            decision: 'approved'
        });
        await client.query('COMMIT');
        transactionOpen = false;
        await deliverDonationDecisionPush({
            donation: approvedDonation,
            decision: 'approved',
            notification
        });

        res.json({
            success: true,
            idempotent_replay: false,
            message: 'تم اعتماد المساهمة بنجاح',
            donation: donationWithoutRawReceipt(approvedDonation)
        });
    } catch (error) {
        if (client && transactionOpen) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // The original error remains authoritative.
            }
        }
        const isEvidenceConflict = error.code === '23514';
        log.error('Approve initiative donation error', { error: error.message, code: error.code });
        res.status(isEvidenceConflict ? 409 : 500).json({
            success: false,
            ...(isEvidenceConflict ? { code: 'INITIATIVE_EVIDENCE_CONFLICT' } : {}),
            error: isEvidenceConflict
                ? 'تعذر اعتماد المساهمة لأن إيصال التحويل غير صالح أو تغيرت بياناته'
                : 'تعذر اعتماد المساهمة، يرجى المحاولة مرة أخرى'
        });
    } finally {
        client?.release();
    }
});

// 7. REJECT DONATION (Financial Admin Only)
router.patch('/donations/:donationId/reject', authenticateToken, adminOnly, donationReviewerOnly, donationIdRequired, async (req, res) => {
    const { reason, error: reasonError } = validateRejectionReason(req.body?.reason);
    if (reasonError) {
        return res.status(400).json({ success: false, error: reasonError });
    }

    let client;
    let transactionOpen = false;
    try {
        const { donationId } = req.params;
        client = await getClient();
        await client.query('BEGIN');
        transactionOpen = true;

        const { rows } = await client.query(
            `SELECT d.*,
                    COALESCE(NULLIF(i.title_ar, ''), NULLIF(i.title_en, ''), i.title) AS initiative_title
               FROM initiative_donations d
               JOIN initiatives i ON i.id = d.initiative_id
              WHERE d.id = $1
              FOR UPDATE OF i, d`,
            [donationId]
        );
        const donation = rows[0];

        if (!donation) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(404).json({ success: false, error: 'المساهمة غير موجودة' });
        }

        if (normalizeStatus(donation.status) === 'rejected') {
            const originalReason = normalizeReviewReason(donation.rejection_reason);
            if (!originalReason || !donation.rejected_by_id || !donation.rejected_at
                || hasApprovalAudit(donation)) {
                await client.query('ROLLBACK');
                transactionOpen = false;
                return res.status(409).json({
                    success: false,
                    code: 'INITIATIVE_REJECTION_AUDIT_INCOMPLETE',
                    error: 'سجل الرفض القديم غير مكتمل ولا يمكن تعديله تلقائياً'
                });
            }
            if (originalReason !== reason) {
                await client.query('ROLLBACK');
                transactionOpen = false;
                return res.status(409).json({
                    success: false,
                    code: 'INITIATIVE_REJECTION_AUDIT_IMMUTABLE',
                    error: 'تم رفض المساهمة مسبقاً ولا يمكن تغيير سبب الرفض المسجل'
                });
            }

            const { notification } = await persistDonationDecisionNotification({
                client,
                donation,
                decision: 'rejected',
                reason: originalReason
            });
            await client.query('COMMIT');
            transactionOpen = false;
            await deliverDonationDecisionPush({
                donation,
                decision: 'rejected',
                notification
            });
            return res.json({
                success: true,
                idempotent_replay: true,
                message: 'تم رفض هذه المساهمة مسبقاً',
                donation: donationWithoutRawReceipt(donation)
            });
        }

        if (normalizeStatus(donation.status) === 'pending'
            && (hasApprovalAudit(donation) || hasRejectionAudit(donation))) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_REVIEW_AUDIT_INCOMPLETE',
                error: 'سجل المراجعة القديم غير متسق ولا يمكن تعديله تلقائياً'
            });
        }

        if (normalizeStatus(donation.status) !== 'pending') {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_NOT_PENDING',
                error: isApprovedDonation(donation)
                    ? 'لا يمكن رفض مساهمة معتمدة'
                    : 'لا يمكن رفض مساهمة خرجت من قائمة المراجعة'
            });
        }

        const canonicalAuditColumns = ['rejection_reason', 'rejected_by_id', 'rejected_at'];
        const auditSchemaReady = canonicalAuditColumns.every((column) =>
            Object.prototype.hasOwnProperty.call(donation, column)
        );
        if (!auditSchemaReady) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            log.error('Initiative rejection audit migration is not applied', { donationId });
            return res.status(503).json({
                success: false,
                code: 'INITIATIVE_REVIEW_SCHEMA_NOT_READY',
                error: 'تعذر تسجيل الرفض بأمان لأن تحديث قاعدة البيانات غير مكتمل'
            });
        }

        const updatedAtAssignment = Object.prototype.hasOwnProperty.call(donation, 'updated_at')
            ? ', updated_at = NOW()'
            : '';
        const { rows: updatedRows } = await client.query(
            `UPDATE initiative_donations
                SET status = 'rejected',
                    rejection_reason = $1,
                    rejected_by_id = $2,
                    rejected_at = NOW()
                    ${updatedAtAssignment}
              WHERE id = $3
                AND LOWER(BTRIM(COALESCE(status, ''))) = 'pending'
              RETURNING *`,
            [reason, req.adminUser.id, donationId]
        );
        const updatedDonation = updatedRows[0];
        if (!updatedDonation) {
            await client.query('ROLLBACK');
            transactionOpen = false;
            return res.status(409).json({
                success: false,
                code: 'INITIATIVE_DONATION_STATE_CHANGED',
                error: 'تغيرت حالة المساهمة أثناء المراجعة، حدّث التقرير وحاول مجدداً'
            });
        }

        // A pending contribution is excluded from initiative totals. Rejection
        // updates only its review state; the amount ledger remains unchanged.
        const rejectedDonation = {
            ...updatedDonation,
            initiative_title: donation.initiative_title
        };
        const { notification } = await persistDonationDecisionNotification({
            client,
            donation: rejectedDonation,
            decision: 'rejected',
            reason
        });
        await client.query('COMMIT');
        transactionOpen = false;
        await deliverDonationDecisionPush({
            donation: rejectedDonation,
            decision: 'rejected',
            notification
        });

        res.json({
            success: true,
            idempotent_replay: false,
            message: 'تم رفض المساهمة وتسجيل السبب',
            donation: donationWithoutRawReceipt(rejectedDonation)
        });
    } catch (error) {
        if (client && transactionOpen) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // The original error remains authoritative.
            }
        }
        log.error('Reject initiative donation error', { error: error.message, code: error.code });
        res.status(500).json({
            success: false,
            error: 'تعذر رفض المساهمة، يرجى المحاولة مرة أخرى'
        });
    } finally {
        client?.release();
    }
});

// 8. GET NON-CONTRIBUTORS FOR INITIATIVE (Admin Only)
router.get('/:id/non-contributors', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
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
                'SELECT member_id FROM initiative_donations WHERE initiative_id = $1',
                [id]
            )
        ]);

        const allMembers = membersResult.rows;
        const donations = donationsResult.rows;

        // Create set of donor member IDs for fast lookup
        const donorIds = new Set(donations.map(d => d.member_id));

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
                contributionRate: allMembers.length > 0
                    ? ((donorIds.size / allMembers.length) * 100).toFixed(2)
                    : '0.00'
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
router.post('/:id/notify-non-contributors', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
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
                'SELECT member_id FROM initiative_donations WHERE initiative_id = $1',
                [id]
            )
        ]);

        const allMembers = membersResult.rows;
        const donations = donationsResult.rows;

        const donorIds = new Set(donations.map(d => d.member_id));
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
                req.adminUser.id,
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
            contributionRate: allMembers.length > 0
                ? ((donorIds.size / allMembers.length) * 100).toFixed(2)
                : '0.00'
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
router.post('/:id/push-notification', authenticateToken, adminOnly, initiativeIdRequired, async (req, res) => {
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
                req.adminUser.id,
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
            progress_percentage: initiativeProgress(init.current_amount, init.target_amount)
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
router.post('/:id/contribute', authenticateToken, initiativeIdRequired, (req, res) => {
    return res.status(410).json({
        success: false,
        code: 'LEGACY_INITIATIVE_CONTRIBUTION_RETIRED',
        error: 'تم إيقاف مسار المساهمة القديم. استخدم مسار المبادرات الموثق مع إيصال التحويل.'
    });
});

// 10. GET MY CONTRIBUTIONS (Members)
router.get('/my-contributions', authenticateToken, async (req, res) => {
    try {
        const memberId = req.user?.id;
        const memberResult = await query('SELECT id FROM members WHERE id = $1', [memberId]);
        if (!memberResult.rows[0]) {
            return res.status(400).json({ success: false, error: 'حساب العضو غير مرتبط بسجل أعضاء صالح' });
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
             WHERE d.member_id = $1
             ORDER BY d.created_at DESC`,
            [memberId]
        );

        res.json({ contributions: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
