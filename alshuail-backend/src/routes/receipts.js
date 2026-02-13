import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { uploadReceipt } from '../controllers/memberController.js';

const router = express.Router();

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  }
});

// Receipt Upload Route
router.post('/upload', authenticate, upload.single('receipt'), uploadReceipt);

export default router;