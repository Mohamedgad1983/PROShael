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
import { Transformer } from '@napi-rs/image';
import { loadImage } from 'canvas';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
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
const DOCUMENT_TOKEN_VERSION = 'v2';
const DOCUMENT_TOKEN_NONCE_BYTES = 12;
const DOCUMENT_TOKEN_AUTH_TAG_BYTES = 16;
const DOCUMENT_TOKEN_AAD = Buffer.from('alshuail-private-document-token:v2', 'utf8');
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
// Bound decoder memory before invoking native image libraries. This supports
// standard 12 MP phone photos while leaving headroom above observed production
// loan evidence (currently below 3 MP).
const MAX_RASTER_PIXELS = 16_000_000;

const MIME_TYPE_ALIASES = Object.freeze({
  'image/jpg': 'image/jpeg',
});

const DOCUMENT_TYPE_BY_MIME = Object.freeze({
  'image/jpeg': Object.freeze({ extension: '.jpg', acceptedExtensions: ['.jpg', '.jpeg'] }),
  'image/png': Object.freeze({ extension: '.png', acceptedExtensions: ['.png'] }),
  'application/pdf': Object.freeze({ extension: '.pdf', acceptedExtensions: ['.pdf'] }),
  'image/webp': Object.freeze({ extension: '.webp', acceptedExtensions: ['.webp'] }),
  'image/heic': Object.freeze({ extension: '.heic', acceptedExtensions: ['.heic'] }),
  'image/heif': Object.freeze({ extension: '.heif', acceptedExtensions: ['.heif'] }),
});

export const LOAN_DOCUMENT_ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
]);

const SAFE_DOCUMENT_ERROR_MESSAGE = 'Document file is invalid';

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

const documentEncryptionKey = () => createHash('sha256')
  .update('alshuail-private-document-token-key:v2\0', 'utf8')
  .update(documentSigningSecret(), 'utf8')
  .digest();

const signedDocumentError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const invalidDocumentError = () => {
  const error = new Error(SAFE_DOCUMENT_ERROR_MESSAGE);
  error.code = 'DOCUMENT_FILE_INVALID';
  return error;
};

const fileExtension = (filename) => {
  if (typeof filename !== 'string' || filename.includes('\0')) {
    throw invalidDocumentError();
  }
  return path.extname(path.basename(filename)).toLowerCase();
};

const declaredDocumentType = ({ originalname, mimetype }) => {
  const canonicalMimeType = MIME_TYPE_ALIASES[mimetype] || mimetype;
  const type = DOCUMENT_TYPE_BY_MIME[canonicalMimeType];
  const extension = fileExtension(originalname);
  if (!type || !type.acceptedExtensions.includes(extension)) {
    throw invalidDocumentError();
  }
  return { mimeType: canonicalMimeType, extension: type.extension };
};

const hasBytes = (buffer, offset, bytes) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < offset + bytes.length) {return false;}
  return bytes.every((byte, index) => buffer[offset + index] === byte);
};

const hasJpegEndMarker = (buffer) => {
  const start = Math.max(3, buffer.length - 16);
  for (let index = buffer.length - 2; index >= start; index -= 1) {
    if (buffer[index] === 0xff && buffer[index + 1] === 0xd9) {return true;}
  }
  return false;
};

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis']);
const HEIF_BRANDS = new Set(['mif1', 'msf1']);

const detectIsoBmffMimeType = (buffer) => {
  if (buffer.length < 16 || buffer.subarray(4, 8).toString('ascii') !== 'ftyp') {
    return null;
  }
  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > buffer.length) {return null;}
  const brands = [buffer.subarray(8, 12).toString('ascii')];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
    brands.push(buffer.subarray(offset, offset + 4).toString('ascii'));
  }
  if (brands.some((brand) => HEIC_BRANDS.has(brand))) {return 'image/heic';}
  if (brands.some((brand) => HEIF_BRANDS.has(brand))) {return 'image/heif';}
  return null;
};

const parseIsoBmffTopLevelBoxes = (buffer) => {
  const boxTypes = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {return null;}
    let boxSize = buffer.readUInt32BE(offset);
    let headerSize = 8;
    if (boxSize === 1) {
      if (offset + 16 > buffer.length) {return null;}
      const extendedSize = buffer.readBigUInt64BE(offset + 8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) {return null;}
      boxSize = Number(extendedSize);
      headerSize = 16;
    } else if (boxSize === 0) {
      boxSize = buffer.length - offset;
    }
    if (boxSize < headerSize || offset + boxSize > buffer.length) {return null;}
    boxTypes.push(buffer.subarray(offset + 4, offset + 8).toString('ascii'));
    offset += boxSize;
  }
  return boxTypes;
};

const validatePdfStructure = async (buffer) => {
  const text = buffer.toString('latin1');
  const eofIndex = text.lastIndexOf('%%EOF');
  const startXrefMatch = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text);
  if (!startXrefMatch || eofIndex < 0) {throw invalidDocumentError();}
  const xrefOffset = Number(startXrefMatch[1]);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset <= 0 || xrefOffset >= eofIndex) {
    throw invalidDocumentError();
  }

  try {
    const document = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    if (document.getPageCount() < 1) {throw invalidDocumentError();}
  } catch (_error) {
    throw invalidDocumentError();
  }
};

const validateDimensions = (width, height) => {
  if (
    !Number.isSafeInteger(width)
    || !Number.isSafeInteger(height)
    || width <= 0
    || height <= 0
    || width > Math.floor(MAX_RASTER_PIXELS / height)
  ) {
    throw invalidDocumentError();
  }
};

const readPngDimensions = (buffer) => {
  if (
    buffer.length < 33
    || !hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    || buffer.readUInt32BE(8) !== 13
    || buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw invalidDocumentError();
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

const readJpegDimensions = (buffer) => {
  if (buffer.length < 4 || !hasBytes(buffer, 0, [0xff, 0xd8])) {
    throw invalidDocumentError();
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {throw invalidDocumentError();}
    while (offset < buffer.length && buffer[offset] === 0xff) {offset += 1;}
    if (offset >= buffer.length) {break;}

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x00) {throw invalidDocumentError();}
    if (marker === 0xd9) {break;}
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > buffer.length) {throw invalidDocumentError();}

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw invalidDocumentError();
    }
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) {throw invalidDocumentError();}
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    if (marker === 0xda) {break;}
    offset += segmentLength;
  }
  throw invalidDocumentError();
};

const validateWebPStructure = (buffer) => {
  let offset = 12;
  let canvasDimensions = null;
  let foundImagePayload = false;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {throw invalidDocumentError();}
    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    const chunkEnd = payloadOffset + chunkSize;
    const paddedEnd = chunkEnd + (chunkSize % 2);
    if (chunkEnd > buffer.length || paddedEnd > buffer.length) {throw invalidDocumentError();}

    if (chunkType === 'VP8 ') {
      if (
        chunkSize < 10
        || !hasBytes(buffer, payloadOffset + 3, [0x9d, 0x01, 0x2a])
      ) {
        throw invalidDocumentError();
      }
      const width = buffer.readUInt16LE(payloadOffset + 6) & 0x3fff;
      const height = buffer.readUInt16LE(payloadOffset + 8) & 0x3fff;
      validateDimensions(width, height);
      foundImagePayload = true;
    } else if (chunkType === 'VP8L') {
      if (chunkSize < 5 || buffer[payloadOffset] !== 0x2f) {throw invalidDocumentError();}
      const dimensionBits = buffer.readUInt32LE(payloadOffset + 1);
      validateDimensions(
        (dimensionBits & 0x3fff) + 1,
        ((dimensionBits >>> 14) & 0x3fff) + 1
      );
      foundImagePayload = true;
    } else if (chunkType === 'VP8X') {
      if (chunkSize !== 10) {throw invalidDocumentError();}
      const width = buffer.readUIntLE(payloadOffset + 4, 3) + 1;
      const height = buffer.readUIntLE(payloadOffset + 7, 3) + 1;
      validateDimensions(width, height);
      canvasDimensions = { width, height };
    } else if (chunkType === 'ANMF') {
      if (!canvasDimensions || chunkSize < 16) {throw invalidDocumentError();}
      foundImagePayload = true;
    }
    offset = paddedEnd;
  }
  if (offset !== buffer.length || !foundImagePayload) {
    throw invalidDocumentError();
  }
};

const validateWebPDecode = async (buffer) => {
  try {
    // Do not retain the re-encoded output: successful conversion proves the
    // structurally preflighted WebP can be decoded by the native codec.
    await new Transformer(buffer).png();
  } catch (_error) {
    throw invalidDocumentError();
  }
};

const validateRasterStructure = async (mimeType, buffer) => {
  const encodedDimensions = mimeType === 'image/png'
    ? readPngDimensions(buffer)
    : readJpegDimensions(buffer);
  validateDimensions(encodedDimensions.width, encodedDimensions.height);

  let image;
  try {
    image = await loadImage(buffer);
    const width = Number(image.width);
    const height = Number(image.height);
    validateDimensions(width, height);
  } catch (_error) {
    throw invalidDocumentError();
  } finally {
    if (typeof image?.close === 'function') {
      image.close();
    }
  }
};

const validateDocumentStructure = async (mimeType, buffer) => {
  if (['image/jpeg', 'image/png'].includes(mimeType)) {
    await validateRasterStructure(mimeType, buffer);
    return;
  }
  if (mimeType === 'image/webp') {
    validateWebPStructure(buffer);
    await validateWebPDecode(buffer);
    return;
  }
  if (mimeType === 'application/pdf') {
    await validatePdfStructure(buffer);
    return;
  }
  if (['image/heic', 'image/heif'].includes(mimeType)) {
    const boxTypes = parseIsoBmffTopLevelBoxes(buffer);
    if (!boxTypes || boxTypes[0] !== 'ftyp' || !boxTypes.includes('meta') || !boxTypes.includes('mdat')) {
      throw invalidDocumentError();
    }
    return;
  }
  throw invalidDocumentError();
};

const detectDocumentMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return null;
  }

  if (
    buffer.length >= 32
    && hasBytes(buffer, 0, [0xff, 0xd8, 0xff])
    && hasJpegEndMarker(buffer)
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 45
    && hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    && buffer.subarray(12, 16).toString('ascii') === 'IHDR'
    && hasBytes(buffer, buffer.length - 12, [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44])
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 16
    && /^%PDF-[12]\.[0-9]/.test(buffer.subarray(0, 8).toString('ascii'))
    && buffer.subarray(Math.max(0, buffer.length - 1024)).includes(Buffer.from('%%EOF'))
  ) {
    return 'application/pdf';
  }

  if (
    buffer.length >= 20
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.subarray(12, 16).toString('ascii'))
    && buffer.readUInt32LE(4) === buffer.length - 8
  ) {
    return 'image/webp';
  }

  const isoBmffMimeType = detectIsoBmffMimeType(buffer);
  if (isoBmffMimeType) {return isoBmffMimeType;}

  return null;
};

/**
 * Validate a Multer memory-storage file from its bytes and declared metadata.
 * Returns canonical metadata and never exposes the supplied path/name in errors.
 */
export const validateUploadedFile = async (file, { allowedMimeTypes } = {}) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {throw invalidDocumentError();}
  const declared = declaredDocumentType(file);
  const actualMimeType = detectDocumentMimeType(file.buffer);
  const canonicalAllowedMimeTypes = Array.isArray(allowedMimeTypes)
    ? allowedMimeTypes.map((mimeType) => MIME_TYPE_ALIASES[mimeType] || mimeType)
    : null;
  if (
    actualMimeType !== declared.mimeType
    || !Number.isSafeInteger(file.size)
    || file.size !== file.buffer.length
    || (canonicalAllowedMimeTypes && !canonicalAllowedMimeTypes.includes(actualMimeType))
  ) {
    throw invalidDocumentError();
  }
  await validateDocumentStructure(actualMimeType, file.buffer);
  return {
    mimeType: actualMimeType,
    extension: DOCUMENT_TYPE_BY_MIME[actualMimeType].extension,
    size: file.buffer.length,
  };
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
  try {
    declaredDocumentType(file);
    return cb(null, true);
  } catch (error) {
    return cb(error);
  }
};

const loanFileFilter = (req, file, cb) => {
  try {
    const declared = declaredDocumentType(file);
    if (!LOAN_DOCUMENT_ALLOWED_MIME_TYPES.includes(declared.mimeType)) {
      throw invalidDocumentError();
    }
    return cb(null, true);
  } catch (error) {
    return cb(error);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES
  },
  fileFilter: fileFilter
});

export const loanUpload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
  },
  fileFilter: loanFileFilter,
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
  const extension = fileExtension(filename);
  return `${userId}/${category}/${timestamp}_${uniqueId}${extension}`;
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

const ensureConfinedUploadDirectory = async (filePath) => {
  const storageRoot = documentStorageRoot();
  await fs.mkdir(storageRoot, { recursive: true, mode: 0o700 });
  const realStorageRoot = await fs.realpath(storageRoot);
  const directorySegments = path.posix.dirname(filePath).split('/');
  let currentDirectory = storageRoot;

  for (const segment of directorySegments) {
    currentDirectory = path.join(currentDirectory, segment);
    try {
      await fs.mkdir(currentDirectory, { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') {throw error;}
    }

    const stats = await fs.lstat(currentDirectory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw invalidDocumentError();
    }
    const realDirectory = await fs.realpath(currentDirectory);
    if (!realDirectory.startsWith(`${realStorageRoot}${path.sep}`)) {
      throw invalidDocumentError();
    }
  }

  return { directory: currentDirectory, realStorageRoot };
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
export const uploadToSupabase = async (file, userId, category, validationOptions = {}) => {
  try {
    // This must remain the first operation: invalid client content must not
    // create a directory, a file, or any trusted metadata.
    const validated = await validateUploadedFile(file, validationOptions);
    const filePath = generateFilePath(userId, category, `document${validated.extension}`);
    const fullPath = getFullPath(filePath);
    const { directory, realStorageRoot } = await ensureConfinedUploadDirectory(filePath);
    const realDirectory = await fs.realpath(directory);
    if (!realDirectory.startsWith(`${realStorageRoot}${path.sep}`)) {
      throw invalidDocumentError();
    }

    // Write file to disk
    // Never overwrite archived financial evidence. UUID entropy makes a
    // collision practically impossible; `wx` remains the filesystem guard.
    let openedFileIdentity = null;
    try {
      const fileHandle = await fs.open(
        fullPath,
        fsConstants.O_WRONLY
          | fsConstants.O_CREAT
          | fsConstants.O_EXCL
          | fsConstants.O_NOFOLLOW,
        0o600
      );
      try {
        const openedStats = await fileHandle.stat();
        openedFileIdentity = { dev: openedStats.dev, ino: openedStats.ino };
        const postOpenRealPath = await fs.realpath(fullPath);
        const postOpenPathStats = await fs.stat(postOpenRealPath);
        if (
          !postOpenRealPath.startsWith(`${realStorageRoot}${path.sep}`)
          || openedStats.dev !== postOpenPathStats.dev
          || openedStats.ino !== postOpenPathStats.ino
        ) {
          throw invalidDocumentError();
        }
        await fileHandle.writeFile(file.buffer);
        const writtenStats = await fileHandle.stat();
        const postWriteRealPath = await fs.realpath(fullPath);
        const postWritePathStats = await fs.stat(postWriteRealPath);
        if (
          !postWriteRealPath.startsWith(`${realStorageRoot}${path.sep}`)
          || writtenStats.dev !== postWritePathStats.dev
          || writtenStats.ino !== postWritePathStats.ino
          || writtenStats.size !== validated.size
        ) {
          throw invalidDocumentError();
        }
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      if (openedFileIdentity) {
        try {
          const cleanupRealPath = await fs.realpath(fullPath);
          const cleanupStats = await fs.stat(cleanupRealPath);
          if (
            cleanupStats.dev === openedFileIdentity.dev
            && cleanupStats.ino === openedFileIdentity.ino
          ) {
            await fs.unlink(cleanupRealPath);
          }
        } catch (_cleanupError) { /* best effort for the newly created inode */ }
      }
      throw error;
    }

    log.info('[DocumentStorage] File uploaded', {
      path: filePath,
      size: validated.size,
      type: validated.mimeType
    });

    return {
      path: filePath,
      url: getPublicUrl(filePath),
      size: validated.size,
      type: validated.mimeType
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
      if (accessError.code !== 'ENOENT') {throw accessError;}
      log.warn('[DocumentStorage] File not found for deletion', { path: filePath });
    }

    return true;
  } catch (error) {
    log.error('[DocumentStorage] Delete error', { error: error.message });
    throw error;
  }
};

const decodeCanonicalBase64Url = (encodedValue) => {
  if (typeof encodedValue !== 'string' || encodedValue.length === 0) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  const decodedValue = Buffer.from(encodedValue, 'base64url');
  if (decodedValue.toString('base64url') !== encodedValue) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  return decodedValue;
};

const validateDocumentTokenPayload = (payload, nowSeconds) => {
  if (
    !payload
    || typeof payload !== 'object'
    || Array.isArray(payload)
    || Object.keys(payload).length !== 2
    || typeof payload.p !== 'string'
    || !Number.isSafeInteger(payload.e)
  ) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  if (!Number.isSafeInteger(nowSeconds)) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  if (payload.e <= nowSeconds) {
    throw signedDocumentError('DOCUMENT_TOKEN_EXPIRED', 'Document token expired');
  }
  if (payload.e - nowSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  let fullPath;
  try {
    fullPath = getFullPath(payload.p);
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  return { filePath: payload.p, fullPath, expiresAt: payload.e };
};

const verifyEncryptedDocumentToken = (token, nowSeconds) => {
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== DOCUMENT_TOKEN_VERSION) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  let nonce;
  let ciphertext;
  let authenticationTag;
  let payload;
  try {
    nonce = decodeCanonicalBase64Url(parts[1]);
    ciphertext = decodeCanonicalBase64Url(parts[2]);
    authenticationTag = decodeCanonicalBase64Url(parts[3]);
    if (
      nonce.length !== DOCUMENT_TOKEN_NONCE_BYTES
      || authenticationTag.length !== DOCUMENT_TOKEN_AUTH_TAG_BYTES
    ) {
      throw new Error('Invalid encrypted document token shape');
    }

    const decipher = createDecipheriv('aes-256-gcm', documentEncryptionKey(), nonce);
    decipher.setAAD(DOCUMENT_TOKEN_AAD);
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    payload = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  return validateDocumentTokenPayload(payload, nowSeconds);
};

const verifyLegacySignedDocumentToken = (token, nowSeconds) => {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  const [encodedPayload, encodedSignature] = parts;
  const providedSignature = decodeCanonicalBase64Url(encodedSignature);
  const expectedSignature = createHmac('sha256', documentSigningSecret())
    .update(encodedPayload)
    .digest();
  if (
    providedSignature.length !== SIGNATURE_BYTE_LENGTH
    || !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  let payload;
  try {
    payload = JSON.parse(decodeCanonicalBase64Url(encodedPayload).toString('utf8'));
  } catch {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  return validateDocumentTokenPayload(payload, nowSeconds);
};

/**
 * Issue a short-lived, confidentiality-preserving AES-256-GCM URL token.
 * Legacy HMAC tokens remain verify-only until their normal expiry.
 */
export const getSignedUrl = (filePath, _expiresIn = 3600) => {
  try {
    // Validate before encryption so a token can never authorize a path outside
    // the private document bucket.
    getFullPath(filePath);

    const expiresIn = Number(_expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS);
    if (
      !Number.isInteger(expiresIn)
      || expiresIn <= 0
      || expiresIn > MAX_SIGNED_URL_TTL_SECONDS
    ) {
      throw new Error('Invalid signed document URL expiry');
    }

    const plaintext = Buffer.from(JSON.stringify({
      p: filePath,
      e: Math.floor(Date.now() / 1000) + expiresIn,
    }), 'utf8');
    const nonce = randomBytes(DOCUMENT_TOKEN_NONCE_BYTES);
    const cipher = createCipheriv('aes-256-gcm', documentEncryptionKey(), nonce);
    cipher.setAAD(DOCUMENT_TOKEN_AAD);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authenticationTag = cipher.getAuthTag();
    const token = [
      DOCUMENT_TOKEN_VERSION,
      nonce.toString('base64url'),
      ciphertext.toString('base64url'),
      authenticationTag.toString('base64url'),
    ].join('.');

    return `/api/documents/file/${token}`;
  } catch (error) {
    log.error('[DocumentStorage] Error generating URL', { error: error.message });
    throw error;
  }
};

/**
 * Verify current encrypted tokens and strict, unexpired legacy HMAC tokens.
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
  if (token.startsWith(`${DOCUMENT_TOKEN_VERSION}.`)) {
    return verifyEncryptedDocumentToken(token, nowSeconds);
  }
  return verifyLegacySignedDocumentToken(token, nowSeconds);
};

/**
 * Read a file authorized by a signed token while also protecting against a
 * symlink inside the bucket resolving outside the configured storage root.
 */
export const readSignedDocument = async (token) => {
  const verified = verifySignedDocumentToken(token);
  const lexicalStats = await fs.lstat(verified.fullPath);
  if (lexicalStats.isSymbolicLink() || !lexicalStats.isFile()) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }
  const [realStorageRoot, realFilePath] = await Promise.all([
    fs.realpath(documentStorageRoot()),
    fs.realpath(verified.fullPath),
  ]);
  if (!realFilePath.startsWith(`${realStorageRoot}${path.sep}`)) {
    throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
  }

  const fileHandle = await fs.open(realFilePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let buffer;
  try {
    const stats = await fileHandle.stat();
    const postOpenRealPath = await fs.realpath(verified.fullPath);
    const postOpenPathStats = await fs.stat(postOpenRealPath);
    if (
      !stats.isFile()
      || !postOpenRealPath.startsWith(`${realStorageRoot}${path.sep}`)
      || stats.dev !== postOpenPathStats.dev
      || stats.ino !== postOpenPathStats.ino
    ) {
      throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
    }
    buffer = await fileHandle.readFile();
    const postReadStats = await fileHandle.stat();
    const postReadRealPath = await fs.realpath(verified.fullPath);
    const postReadPathStats = await fs.stat(postReadRealPath);
    if (
      !postReadRealPath.startsWith(`${realStorageRoot}${path.sep}`)
      || postReadStats.dev !== postReadPathStats.dev
      || postReadStats.ino !== postReadPathStats.ino
      || postReadStats.size !== stats.size
    ) {
      throw signedDocumentError('DOCUMENT_TOKEN_INVALID', 'Invalid document token');
    }
  } finally {
    await fileHandle.close();
  }

  return {
    buffer,
    filePath: verified.filePath,
    filename: path.basename(verified.filePath),
    expiresAt: verified.expiresAt,
  };
};

/**
 * Validate evidence that is already stored in the private document bucket.
 * The DB metadata is treated as untrusted: path confinement, regular-file
 * status, exact size, declared type/extension, and content signature must all
 * agree. All failures use one safe error without echoing a path or filename.
 *
 * @param {Object} options
 * @param {string} options.filePath - Relative storage path from the DB
 * @param {number} options.expectedSize - DB file_size
 * @param {string} options.expectedMimeType - DB file_type
 * @param {string} options.expectedOriginalName - DB original_name
 * @param {string[]} options.allowedMimeTypes - Optional canonical allowlist
 * @returns {Promise<{size: number, mimeType: string}>}
 */
export const validateStoredFile = async ({
  filePath,
  expectedSize,
  expectedMimeType,
  expectedOriginalName,
  allowedMimeTypes,
}) => {
  try {
    const canonicalExpectedMimeType = MIME_TYPE_ALIASES[expectedMimeType] || expectedMimeType;
    const declaredType = DOCUMENT_TYPE_BY_MIME[canonicalExpectedMimeType];
    const canonicalAllowedMimeTypes = Array.isArray(allowedMimeTypes)
      ? allowedMimeTypes.map((mimeType) => MIME_TYPE_ALIASES[mimeType] || mimeType)
      : null;
    const normalizedSize = Number(expectedSize);
    if (
      !declaredType
      || !Number.isSafeInteger(normalizedSize)
      || normalizedSize <= 0
      || normalizedSize > MAX_DOCUMENT_SIZE_BYTES
      || !declaredType.acceptedExtensions.includes(fileExtension(filePath))
      || !declaredType.acceptedExtensions.includes(fileExtension(expectedOriginalName))
      || (canonicalAllowedMimeTypes && !canonicalAllowedMimeTypes.includes(canonicalExpectedMimeType))
    ) {
      throw invalidDocumentError();
    }

    const fullPath = getFullPath(filePath);
    const lexicalStats = await fs.lstat(fullPath);
    if (lexicalStats.isSymbolicLink() || !lexicalStats.isFile()) {
      throw invalidDocumentError();
    }
    const [realStorageRoot, realFilePath] = await Promise.all([
      fs.realpath(documentStorageRoot()),
      fs.realpath(fullPath),
    ]);
    if (!realFilePath.startsWith(`${realStorageRoot}${path.sep}`)) {
      throw invalidDocumentError();
    }

    const fileHandle = await fs.open(
      realFilePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
    );
    let stats;
    let buffer;
    try {
      stats = await fileHandle.stat();
      const postOpenRealPath = await fs.realpath(fullPath);
      const postOpenPathStats = await fs.stat(postOpenRealPath);
      if (
        !postOpenRealPath.startsWith(`${realStorageRoot}${path.sep}`)
        || stats.dev !== postOpenPathStats.dev
        || stats.ino !== postOpenPathStats.ino
      ) {
        throw invalidDocumentError();
      }
      buffer = await fileHandle.readFile();
      const postReadStats = await fileHandle.stat();
      const postReadRealPath = await fs.realpath(fullPath);
      const postReadPathStats = await fs.stat(postReadRealPath);
      if (
        !postReadRealPath.startsWith(`${realStorageRoot}${path.sep}`)
        || postReadStats.dev !== postReadPathStats.dev
        || postReadStats.ino !== postReadPathStats.ino
        || postReadStats.size !== stats.size
      ) {
        throw invalidDocumentError();
      }
    } finally {
      await fileHandle.close();
    }
    const actualMimeType = detectDocumentMimeType(buffer);
    await validateDocumentStructure(actualMimeType, buffer);
    if (
      !stats.isFile()
      || stats.size !== normalizedSize
      || buffer.length !== normalizedSize
      || actualMimeType !== canonicalExpectedMimeType
    ) {
      throw invalidDocumentError();
    }

    return { size: normalizedSize, mimeType: actualMimeType };
  } catch (_error) {
    throw invalidDocumentError();
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
