import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Multer configuration for temporary file storage
const storage = multer.memoryStorage();

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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

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

// Storage bucket name
const BUCKET_NAME = 'member-documents';

// Generate unique file path
const generateFilePath = (userId, category, filename) => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${category}/${timestamp}_${sanitizedFilename}`;
};

// Upload file to Supabase Storage
const uploadToSupabase = async (file, userId, category) => {
  try {
    const filePath = generateFilePath(userId, category, file.originalname);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
      size: file.size,
      type: file.mimetype
    };
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
};

// Delete file from Supabase Storage
const deleteFromSupabase = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw error;
  }
};

// Get signed URL for secure download
const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
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
  BUCKET_NAME
};