const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// إنشاء مجلد الرفع إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تكوين التخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // تسمية آمنة للملف مع الوقت
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    const safeName = `receipt_${timestamp}_${randomNum}${ext}`;

    // حفظ مسار الملف في الطلب
    req.uploadedFilePath = path.join(uploadsDir, safeName);

    cb(null, safeName);
  }
});

// فلتر أنواع الملفات
const fileFilter = (req, file, cb) => {
  // الأنواع المسموحة
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];

  // الامتدادات المسموحة
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error(`نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, PDF`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// تكوين multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 ميجابايت
    files: 1 // ملف واحد فقط
  },
  fileFilter: fileFilter
});

// وسطاء رفع إيصال الدفع
const uploadReceiptMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('receipt');

  uploadSingle(req, res, function (err) {
    if (err) {
      logger.error('خطأ في رفع الملف:', err);

      // معالجة أنواع الأخطاء المختلفة
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت',
          messageEn: 'File size too large. Maximum 5MB allowed',
          error: 'FILE_TOO_LARGE'
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, PDF',
          messageEn: 'Invalid file type. Allowed types: JPG, PNG, GIF, PDF',
          error: 'INVALID_FILE_TYPE'
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'يُسمح برفع ملف واحد فقط',
          messageEn: 'Only one file allowed',
          error: 'TOO_MANY_FILES'
        });
      }

      // خطأ عام
      return res.status(500).json({
        success: false,
        message: 'خطأ في رفع الملف',
        messageEn: 'File upload error',
        error: err.message
      });
    }

    // التحقق من وجود ملف
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم اختيار ملف لرفعه',
        messageEn: 'No file selected for upload',
        error: 'NO_FILE_SELECTED'
      });
    }

    // التحقق من سلامة الملف المرفوع
    if (!fs.existsSync(req.file.path)) {
      return res.status(500).json({
        success: false,
        message: 'فشل في حفظ الملف',
        messageEn: 'Failed to save file',
        error: 'FILE_SAVE_FAILED'
      });
    }

    // إضافة معلومات إضافية عن الملف
    req.uploadedFile = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    logger.info(`تم رفع ملف بنجاح: ${req.file.filename} (${req.file.size} bytes)`);
    next();
  });
};

// وسطاء اختياري لرفع الملف (قد لا يكون مطلوب في بعض الحالات)
const uploadOptionalReceiptMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('receipt');

  uploadSingle(req, res, function (err) {
    if (err) {
      logger.error('خطأ في رفع الملف الاختياري:', err);

      // نفس معالجة الأخطاء ولكن لا نتوقف
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.fileError = {
          message: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت',
          messageEn: 'File size too large. Maximum 5MB allowed',
          error: 'FILE_TOO_LARGE'
        };
      } else if (err.code === 'INVALID_FILE_TYPE') {
        req.fileError = {
          message: 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, PDF',
          messageEn: 'Invalid file type. Allowed types: JPG, PNG, GIF, PDF',
          error: 'INVALID_FILE_TYPE'
        };
      } else {
        req.fileError = {
          message: 'خطأ في رفع الملف',
          messageEn: 'File upload error',
          error: err.message
        };
      }

      return next(); // متابعة حتى لو فشل رفع الملف
    }

    // إذا تم رفع ملف، حفظ معلوماته
    if (req.file) {
      req.uploadedFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      };

      logger.info(`تم رفع ملف اختياري بنجاح: ${req.file.filename} (${req.file.size} bytes)`);
    }

    next();
  });
};

// وظيفة حذف الملف (في حالة الرفض أو الخطأ)
const deleteUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`تم حذف الملف: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`فشل في حذف الملف ${filePath}:`, error);
    return false;
  }
};

// وظيفة التحقق من صحة الملف
const validateUploadedFile = (file) => {
  const errors = [];

  // التحقق من وجود الملف
  if (!file) {
    errors.push('لا يوجد ملف مرفوع');
    return { valid: false, errors };
  }

  // التحقق من وجود الملف في النظام
  if (!fs.existsSync(file.path)) {
    errors.push('الملف المرفوع غير موجود');
    return { valid: false, errors };
  }

  // التحقق من حجم الملف
  const stats = fs.statSync(file.path);
  if (stats.size > 5 * 1024 * 1024) {
    errors.push('حجم الملف أكبر من 5 ميجابايت');
  }

  if (stats.size === 0) {
    errors.push('الملف فارغ');
  }

  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      size: stats.size,
      exists: true,
      readable: true
    }
  };
};

// تصدير الوسطاء والوظائف
module.exports = {
  uploadReceiptMiddleware,
  uploadOptionalReceiptMiddleware,
  deleteUploadedFile,
  validateUploadedFile,
  uploadsDir
};