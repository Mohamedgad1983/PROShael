/**
 * Social Security Onboarding Route
 *
 * One-time prompt shown to every member on first app launch:
 *   "هل أنت مستفيد من الضمان الاجتماعي؟" (Are you a social security beneficiary?)
 *
 * The member's answer is saved on `members.social_security_beneficiary` and
 * the timestamp on `members.social_security_answered_at`. They MUST also
 * upload a national ID photo, which is stored via the same documents pipeline
 * the admin's MemberDocuments tab already reads (category = 'national_id'),
 * so it appears under that member's documents folder automatically.
 *
 * Endpoints:
 *   GET  /api/members/social-security/status  → { answered, is_beneficiary, answered_at }
 *   POST /api/members/social-security         → multipart: { is_beneficiary, national_id (file) }
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../utils/logger.js';
import { query } from '../services/database.js';
import {
  upload,
  uploadToSupabase,
  DOCUMENT_CATEGORIES,
  CATEGORY_TRANSLATIONS
} from '../config/documentStorage.js';

const router = express.Router();

/**
 * GET /api/members/social-security/status
 * iOS calls this on launch — if `answered === false`, the modal is shown.
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const memberId = req.user.id;
    const { rows } = await query(
      `SELECT social_security_beneficiary, social_security_answered_at
       FROM members
       WHERE id = $1`,
      [memberId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    const row = rows[0];
    return res.json({
      success: true,
      data: {
        answered: row.social_security_answered_at !== null,
        is_beneficiary: row.social_security_beneficiary,
        answered_at: row.social_security_answered_at
      }
    });
  } catch (error) {
    log.error('[SocialSecurity] status error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الحالة',
      message_en: 'Failed to fetch status'
    });
  }
});

/**
 * POST /api/members/social-security
 *
 * Multipart body:
 *   - is_beneficiary: 'true' | 'false' (string, required)
 *   - national_id:    file (jpg/png/pdf/webp, required, max 10MB — multer field name)
 *
 * Side effects:
 *   1. Updates `members.social_security_beneficiary` + `social_security_answered_at`
 *   2. Inserts a row into `documents_metadata` with category = 'national_id'
 *      so the admin sees the file in the member's documents folder.
 *   3. Saves the file under {UPLOAD_DIR}/member-documents/{member_id}/national_id/...
 */
router.post('/', authenticateToken, upload.single('national_id'), async (req, res) => {
  try {
    const memberId = req.user.id;
    const { is_beneficiary } = req.body;

    // ─── validate input ─────────────────────────────────────────────
    if (typeof is_beneficiary === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'يجب الإجابة على السؤال',
        message_en: 'Beneficiary answer is required'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يرجى رفع صورة الهوية الوطنية',
        message_en: 'National ID photo is required'
      });
    }

    // Coerce 'true'/'false'/'1'/'0'/true/false → boolean
    const beneficiaryBool = is_beneficiary === true
      || is_beneficiary === 'true'
      || is_beneficiary === '1'
      || is_beneficiary === 1;

    // ─── 1. save the file ───────────────────────────────────────────
    const uploadResult = await uploadToSupabase(
      req.file,
      memberId,
      DOCUMENT_CATEGORIES.NATIONAL_ID
    );

    // ─── 2. insert documents_metadata row (so it appears in admin's documents tab)
    const { rows: docRows } = await query(
      `INSERT INTO documents_metadata
        (member_id, title, description, category, file_path, file_size, file_type, original_name, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING id, file_path, created_at`,
      [
        memberId,
        'الهوية الوطنية',
        'تم رفعها أثناء سؤال الضمان الاجتماعي',
        DOCUMENT_CATEGORIES.NATIONAL_ID,
        uploadResult.path,
        uploadResult.size,
        uploadResult.type,
        req.file.originalname,
        memberId
      ]
    );

    // ─── 3. update the member flags ─────────────────────────────────
    await query(
      `UPDATE members
       SET social_security_beneficiary = $1,
           social_security_answered_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [beneficiaryBool, memberId]
    );

    log.info('[SocialSecurity] answered + national_id uploaded', {
      member_id: memberId,
      is_beneficiary: beneficiaryBool,
      document_id: docRows[0]?.id
    });

    return res.json({
      success: true,
      message: 'تم حفظ بياناتك بنجاح',
      message_en: 'Saved successfully',
      data: {
        is_beneficiary: beneficiaryBool,
        answered_at: new Date().toISOString(),
        document: {
          id: docRows[0]?.id,
          category: DOCUMENT_CATEGORIES.NATIONAL_ID,
          category_name: CATEGORY_TRANSLATIONS[DOCUMENT_CATEGORIES.NATIONAL_ID],
          url: uploadResult.url
        }
      }
    });
  } catch (error) {
    log.error('[SocialSecurity] submit error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حفظ البيانات',
      message_en: 'Failed to save',
      error: error.message
    });
  }
});

export default router;
