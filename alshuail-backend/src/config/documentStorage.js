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
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';
import { query } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory - use environment variable or default
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
// Storage bucket name (kept for backward compatibility, now a subdirectory)
export const BUCKET_NAME = 'member-documents';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const SIGNATURE_BYTE_LENGTH = 32;

const documentStorageRoot = () => path.resolve(UPLOAD_BASE_DIR, BUCKET_NAME);

const documentSigningSecret = () => {
  const secret = process.env.DOCUMENT_SIGNING_SECRET || process.env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length === 0) {
    const error = new Error('Document signing is not configured');
    error.code = 'DOCUMENT_SIGNING_NOT_CONFIGURED';
    throw error;
  }
  return secret;
};

const signedDocumentError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

// Ensure upload directory exists on startup
(async () => {
  try {
    await fs.mkdir(documentStorageRoot(), { recursive: true });
    log.info('[DocumentStorage] Upload directory ready', { path: documentStorageRoot() });
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
  RECEIPTS: 'receipts',
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
  [DOCUMENT_CATEGORIES.RECEIPTS]: 'إيصالات الدفع',
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

// Generate unique file path
export const generateFilePath = (userId, category, filename) => {
  const timestamp = Date.now();
  const uniqueId = randomUUID();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${category}/${timestamp}_${uniqueId}_${sanitizedFilename}`;
};

/**
 * Get the full filesystem path for a file
 * @param {string} filePath - Relative file path
 * @returns {string} Full filesystem path
 */
const getFullPath = (filePath) => {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('Invalid document storage path');
  }

  if (filePath.includes('\0') || filePath.includes('\\')) {
    throw new Error('Invalid document storage path');
  }

  const normalizedPath = path.posix.normalize(filePath);
  if (
    path.posix.isAbsolute(filePath) ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath !== filePath
  ) {
    throw new Error('Document path escapes the storage root');
  }

  const storageRoot = documentStorageRoot();
  const fullPath = path.resolve(storageRoot, filePath);
  const insideStorageRoot = fullPath.startsWith(`${storageRoot}${path.sep}`);

  if (!insideStorageRoot) {
    throw new Error('Document path escapes the storage root');
  }

  return fullPath;
};

/**
 * Get the public URL for a file
 * Files are served via Express static middleware or nginx
 * @param {string} filePath - Relative file path
 * @returns {string} Public URL
 */
const getPublicUrl = (filePath) => {
  // Files are served by Express/Nginx at /uploads. The backend also keeps
  // /api/uploads as a compatibility alias for older stored URLs.
  const baseUrl = process.env.UPLOAD_URL || '/uploads';
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
    // Never overwrite archived financial evidence. UUID entropy makes a
    // collision practically impossible; `wx` remains the filesystem guard.
    await fs.writeFile(fullPath, file.buffer, { flag: 'wx' });

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
 * Get a short-lived HMAC-signed URL for private file access.
 * @param {string} filePath - Relative file path
 * @param {number} _expiresIn - Expiry in seconds (maximum 24 hours)
 * @returns {string} Signed private document route
 */
export const getSignedUrl = (filePath, _expiresIn = 3600) => {
  try {
    // Validate before signing so a token can never authorize a path outside
    // the private document bucket.
    getFullPath(filePath);

    const expiresIn = Number(_expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS);
    if (
      !Number.isInteger(expiresIn) ||
      expiresIn <= 0 ||
      expiresIn > MAX_SIGNED_URL_TTL_SECONDS
    ) {
      throw new Error('Invalid signed document URL expiry');
    }

    const payload = Buffer.from(JSON.stringify({
      p: filePath,
      e: Math.floor(Date.now() / 1000) + expiresIn,
    })).toString('base64url');
    const signature = createHmac('sha256', documentSigningSecret())
      .update(payload)
      .digest('base64url');

    return `/api/documents/file/${payload}.${signature}`;
  } catch (error) {
    log.error('[DocumentStorage] Error generating URL', { error: error.message });
    throw error;
  }
};

/**
 * Verify and decode a signed document token.
 * Signature comparison is constant-time and the decoded storage path is
 * revalidated before any filesystem operation.
 *
 * @param {string} token - Token emitted by getSignedUrl (without route prefix)
 * @param {number} nowSeconds - Epoch seconds; injectable for deterministic tests
 * @returns {{ filePath: string, fullPath: string, expiresAt: number }}
 */
export const verifySignedDocumentToken = (
  token,
  nowSeconds = Math.floor(Date.now() / 1000)
) => {
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  const [encodedPayload, encodedSignature] = parts;
  let providedSignature;
  try {
    providedSignature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  if (providedSignature.toString('base64url') !== encodedSignature) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  const expectedSignature = createHmac('sha256', documentSigningSecret())
    .update(encodedPayload)
    .digest();
  if (
    providedSignature.length !== SIGNATURE_BYTE_LENGTH ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  let payload;
  try {
    const decodedPayload = Buffer.from(encodedPayload, 'base64url');
    if (decodedPayload.toString('base64url') !== encodedPayload) {
      throw new Error('Non-canonical token payload');
    }
    payload = JSON.parse(decodedPayload.toString('utf8'));
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  if (
    !payload ||
    typeof payload.p !== 'string' ||
    !Number.isSafeInteger(payload.e)
  ) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  if (!Number.isSafeInteger(nowSeconds) || payload.e <= nowSeconds) {
    throw signedDocumentError('DOCUMENT_TOKEN_EXPIRED', 'Document token expired');
  }

  let fullPath;
  try {
    fullPath = getFullPath(payload.p);
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  return { filePath: payload.p, fullPath, expiresAt: payload.e };
};

/**
 * Read a file authorized by a signed token while also protecting against a
 * symlink inside the bucket resolving outside the configured storage root.
 */
export const readSignedDocument = async (token) => {
  const verified = verifySignedDocumentToken(token);
  const [realStorageRoot, realFilePath] = await Promise.all([
    fs.realpath(documentStorageRoot()),
    fs.realpath(verified.fullPath),
  ]);
  if (!realFilePath.startsWith(`${realStorageRoot}${path.sep}`)) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  const stats = await fs.stat(realFilePath);
  if (!stats.isFile()) {
    const error = new Error('Document file not found');
    error.code = 'ENOENT';
    throw error;
  }

  return {
    buffer: await fs.readFile(realFilePath),
    filePath: verified.filePath,
    filename: path.basename(verified.filePath),
    expiresAt: verified.expiresAt,
  };
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
