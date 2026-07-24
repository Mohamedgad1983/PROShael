/**
 * Storage API Routes - بديل Supabase Storage API
 */

import express from 'express';
import multer from 'multer';
import * as storage from '../services/storageService.js';

const router = express.Router();

// إعداد Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح'), false);
    }
  }
});

/**
 * @route POST /api/storage/:bucket/upload
 * @desc رفع ملف
 */
router.post('/:bucket/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال ملف' });
    }
    
    const { bucket } = req.params;
    const options = {
      resize: req.body.resize ? JSON.parse(req.body.resize) : null,
      quality: req.body.quality ? parseInt(req.body.quality) : null,
      keepName: req.body.keepName === 'true'
    };
    
    const result = await storage.uploadFile(
      bucket,
      req.file.originalname,
      req.file.buffer,
      options
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/storage/:bucket/upload-multiple
 * @desc رفع عدة ملفات
 */
router.post('/:bucket/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    }
    
    const { bucket } = req.params;
    const results = [];
    
    for (const file of req.files) {
      const result = await storage.uploadFile(bucket, file.originalname, file.buffer);
      results.push(result);
    }
    
    res.json({ success: true, files: results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/storage/:bucket/:filename
 * @desc حذف ملف
 */
router.delete('/:bucket/:filename', async (req, res) => {
  try {
    const { bucket, filename } = req.params;
    const result = await storage.deleteFile(bucket, filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/:bucket/list
 * @desc قائمة الملفات
 */
router.get('/:bucket/list', async (req, res) => {
  try {
    const { bucket } = req.params;
    const { limit, offset } = req.query;
    const result = await storage.listFiles(bucket, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/:bucket/:filename/info
 * @desc معلومات ملف
 */
router.get('/:bucket/:filename/info', async (req, res) => {
  try {
    const { bucket, filename } = req.params;
    const result = await storage.getFileInfo(bucket, filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/stats
 * @desc إحصائيات Storage
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getStorageStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/buckets
 * @desc قائمة Buckets المتاحة
 */
router.get('/buckets', (req, res) => {
  res.json({
    buckets: Object.keys(storage.BUCKETS),
    details: storage.BUCKETS
  });
});

/**
 * @route POST /api/storage/cleanup-temp
 * @desc تنظيف الملفات المؤقتة
 */
router.post('/cleanup-temp', async (req, res) => {
  try {
    const { olderThanHours } = req.body;
    const result = await storage.cleanupTemp(olderThanHours || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
