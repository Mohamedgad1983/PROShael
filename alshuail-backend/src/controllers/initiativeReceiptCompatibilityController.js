import { getClient } from '../services/database.js';
import { log } from '../utils/logger.js';
import {
  uploadToSupabase as uploadDocumentFile,
  getSignedUrl as getDocumentUrl,
  deleteFromSupabase as deleteDocumentFile
} from '../config/documentStorage.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Compatibility for App Store builds that create the contribution first and
// then upload the image to /api/payments/mobile/upload-receipt with activityId.
// New builds send contribution + receipt atomically to /api/initiatives/:id/contribute.
export const uploadLegacyInitiativeReceipt = async (req, res) => {
  const activityId = req.body?.activityId;
  const memberId = req.user?.id;
  const uploadedFile = req.file || (Array.isArray(req.files) && req.files[0]) || null;

  if (!memberId) {
    return res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول مجدداً' });
  }
  if (!activityId || !UUID_PATTERN.test(String(activityId))) {
    return res.status(400).json({ success: false, error: 'معرّف المبادرة غير صالح' });
  }
  if (!uploadedFile) {
    return res.status(400).json({ success: false, error: 'ملف الإيصال مطلوب' });
  }

  let client;
  let transactionStarted = false;
  let savedFilePath = null;

  try {
    client = await getClient();
    await client.query('BEGIN');
    transactionStarted = true;

    const { rows: activityRows } = await client.query(
      `SELECT ac.id, ac.reference_number,
              COALESCE(a.name_ar, a.title_ar, a.name_en, a.title_en) AS initiative_title
         FROM activity_contributions ac
         JOIN activities a ON a.id = ac.activity_id
        WHERE ac.activity_id = $1
          AND ac.member_id = $2
          AND ac.receipt_document_id IS NULL
          AND ac.status = 'pending'
        ORDER BY ac.created_at DESC
        LIMIT 1
        FOR UPDATE OF ac`,
      [activityId, memberId]
    );

    let sourceType = 'activity';
    let contribution = activityRows[0] || null;
    if (!contribution) {
      const { rows: donationRows } = await client.query(
        `SELECT d.id, d.payment_reference AS reference_number,
                COALESCE(i.title_ar, i.title, i.name_ar, i.title_en, i.name_en) AS initiative_title
           FROM initiative_donations d
           JOIN initiatives i ON i.id = d.initiative_id
          WHERE d.initiative_id = $1
            AND d.member_id = $2
            AND d.receipt_document_id IS NULL
            AND d.status = 'pending'
          ORDER BY d.created_at DESC
          LIMIT 1
          FOR UPDATE OF d`,
        [activityId, memberId]
      );
      contribution = donationRows[0] || null;
      sourceType = 'initiative';
    }

    if (!contribution) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على مساهمة معلقة لربط الإيصال بها'
      });
    }

    const uploaded = await uploadDocumentFile(uploadedFile, memberId, 'receipts');
    savedFilePath = uploaded.path;
    const receiptUrl = getDocumentUrl(uploaded.path);

    const { rows: documentRows } = await client.query(
      `INSERT INTO documents_metadata (
         member_id, uploaded_by, title, description, category,
         file_path, file_size, file_type, original_name, status
       ) VALUES ($1, $1, $2, $3, 'receipts', $4, $5, $6, $7, 'active')
       RETURNING id`,
      [
        memberId,
        `وصل مساهمة - ${contribution.initiative_title || 'مبادرة عائلية'}`,
        contribution.reference_number
          ? `مساهمة رقم ${contribution.reference_number}`
          : 'وصل مساهمة من تطبيق الأعضاء',
        uploaded.path,
        uploaded.size,
        uploaded.type,
        uploadedFile.originalname
      ]
    );
    const documentId = documentRows[0].id;

    if (sourceType === 'activity') {
      await client.query(
        `UPDATE activity_contributions
            SET receipt_document_id = $1, updated_at = NOW()
          WHERE id = $2 AND member_id = $3`,
        [documentId, contribution.id, memberId]
      );
    } else {
      await client.query(
        `UPDATE initiative_donations
            SET receipt_document_id = $1, receipt_url = $2
          WHERE id = $3 AND member_id = $4`,
        [documentId, receiptUrl, contribution.id, memberId]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return res.json({
      success: true,
      data: {
        contribution_id: String(contribution.id),
        initiative_id: String(activityId),
        receipt_document_id: String(documentId),
        receipt_url: receiptUrl,
        source_type: sourceType
      },
      message: 'تم رفع الإيصال وربطه بالمساهمة بنجاح'
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        log.warn('Failed to roll back legacy initiative receipt', { error: rollbackError.message });
      }
    }
    if (savedFilePath) {
      try {
        await deleteDocumentFile(savedFilePath);
      } catch (cleanupError) {
        log.warn('Failed to clean up legacy initiative receipt', {
          filePath: savedFilePath,
          error: cleanupError.message
        });
      }
    }
    log.error('Legacy initiative receipt upload failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'تعذر رفع إيصال المساهمة. يرجى المحاولة مرة أخرى.'
    });
  } finally {
    client?.release();
  }
};
