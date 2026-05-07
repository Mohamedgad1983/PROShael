/**
 * Marriage Support Controller — member-side endpoints
 *
 * Routes (mounted under /api/marriage-support by routes/marriageSupport.js):
 *   GET    /eligibility-check   — pre-form check
 *   GET    /me                  — list the current member's marriage requests
 *   GET    /me/:id              — full detail
 *   POST   /                    — create a new request (multipart with marriage contract)
 *   POST   /me/:id/sign         — beneficiary signs إقرار الدين
 *   DELETE /me/:id              — cancel (only while in early review)
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { uploadToSupabase } from '../config/documentStorage.js';
import {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  checkEligibility,
  validateRequestPayload,
  createRequest,
  transitionStatus,
  recordSignature,
} from '../services/marriageSupportService.js';
import { getStatusHistory } from '../services/statusHistoryService.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchSignatures(requestId) {
  const { rows } = await query(
    `SELECT id, signer_role, signer_member_id, signer_name, signed_at, ip_address, signature_method
     FROM marriage_support_signatures
     WHERE request_id = $1
     ORDER BY signed_at ASC`,
    [requestId]
  );
  return rows;
}

// ─── handlers ─────────────────────────────────────────────────────────────────

export const getEligibility = async (req, res) => {
  try {
    const result = await checkEligibility(req.user.id);
    return res.json({ success: result.ok, data: result });
  } catch (err) {
    log.error('[marriage] getEligibility', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل التحقق من الأهلية' });
  }
};

export const listMy = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, sequence_number, status, spouse_name_ar, marriage_date,
              final_amount, created_at, updated_at, rejection_reason
       FROM marriage_support_requests
       WHERE member_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    log.error('[marriage] listMy', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلبات' });
  }
};

export const getMy = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM marriage_support_requests WHERE id = $1 AND member_id = $2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];
    const signatures = await fetchSignatures(request.id);
    const history = await getStatusHistory({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: request.id,
    });
    return res.json({ success: true, data: { ...request, signatures, history } });
  } catch (err) {
    log.error('[marriage] getMy', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلب' });
  }
};

export const create = async (req, res) => {
  try {
    const elig = await checkEligibility(req.user.id);
    if (!elig.ok) {
      return res.status(403).json({ success: false, error: elig.message, code: elig.code });
    }
    const validationError = await validateRequestPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, ...validationError });
    }

    // Upload marriage contract if provided.
    let contractUrl = null;
    if (req.file) {
      try {
        const upload = await uploadToSupabase(req.file, req.user.id, 'marriage-contract');
        contractUrl = upload.path;
      } catch (uploadErr) {
        log.warn('[marriage] contract upload failed (continuing without)', { error: uploadErr.message });
      }
    }

    const created = await createRequest({
      memberId: req.user.id,
      payload: { ...req.body, marriage_contract_url: contractUrl },
    });

    log.info('[marriage] created', { requestId: created.id, seq: created.sequence_number });

    return res.status(201).json({
      success: true,
      message: `تم استلام طلب دعم الزواج برقم ${created.sequence_number}`,
      data: created,
    });
  } catch (err) {
    log.error('[marriage] create', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'فشل إنشاء الطلب', detail: err.message });
  }
};

export const signBeneficiary = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, status, member_id, applicant_name FROM marriage_support_requests WHERE id = $1 AND member_id = $2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];
    const result = await recordSignature({
      requestId: request.id,
      signerRole: SIGNER_ROLE.BENEFICIARY,
      signerMemberId: req.user.id,
      signerName: request.applicant_name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'OUT_OF_ORDER' || err.code === 'INVALID_STATE' || err.code === 'HASH_MISMATCH' || err.code === 'NO_HASH') {
      return res.status(409).json({ success: false, code: err.code, error: err.message });
    }
    log.error('[marriage] signBeneficiary', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل تسجيل التوقيع' });
  }
};

export const cancelMy = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, status FROM marriage_support_requests WHERE id = $1 AND member_id = $2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];
    if (![MARRIAGE_STATUS.SUBMITTED, MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW].includes(request.status)) {
      return res.status(409).json({
        success: false,
        code: 'CANNOT_CANCEL',
        message: 'لا يمكن إلغاء الطلب في هذه المرحلة',
        message_en: 'This request can no longer be cancelled',
      });
    }
    const updated = await transitionStatus({
      requestId: request.id,
      toStatus: MARRIAGE_STATUS.CANCELLED,
      changedById: req.user.id,
      actorRole: 'member',
      note: 'إلغاء من قِبل العضو',
      extraUpdates: { cancelled_at: new Date(), cancelled_by_id: req.user.id },
    });
    return res.json({ success: true, message: 'تم إلغاء الطلب', data: updated });
  } catch (err) {
    log.error('[marriage] cancelMy', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل إلغاء الطلب' });
  }
};
