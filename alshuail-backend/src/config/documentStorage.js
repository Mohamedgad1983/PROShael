/**
 * Document Storage Module - VPS Local Filesystem
 *
 * MIGRATED: From Supabase Storage to local filesystem on VPS
 * Documents are stored in /var/www/uploads on the VPS server
 *
 * This module provides:
 * - Local file upload/download/delete operations
 * - Multer configuration for file handling
 * - Database operations via pgQueryBuilder
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';
import { query } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory - use environment variable or default
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Ensure upload directory exists on startup
(async () => {
  try {
    await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
    log.info('[DocumentStorage] Upload directory ready', { path: UPLOAD_BASE_DIR });
  } catch (error) {
    log.error('[DocumentStorage] Failed to create upload directory', { error: error.message });
  }
})();

// Re-export the database query function for backward compatibility
export { query };

// Multer configuration for temporary file storage (memory buffer)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|pdf|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, and WebP files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Document categories
export const DOCUMENT_CATEGORIES = {
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
export const CATEGORY_TRANSLATIONS = {
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

// Storage bucket name (kept for backward compatibility, now represents a subdirectory)
export const BUCKET_NAME = 'member-documents';

// Generate unique file path
export const generateFilePath = (userId, category, filename) => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${category}/${timestamp}_${sanitizedFilename}`;
};

/**
 * Get the full filesystem path for a file
 * @param {string} filePath - Relative file path
 * @returns {string} Full filesystem path
 */
const getFullPath = (filePath) => {
  return path.join(UPLOAD_BASE_DIR, BUCKET_NAME, filePath);
};

/**
 * Get the public URL for a file
 * Files are served via Express static middleware or nginx
 * @param {string} filePath - Relative file path
 * @returns {string} Public URL
 */
const getPublicUrl = (filePath) => {
  // In production, files are served via nginx at /uploads/
  // In development, Express serves them at /api/uploads/
  const baseUrl = process.env.UPLOAD_URL || '/api/uploads';
  return `${baseUrl}/${BUCKET_NAME}/${filePath}`;
};

/**
 * Upload file to local filesystem
 * MIGRATED from Supabase Storage
 * @param {Object} file - Multer file object with buffer
 * @param {string} userId - User ID for directory structure
 * @param {string} category - Document category
 * @returns {Object} Upload result with path, url, size, type
 */
export const uploadToSupabase = async (file, userId, category) => {
  try {
    const filePath = generateFilePath(userId, category, file.originalname);
    const fullPath = getFullPath(filePath);
    const directory = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write file to disk
    await fs.writeFile(fullPath, file.buffer);

    log.info('[DocumentStorage] File uploaded', {
      path: filePath,
      size: file.size,
      type: file.mimetype
    });

    return {
      path: filePath,
      url: getPublicUrl(filePath),
      size: file.size,
      type: file.mimetype
    };
  } catch (error) {
    log.error('[DocumentStorage] Upload error', { error: error.message });
    throw error;
  }
};

/**
 * Delete file from local filesystem
 * MIGRATED from Supabase Storage
 * @param {string} filePath - Relative file path to delete
 * @returns {boolean} True if successful
 */
export const deleteFromSupabase = async (filePath) => {
  try {
    const fullPath = getFullPath(filePath);

    // Check if file exists before attempting delete
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      log.info('[DocumentStorage] File deleted', { path: filePath });
    } catch (accessError) {
      // File doesn't exist, log but don't throw
      log.warn('[DocumentStorage] File not found for deletion', { path: filePath });
    }

    return true;
  } catch (error) {
    log.error('[DocumentStorage] Delete error', { error: error.message });
    throw error;
  }
};

/**
 * Get URL for file access (replaces signed URL functionality)
 * For local storage, we return a direct URL since files are served via Express/nginx
 * MIGRATED from Supabase signed URLs
 * @param {string} filePath - Relative file path
 * @param {number} _expiresIn - Ignored for local storage (kept for API compatibility)
 * @returns {string} Public URL for the file
 */
export const getSignedUrl = (filePath, _expiresIn = 3600) => {
  try {
    // For local storage, just return the public URL
    // In production with nginx, you could implement token-based access if needed
    const url = getPublicUrl(filePath);
    return url;
  } catch (error) {
    log.error('[DocumentStorage] Error generating URL', { error: error.message });
    throw error;
  }
};

/**
 * Check if a file exists in storage
 * @param {string} filePath - Relative file path
 * @returns {boolean} True if file exists
 */
export const fileExists = async (filePath) => {
  try {
    const fullPath = getFullPath(filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get file stats (size, created date, etc.)
 * @param {string} filePath - Relative file path
 * @returns {Object|null} File stats or null if not found
 */
export const getFileStats = async (filePath) => {
  try {
    const fullPath = getFullPath(filePath);
    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch {
    return null;
  }
};

/**
 * Read file from storage
 * @param {string} filePath - Relative file path
 * @returns {Buffer|null} File buffer or null if not found
 */
export const readFile = async (filePath) => {
  try {
    const fullPath = getFullPath(filePath);
    return await fs.readFile(fullPath);
  } catch (error) {
    log.error('[DocumentStorage] Read error', { error: error.message, path: filePath });
    return null;
  }
};
