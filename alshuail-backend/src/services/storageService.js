/**
 * Storage Service - بديل Supabase Storage
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

const STORAGE_BASE = process.env.STORAGE_PATH || '/var/www/alshuail/storage';
const PUBLIC_URL = process.env.STORAGE_URL || 'https://api.alshailfund.com/uploads';

// Buckets مثل Supabase
export const BUCKETS = {
  members: 'members',
  documents: 'documents',
  photos: 'photos',
  receipts: 'receipts',
  avatars: 'avatars',
  temp: 'temp'
};

// تحويل الحجم للقراءة
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// إنشاء مجلد Bucket
export const ensureBucket = async (bucket) => {
  const bucketPath = path.join(STORAGE_BASE, bucket);
  if (!fsSync.existsSync(bucketPath)) {
    await fs.mkdir(bucketPath, { recursive: true });
  }
  return bucketPath;
};

// التحقق من نوع الملف
const isImage = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
};

/**
 * رفع ملف
 */
export const uploadFile = async (bucket, filename, fileBuffer, options = {}) => {
  try {
    const bucketPath = await ensureBucket(bucket);
    
    const ext = path.extname(filename).toLowerCase();
    let uniqueName = options.keepName ? filename : `${uuidv4()}${ext}`;
    const filePath = path.join(bucketPath, uniqueName);
    
    let finalBuffer = fileBuffer;
    
    if (isImage(filename)) {
      if (options.resize) {
        finalBuffer = await sharp(fileBuffer)
          .resize(options.resize.width, options.resize.height, {
            fit: options.resize.fit || 'cover',
            withoutEnlargement: true
          })
          .toBuffer();
      }
      
      if (options.quality) {
        const format = ext === '.png' ? 'png' : 'jpeg';
        finalBuffer = await sharp(finalBuffer)
          [format]({ quality: options.quality })
          .toBuffer();
      }
    }
    
    await fs.writeFile(filePath, finalBuffer);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      bucket,
      filename: uniqueName,
      originalName: filename,
      path: `${bucket}/${uniqueName}`,
      publicUrl: `${PUBLIC_URL}/${bucket}/${uniqueName}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      mimeType: mime.lookup(uniqueName) || 'application/octet-stream',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * حذف ملف
 */
export const deleteFile = async (bucket, filename) => {
  try {
    const filePath = path.join(STORAGE_BASE, bucket, filename);
    await fs.unlink(filePath);
    return { success: true, deleted: `${bucket}/${filename}` };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'الملف غير موجود' };
    }
    throw error;
  }
};

/**
 * معلومات ملف
 */
export const getFileInfo = async (bucket, filename) => {
  try {
    const filePath = path.join(STORAGE_BASE, bucket, filename);
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      bucket,
      filename,
      path: `${bucket}/${filename}`,
      publicUrl: `${PUBLIC_URL}/${bucket}/${filename}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      mimeType: mime.lookup(filename),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    return { exists: false, error: 'الملف غير موجود' };
  }
};

/**
 * قائمة الملفات في bucket
 */
export const listFiles = async (bucket, options = {}) => {
  try {
    const bucketPath = path.join(STORAGE_BASE, bucket);
    
    if (!fsSync.existsSync(bucketPath)) {
      return { files: [], total: 0 };
    }
    
    const files = await fs.readdir(bucketPath);
    
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(bucketPath, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          path: `${bucket}/${filename}`,
          publicUrl: `${PUBLIC_URL}/${bucket}/${filename}`,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          mimeType: mime.lookup(filename),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
    );
    
    fileList.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    return {
      files: fileList.slice(offset, offset + limit),
      total: fileList.length,
      limit,
      offset,
      hasMore: offset + limit < fileList.length
    };
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

/**
 * إحصائيات Storage
 */
export const getStorageStats = async () => {
  const stats = { buckets: {}, total: { files: 0, size: 0 } };
  
  for (const [name, bucket] of Object.entries(BUCKETS)) {
    const bucketPath = path.join(STORAGE_BASE, bucket);
    
    try {
      if (!fsSync.existsSync(bucketPath)) {
        stats.buckets[name] = { files: 0, size: 0, sizeFormatted: '0 B' };
        continue;
      }
      
      const files = await fs.readdir(bucketPath);
      let totalSize = 0;
      
      for (const file of files) {
        const fileStat = await fs.stat(path.join(bucketPath, file));
        totalSize += fileStat.size;
      }
      
      stats.buckets[name] = {
        files: files.length,
        size: totalSize,
        sizeFormatted: formatBytes(totalSize)
      };
      
      stats.total.files += files.length;
      stats.total.size += totalSize;
    } catch (error) {
      stats.buckets[name] = { files: 0, size: 0, sizeFormatted: '0 B', error: error.message };
    }
  }
  
  stats.total.sizeFormatted = formatBytes(stats.total.size);
  return stats;
};

/**
 * تنظيف الملفات المؤقتة
 */
export const cleanupTemp = async (olderThanHours = 24) => {
  const tempPath = path.join(STORAGE_BASE, 'temp');
  
  if (!fsSync.existsSync(tempPath)) return { deleted: 0 };
  
  const files = await fs.readdir(tempPath);
  const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
  let deleted = 0;
  
  for (const file of files) {
    const filePath = path.join(tempPath, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtimeMs < cutoff) {
      await fs.unlink(filePath);
      deleted++;
    }
  }
  
  return { deleted, message: `تم حذف ${deleted} ملف مؤقت` };
};

export default {
  BUCKETS,
  uploadFile,
  deleteFile,
  getFileInfo,
  listFiles,
  getStorageStats,
  cleanupTemp,
  ensureBucket,
  formatBytes
};
