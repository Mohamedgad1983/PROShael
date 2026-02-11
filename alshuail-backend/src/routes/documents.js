import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../utils/logger.js';
import { query } from '../services/database.js';
import {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
  getSignedUrl,
  DOCUMENT_CATEGORIES,
  CATEGORY_TRANSLATIONS
} from '../config/documentStorage.js';

const router = express.Router();

// Upload document
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء تحديد ملف',
        message_en: 'Please select a file'
      });
    }

    const {
      title,
      description,
      category = 'other',
      member_id
    } = req.body;

    // Get the actual member_id from the authenticated user
    // For members, req.user.id IS the member_id
    // For admins, member_id MUST be provided in request body
    let targetMemberId;

    if (req.user.role === 'member') {
      // For members, use their own member ID (req.user.id)
      targetMemberId = req.user.id;
    } else {
      // For admin/super_admin, member_id must be provided
      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد معرف العضو عند الرفع كمسؤول',
          message_en: 'Member ID is required when uploading as admin',
          hint: 'Please provide member_id in the request body'
        });
      }
      targetMemberId = member_id;
    }

    // Validate category
    if (!Object.values(DOCUMENT_CATEGORIES).includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'فئة غير صالحة',
        message_en: 'Invalid category'
      });
    }

    // Upload to storage
    const uploadResult = await uploadToSupabase(req.file, targetMemberId, category);

    // Save metadata to database
    const { rows } = await query(
      `INSERT INTO documents_metadata
        (member_id, title, description, category, file_path, file_size, file_type, original_name, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        targetMemberId,
        title || req.file.originalname,
        description || '',
        category,
        uploadResult.path,
        uploadResult.size,
        uploadResult.type,
        req.file.originalname,
        req.user.id,
        'active'
      ]
    );
    const document = rows[0];

    res.json({
      success: true,
      message: 'تم رفع المستند بنجاح',
      message_en: 'Document uploaded successfully',
      data: {
        ...document,
        category_name: CATEGORY_TRANSLATIONS[category]
      }
    });

  } catch (error) {
    log.error('Upload error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع المستند',
      message_en: 'Error uploading document',
      error: error.message
    });
  }
});

// Get all documents (admin view with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only admin/super_admin can view all documents
    if (!['admin', 'super_admin', 'financial_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized - Admin access required'
      });
    }

    const {
      category,
      search,
      memberId,
      page = 1,
      limit = 25
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE conditions
    const conditions = [`dm.status = 'active'`];
    const params = [];
    let paramIdx = 1;

    if (memberId) {
      conditions.push(`dm.member_id = $${paramIdx++}`);
      params.push(memberId);
    }

    if (category) {
      conditions.push(`dm.category = $${paramIdx++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(dm.title ILIKE $${paramIdx} OR dm.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await query(
      `SELECT count(*) FROM documents_metadata dm ${whereClause}`,
      params
    );
    const count = parseInt(countResult.rows[0].count);

    // Data query with JOIN on members
    const dataParams = [...params, limitNum, offset];
    const { rows: documents } = await query(
      `SELECT dm.*,
              m.full_name_ar AS member_full_name_ar,
              m.full_name AS member_full_name,
              m.membership_number AS member_membership_number
       FROM documents_metadata dm
       LEFT JOIN members m ON m.id = dm.member_id
       ${whereClause}
       ORDER BY dm.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataParams
    );

    // Add category translations and signed URLs
    const documentsWithDetails = await Promise.all((documents || []).map(async (doc) => {
      const signedUrl = await getSignedUrl(doc.file_path);
      return {
        id: doc.id,
        member_id: doc.member_id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        category_name: CATEGORY_TRANSLATIONS[doc.category],
        file_url: signedUrl,
        file_name: doc.original_name,
        file_size: doc.file_size,
        mime_type: doc.file_type,
        uploaded_at: doc.created_at,
        member: doc.member_full_name_ar ? {
          full_name_ar: doc.member_full_name_ar,
          full_name: doc.member_full_name,
          membership_number: doc.member_membership_number
        } : null
      };
    }));

    res.json({
      success: true,
      data: documentsWithDetails,
      documents: documentsWithDetails,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum)
    });

  } catch (error) {
    log.error('Fetch all documents error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستندات',
      message_en: 'Error fetching documents',
      error: error.message
    });
  }
});

// Get all documents for a member
router.get('/member/:memberId?', authenticateToken, async (req, res) => {
  try {
    const memberId = req.params.memberId || req.user.id;
    const { category, search, limit = 50, offset = 0 } = req.query;

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Build dynamic WHERE conditions
    const conditions = [`member_id = $1`, `status = 'active'`];
    const params = [memberId];
    let paramIdx = 2;

    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countResult = await query(
      `SELECT count(*) FROM documents_metadata ${whereClause}`,
      params
    );
    const count = parseInt(countResult.rows[0].count);

    // Data query
    const dataParams = [...params, limitNum, offsetNum];
    const { rows: documents } = await query(
      `SELECT * FROM documents_metadata
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataParams
    );

    // Add category translations and signed URLs
    const documentsWithDetails = await Promise.all((documents || []).map(async (doc) => {
      const signedUrl = await getSignedUrl(doc.file_path);
      return {
        ...doc,
        category_name: CATEGORY_TRANSLATIONS[doc.category],
        signed_url: signedUrl
      };
    }));

    res.json({
      success: true,
      data: documentsWithDetails,
      total: count,
      metadata: {
        limit: limitNum,
        offset: offsetNum,
        categories: CATEGORY_TRANSLATIONS
      }
    });

  } catch (error) {
    log.error('Fetch error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستندات',
      message_en: 'Error fetching documents',
      error: error.message
    });
  }
});

// Download document (redirect to signed URL)
router.get('/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const { rows } = await query(
      'SELECT * FROM documents_metadata WHERE id = $1',
      [documentId]
    );
    const document = rows[0];

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
        message_en: 'Document not found'
      });
    }

    // Check permission - admin/super_admin can download any document
    if (document.member_id !== req.user.id &&
        !['admin', 'super_admin', 'financial_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    // Generate signed URL for download (1 hour expiry)
    const signedUrl = await getSignedUrl(document.file_path, 3600);

    // Redirect to signed URL for direct download
    res.redirect(signedUrl);

  } catch (error) {
    log.error('Download error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في تحميل المستند',
      message_en: 'Error downloading document',
      error: error.message
    });
  }
});

// Get single document
router.get('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const { rows } = await query(
      'SELECT * FROM documents_metadata WHERE id = $1',
      [documentId]
    );
    const document = rows[0];

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
        message_en: 'Document not found'
      });
    }

    // Check permission - admin/super_admin can view any document
    if (document.member_id !== req.user.id &&
        !['admin', 'super_admin', 'financial_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    // Generate signed URL for download
    const signedUrl = await getSignedUrl(document.file_path, 3600);

    res.json({
      success: true,
      data: {
        ...document,
        category_name: CATEGORY_TRANSLATIONS[document.category],
        signed_url: signedUrl
      }
    });

  } catch (error) {
    log.error('Fetch error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستند',
      message_en: 'Error fetching document',
      error: error.message
    });
  }
});

// Update document metadata
router.put('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, description, category } = req.body;

    // Verify ownership
    const { rows: existingRows } = await query(
      'SELECT member_id FROM documents_metadata WHERE id = $1',
      [documentId]
    );
    const existing = existingRows[0];

    if (!existing || (existing.member_id !== req.user.id &&
        !['admin', 'super_admin', 'financial_manager'].includes(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    // Build dynamic SET clause
    const setClauses = [];
    const params = [];
    let paramIdx = 1;

    if (title) {
      setClauses.push(`title = $${paramIdx++}`);
      params.push(title);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(description);
    }
    if (category && Object.values(DOCUMENT_CATEGORIES).includes(category)) {
      setClauses.push(`category = $${paramIdx++}`);
      params.push(category);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث',
        message_en: 'No data to update'
      });
    }

    params.push(documentId);
    const { rows } = await query(
      `UPDATE documents_metadata SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );
    const document = rows[0];

    res.json({
      success: true,
      message: 'تم تحديث المستند بنجاح',
      message_en: 'Document updated successfully',
      data: {
        ...document,
        category_name: CATEGORY_TRANSLATIONS[document.category]
      }
    });

  } catch (error) {
    log.error('Update error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المستند',
      message_en: 'Error updating document',
      error: error.message
    });
  }
});

// Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Get document details
    const { rows: docRows } = await query(
      'SELECT * FROM documents_metadata WHERE id = $1',
      [documentId]
    );
    const document = docRows[0];

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
        message_en: 'Document not found'
      });
    }

    // Check permission - admin/super_admin can delete any document
    if (document.member_id !== req.user.id &&
        !['admin', 'super_admin', 'financial_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    // Soft delete in database
    await query(
      'UPDATE documents_metadata SET status = $1, deleted_at = $2 WHERE id = $3',
      ['deleted', new Date().toISOString(), documentId]
    );

    // Delete from storage
    await deleteFromSupabase(document.file_path);

    res.json({
      success: true,
      message: 'تم حذف المستند بنجاح',
      message_en: 'Document deleted successfully'
    });

  } catch (error) {
    log.error('Delete error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المستند',
      message_en: 'Error deleting document',
      error: error.message
    });
  }
});

// Get document categories
router.get('/config/categories', (req, res) => {
  res.json({
    success: true,
    data: Object.entries(CATEGORY_TRANSLATIONS).map(([key, value]) => ({
      id: key,
      name_ar: value,
      name_en: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }))
  });
});

// Get statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const memberId = req.query.member_id || req.user.id;

    const { rows: stats } = await query(
      `SELECT category, file_size FROM documents_metadata WHERE member_id = $1 AND status = $2`,
      [memberId, 'active']
    );

    // Calculate statistics
    const categoryCount = {};
    let totalSize = 0;
    let totalDocuments = 0;

    (stats || []).forEach(doc => {
      categoryCount[doc.category] = (categoryCount[doc.category] || 0) + 1;
      totalSize += doc.file_size || 0;
      totalDocuments++;
    });

    res.json({
      success: true,
      data: {
        total_documents: totalDocuments,
        total_size: totalSize,
        total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        by_category: Object.entries(categoryCount).map(([cat, count]) => ({
          category: cat,
          category_name: CATEGORY_TRANSLATIONS[cat],
          count
        }))
      }
    });

  } catch (error) {
    log.error('Stats error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      message_en: 'Error fetching statistics',
      error: error.message
    });
  }
});

export default router;
