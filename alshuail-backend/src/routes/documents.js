import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../utils/logger.js';
import {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
  getSignedUrl,
  supabase,
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

    // Use member_id if provided, otherwise use authenticated user's ID
    const targetMemberId = member_id || req.user.userId;

    // Validate category
    if (!Object.values(DOCUMENT_CATEGORIES).includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'فئة غير صالحة',
        message_en: 'Invalid category'
      });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabase(req.file, targetMemberId, category);

    // Save metadata to database
    const { data: document, error } = await supabase
      .from('documents_metadata')
      .insert({
        member_id: targetMemberId,
        title: title || req.file.originalname,
        description: description || '',
        category,
        file_path: uploadResult.path,
        file_size: uploadResult.size,
        file_type: uploadResult.type,
        original_name: req.file.originalname,
        uploaded_by: req.user.userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {throw error;}

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

// Get all documents for a member
router.get('/member/:memberId?', authenticateToken, async (req, res) => {
  try {
    const memberId = req.params.memberId || req.user.userId;
    const { category, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('documents_metadata')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: documents, error, count } = await query;

    if (error) {throw error;}

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
        limit,
        offset,
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

// Get single document
router.get('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const { data: document, error } = await supabase
      .from('documents_metadata')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
        message_en: 'Document not found'
      });
    }

    // Check permission
    if (document.member_id !== req.user.userId && req.user.role !== 'admin') {
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
    const { data: existing } = await supabase
      .from('documents_metadata')
      .select('member_id')
      .eq('id', documentId)
      .single();

    if (!existing || (existing.member_id !== req.user.userId && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    const updateData = {};
    if (title) {updateData.title = title;}
    if (description !== undefined) {updateData.description = description;}
    if (category && Object.values(DOCUMENT_CATEGORIES).includes(category)) {
      updateData.category = category;
    }

    const { data: document, error } = await supabase
      .from('documents_metadata')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {throw error;}

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
    const { data: document, error: _fetchError } = await supabase
      .from('documents_metadata')
      .select('*')
      .eq('id', documentId)
      .single();

    if (_fetchError || !document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
        message_en: 'Document not found'
      });
    }

    // Check permission
    if (document.member_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
        message_en: 'Unauthorized'
      });
    }

    // Soft delete in database
    const { error: _updateError } = await supabase
      .from('documents_metadata')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (_updateError) {throw _updateError;}

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
    const memberId = req.query.member_id || req.user.userId;

    const { data: stats, error } = await supabase
      .from('documents_metadata')
      .select('category, file_size')
      .eq('member_id', memberId)
      .eq('status', 'active');

    if (error) {throw error;}

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