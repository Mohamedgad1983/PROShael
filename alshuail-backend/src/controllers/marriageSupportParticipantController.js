/**
 * Participant-facing marriage-support workflow handlers.
 *
 * Access is derived from request assignments, not from a caller-provided role:
 * beneficiary, witness 1, witness 2, and committee chair can each see and sign
 * the requests in which they participate.
 */

import path from 'path';
import { query } from '../services/database.js';
import { getSignedUrl, readFile } from '../config/documentStorage.js';
import { log } from '../utils/logger.js';
import {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  calculateAndSnapshot,
  deriveParticipantRole,
  generatePdfAndStamp,
  getParticipantRequest,
  listParticipantRequests,
  notifyNextSigner,
  recordSignature,
  transitionStatus,
  updateWitnessAssignments,
  validateWitnessAssignments,
} from '../services/marriageSupportService.js';
import { streamMarriageSupportPdf } from '../services/marriageSupportPdf.js';
import { getStatusHistory } from '../services/statusHistoryService.js';

const STAFF_PDF_ROLES = new Set([
  'super_admin',
  'admin',
  'financial_manager',
  'marriage_committee_chair',
]);

const CONTRACT_MIME_TYPES = new Map([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

const CLIENT_ERROR_CODES = new Set([
  'WITNESSES_REQUIRED',
  'WITNESSES_MUST_BE_DISTINCT',
  'WITNESS_CANNOT_BE_BENEFICIARY',
  'WITNESS_NOT_FOUND',
]);

const CONFLICT_ERROR_CODES = new Set([
  'OUT_OF_ORDER',
  'INVALID_STATE',
  'ILLEGAL_TRANSITION',
  'HASH_MISMATCH',
  'NO_HASH',
  'NO_NEXT_SIGNER',
  'NEXT_SIGNER_UNASSIGNED',
]);

function isCommitteeChair(user) {
  return user && (user.role === 'marriage_committee_chair' || user.role === 'super_admin');
}

/**
 * Replace the private storage path with a short-lived document URL. Keep the
 * existing response key for shipped-client compatibility, but never serialize
 * the underlying archive path to a participant.
 */
function signMarriageContractUrl(request) {
  if (!request || !Object.prototype.hasOwnProperty.call(request, 'marriage_contract_url')) {
    return request;
  }

  const { marriage_contract_url: contractPath, ...safeRequest } = request;
  return {
    ...safeRequest,
    marriage_contract_url: contractPath ? getSignedUrl(contractPath) : null,
  };
}

async function getOptionalRepaymentPlan(requestId, memberId) {
  try {
    const repaymentService = await import('../services/financingRepaymentService.js');
    return await repaymentService.getRepaymentPlanByRequest({
      programType: repaymentService.FINANCING_PROGRAM.MARRIAGE,
      requestId,
      memberId,
    });
  } catch (error) {
    // Financing is rolling out separately. Marriage request detail must remain
    // available when either the module or its tables are not deployed yet.
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === '42P01' || /financing_/i.test(error.message)) {
      log.warn('[marriageParticipant] repayment plan unavailable', {
        requestId,
        error: error.message,
      });
      return null;
    }
    throw error;
  }
}

function sendWorkflowError(res, error, logContext) {
  if (error.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, code: error.code, error: 'الطلب غير موجود' });
  }
  if (['PARTICIPANT_FORBIDDEN', 'SIGNER_MISMATCH'].includes(error.code)) {
    return res.status(403).json({ success: false, code: error.code, error: 'غير مصرح لك بالتوقيع على هذا الطلب' });
  }
  if (CLIENT_ERROR_CODES.has(error.code)) {
    return res.status(400).json({ success: false, code: error.code, error: error.message });
  }
  if (CONFLICT_ERROR_CODES.has(error.code)) {
    return res.status(409).json({ success: false, code: error.code, error: error.message });
  }
  log.error(logContext, { error: error.message, stack: error.stack });
  return res.status(500).json({ success: false, error: 'فشل تنفيذ العملية' });
}

export const listMyParticipantRequests = async (req, res) => {
  try {
    const requests = await listParticipantRequests(req.user.id);
    return res.json({
      success: true,
      data: requests.map(signMarriageContractUrl),
    });
  } catch (error) {
    log.error('[marriageParticipant] list', { error: error.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلبات' });
  }
};

export const getMyParticipantRequest = async (req, res) => {
  try {
    const request = await getParticipantRequest({
      requestId: req.params.id,
      memberId: req.user.id,
    });
    if (!request) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const history = await getStatusHistory({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: request.id,
    });
    const repaymentPlan = request.participant_role === SIGNER_ROLE.BENEFICIARY
      ? await getOptionalRepaymentPlan(request.id, req.user.id)
      : null;
    return res.json({
      success: true,
      data: {
        ...signMarriageContractUrl(request),
        history,
        repayment_plan: repaymentPlan,
      },
    });
  } catch (error) {
    log.error('[marriageParticipant] detail', { error: error.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلب' });
  }
};

export const signAsParticipant = async (req, res) => {
  try {
    // signerRole and signerMemberId are never accepted from req.body.
    const result = await recordSignature({
      requestId: req.params.id,
      signerMemberId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({
      success: true,
      message: result.alreadySigned ? 'تم تسجيل توقيعك مسبقاً' : 'تم تسجيل التوقيع',
      data: result,
    });
  } catch (error) {
    return sendWorkflowError(res, error, '[marriageParticipant] sign');
  }
};

export const downloadParticipantPdf = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM marriage_support_requests WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];
    const participantRole = deriveParticipantRole(request, req.user.id);
    if (!participantRole && !STAFF_PDF_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    const { rows: signatures } = await query(
      `SELECT signer_role, signer_name, signer_member_id, signed_at
         FROM marriage_support_signatures
        WHERE request_id = $1
        ORDER BY signed_at ASC`,
      [request.id]
    );
    request.signatures = signatures;
    await streamMarriageSupportPdf(request, res);
    return undefined;
  } catch (error) {
    log.error('[marriageParticipant] downloadPdf', { error: error.message });
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'فشل إنشاء الـ PDF' });
    }
    return undefined;
  }
};

/**
 * Return the uploaded marriage contract through an authenticated endpoint.
 * The database stores only a server-generated relative path; clients never
 * receive a filesystem path and authorization is derived from assignments.
 */
export const downloadParticipantContract = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, member_id, witness_1_id, witness_2_id, committee_chair_id,
              marriage_contract_url
         FROM marriage_support_requests
        WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }

    const request = rows[0];
    const participantRole = deriveParticipantRole(request, req.user.id);
    if (!participantRole && !STAFF_PDF_ROLES.has(req.user.role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    if (!request.marriage_contract_url) {
      return res.status(404).json({ success: false, error: 'عقد الزواج غير مرفق' });
    }

    const contract = await readFile(request.marriage_contract_url);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'ملف عقد الزواج غير موجود' });
    }

    const extension = path.extname(request.marriage_contract_url).toLowerCase();
    const safeExtension = CONTRACT_MIME_TYPES.has(extension) ? extension : '';
    res.setHeader('Content-Type', CONTRACT_MIME_TYPES.get(extension) || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="marriage-contract-${request.id}${safeExtension}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(contract);
  } catch (error) {
    log.error('[marriageParticipant] downloadContract', { error: error.message });
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'فشل تحميل عقد الزواج' });
    }
    return undefined;
  }
};

export const remindNextSigner = async (req, res) => {
  try {
    const result = await notifyNextSigner({
      requestId: req.params.id,
      requestedById: req.user.id,
    });
    if (result.notified) {
      const message = 'تم إرسال التذكير للموقّع التالي';
      return res.json({ success: true, message, data: { ...result, message } });
    }
    if (result.cooldown_active) {
      const message = 'تم إرسال تذكير حديثاً، يرجى الانتظار قبل إعادة الإرسال';
      return res.json({ success: true, message, data: { ...result, message } });
    }
    const message = 'تعذر تسجيل التذكير أو تسليمه، يرجى المحاولة لاحقاً';
    return res.status(502).json({
      success: false,
      code: 'NOTIFICATION_DELIVERY_FAILED',
      error: message,
      data: { ...result, message },
    });
  } catch (error) {
    return sendWorkflowError(res, error, '[marriageParticipant] remindNextSigner');
  }
};

/** Secure replacement for the legacy unguarded witness/calculation handler. */
export const enterCommitteeDataSecure = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const {
      contributions_sum,
      previous_ananiyat_count_override = null,
      additional_support_balance = 0,
      special_ananiya_value = 0,
      witness_1_id,
      witness_2_id,
    } = req.body || {};
    if (contributions_sum === undefined || contributions_sum === null) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CONTRIBUTIONS_SUM',
        error: 'مجموع المساهمات مطلوب',
      });
    }
    const contributionsSum = Number(contributions_sum);
    if (!Number.isFinite(contributionsSum) || contributionsSum < 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CONTRIBUTIONS_SUM',
        error: 'مجموع المساهمات غير صالح',
      });
    }

    if (witness_1_id || witness_2_id) {
      await updateWitnessAssignments({
        requestId: req.params.id,
        witness1Id: witness_1_id,
        witness2Id: witness_2_id,
      });
    }
    const calculated = await calculateAndSnapshot({
      requestId: req.params.id,
      contributionsSum,
      previousAnaniyatOverride: previous_ananiyat_count_override,
      additionalSupportBalance: additional_support_balance,
      specialAnaniyaValue: special_ananiya_value,
    });
    // Existing stored assignments count, but both valid witnesses must be in
    // place before leaving committee review or the request would dead-end.
    await validateWitnessAssignments(calculated);
    const updated = await transitionStatus({
      requestId: req.params.id,
      toStatus: MARRIAGE_STATUS.DATA_ENTERED,
      changedById: req.user.id,
      actorRole: 'marriage_committee_chair',
      note: 'تم إدخال بيانات الحساب',
    });
    return res.json({ success: true, data: { ...calculated, ...updated } });
  } catch (error) {
    return sendWorkflowError(res, error, '[marriageParticipant] enterCommitteeData');
  }
};

export const generatePdfSecure = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const updated = await generatePdfAndStamp({
      requestId: req.params.id,
      changedById: req.user.id,
      actorRole: 'marriage_committee_chair',
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return sendWorkflowError(res, error, '[marriageParticipant] generatePdf');
  }
};

export default {
  listMyParticipantRequests,
  getMyParticipantRequest,
  signAsParticipant,
  downloadParticipantContract,
  downloadParticipantPdf,
  remindNextSigner,
  enterCommitteeDataSecure,
  generatePdfSecure,
};
