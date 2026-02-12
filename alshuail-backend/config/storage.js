import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base upload directory - configurable via environment variable
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/var/www/uploads/alshuail';
const BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || 'https://api.alshailfund.com';

// Document categories
const DOCUMENT_CATEGORIES = {
  NATIONAL_ID: 'national_id',
  MARRIAGE_CERT: 'marriage_certificate',
  PROPERTY_DEED: 'property_deed',
  BIRTH_CERT: 'birth_certificate',
  DEATH_CERT: 'death_certificate',
  PASSPORT: 'passport',
  DRIVER_LICENSE: 'driver_license',
  EDUCATION: 'education',
  MEDICAL: 'medical',
  OTHER: 'other'
};

// Arabic translations for categories
const CATEGORY_TRANSLATIONS = {
  [DOCUMENT_CATEGORIES.NATIONAL_ID]: 'الهوية الوطنية',
  [DOCUMENT_CATEGORIES.MARRIAGE_CERT]: 'عقد الزواج',
  [DOCUMENT_CATEGORIES.PROPERTY_DEED]: 'صك الملكية',
  [DOCUMENT_CATEGORIES.BIRTH_CERT]: 'شهادة الميلاد',
  [DOCUMENT_CATEGORIES.DEATH_CERT]: 'شهادة الوفاة',
  [DOCUMENT_CATEGORIES.PASSPORT]: 'جواز السفر',
  [DOCUMENT_CATEGORIES.DRIVER_LICENSE]: 'رخصة القيادة',
  [DOCUMENT_CATEGORIES.EDUCATION]: 'الشهادات التعليمية',
  [DOCUMENT_CATEGORIES.MEDICAL]: 'التقارير الطبية',
  [DOCUMENT_CATEGORIES.OTHER]: 'أخرى'
};

// Storage bucket name (kept for API compatibility)
const BUCKET_NAME = 'member-documents';

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
};

// Multer configuration - using memory storage to maintain compatibility
// Files are temporarily in memory, then saved to disk by uploadToSupabase
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Generate unique file path (maintains same structure as Supabase version)
const generateFilePath = (userId, category, filename) => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${category}/${timestamp}_${sanitizedFilename}`;
};

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Upload file to local storage (replaces Supabase Storage)
 * Maintains the same function signature for backward compatibility
 * @param {Object} file - Multer file object with buffer
 * @param {string|number} userId - User ID
 * @param {string} category - Document category
 * @returns {Promise<{path: string, url: string, size: number, type: string}>}
 */
const uploadToSupabase = async (file, userId, category) => {
  try {
    // Generate file path (same structure as before)
    const filePath = generateFilePath(userId, category, file.originalname);
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);

    // Ensure directory exists
    const fileDir = path.dirname(fullPath);
    await ensureDirectory(fileDir);

    // Write file to disk
    await fs.writeFile(fullPath, file.buffer);

    // Generate public URL
    const publicUrl = `${BASE_URL}/uploads/${filePath}`;

    return {
      path: filePath,
      url: publicUrl,
      size: file.size,
      type: file.mimetype
    };
  } catch (error) {
    console.error('Local storage upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Delete file from local storage (replaces Supabase Storage)
 * @param {string} filePath - Relative file path (e.g., "123/national_id/1234567890_file.pdf")
 * @returns {Promise<boolean>}
 */
const deleteFromSupabase = async (filePath) => {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    // If file doesn't exist, consider it already deleted
    if (error.code === 'ENOENT') {
      console.warn(`File not found for deletion: ${filePath}`);
      return true;
    }
    console.error('Local storage delete error:', error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

/**
 * Get URL for file access (replaces Supabase signed URL)
 * In local storage, files are served via Nginx, so we return a public URL
 * @param {string} filePath - Relative file path
 * @param {number} expiresIn - Expiry time in seconds (ignored for local storage, kept for API compatibility)
 * @returns {Promise<string>} Public URL
 */
const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    // Check if file exists
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.access(fullPath);

    // Return public URL
    // Note: For true signed URLs with expiry, you'd need to implement a token-based system
    // For now, files are served via Nginx with authentication handled at route level
    const publicUrl = `${BASE_URL}/uploads/${filePath}`;
    return publicUrl;
  } catch (error) {
    console.error('Error generating file URL:', error);
    throw new Error(`File not found: ${filePath}`);
  }
};

/**
 * Check if file exists
 * @param {string} filePath - Relative file path
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 * @param {string} filePath - Relative file path
 * @returns {Promise<{size: number, created: Date, modified: Date}>}
 */
async function getFileMetadata(filePath) {
  const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
  const stats = await fs.stat(fullPath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime
  };
}

// For backward compatibility with code that imports 'supabase' directly
// This is a compatibility shim - no actual Supabase client
const supabase = {
  _note: 'This is a compatibility shim. Supabase has been replaced with local storage.',
  storage: {
    from: () => ({
      upload: () => { throw new Error('Direct supabase.storage calls are deprecated. Use uploadToSupabase() instead.'); },
      remove: () => { throw new Error('Direct supabase.storage calls are deprecated. Use deleteFromSupabase() instead.'); },
      getPublicUrl: () => { throw new Error('Direct supabase.storage calls are deprecated. Use getSignedUrl() instead.'); }
    })
  }
};

export {
  supabase,
  upload,
  uploadToSupabase,
  deleteFromSupabase,
  getSignedUrl,
  DOCUMENT_CATEGORIES,
  CATEGORY_TRANSLATIONS,
  BUCKET_NAME,
  fileExists,
  getFileMetadata
};
