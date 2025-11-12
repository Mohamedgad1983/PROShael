/**
 * User Profile Routes
 * Handles user profile management including avatar upload
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, supabase, BUCKET_NAME, generateFilePath } from '../config/documentStorage.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/user/profile
 * Get current user profile information
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query user_details view for comprehensive user info
    const { data, error } = await supabase
      .from('user_details')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('Error fetching user profile:', error);
      throw error;
    }

    // Return profile data
    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        role: data.role,
        role_name_ar: data.role_name_ar,
        permissions: data.permissions,
        membership_number: data.membership_number,
        member_name: data.member_name
      }
    });
  } catch (error) {
    log.error('Error in GET /profile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الملف الشخصي',
      message_en: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/user/profile/avatar
 * Upload user avatar image
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء تحديد صورة',
        message_en: 'Please select an image'
      });
    }

    const userId = req.user.id;
    const file = req.file;

    // Validate file type (only images)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الملف غير مدعوم. الرجاء استخدام PNG أو JPG',
        message_en: 'Unsupported file type. Please use PNG, JPG, or WebP'
      });
    }

    // Validate file size (2MB max for avatars)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف يتجاوز 2 ميجابايت',
        message_en: 'File size exceeds 2MB'
      });
    }

    // Get current avatar to delete old one
    const { data: currentUser } = await supabase
      .from('user_details')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    // Generate file path for avatar
    const filePath = generateFilePath(userId, 'avatars', file.originalname);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      log.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update user's raw_user_meta_data with avatar_url
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        raw_user_meta_data: supabase.raw(`
          COALESCE(raw_user_meta_data, '{}'::jsonb) ||
          '{"avatar_url": "${publicUrl}"}'::jsonb
        `),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, raw_user_meta_data')
      .single();

    if (updateError) {
      log.error('Database update error:', updateError);
      // Try to clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      throw updateError;
    }

    // Delete old avatar if exists
    if (currentUser?.avatar_url) {
      try {
        // Extract path from URL
        const oldUrl = currentUser.avatar_url;
        const bucketUrl = `${supabase.storage.from(BUCKET_NAME).getPublicUrl('').data.publicUrl}/`;
        const oldPath = oldUrl.replace(bucketUrl, '');

        await supabase.storage
          .from(BUCKET_NAME)
          .remove([oldPath]);

        log.info(`Old avatar deleted: ${oldPath}`);
      } catch (deleteErr) {
        log.warn('Failed to delete old avatar:', deleteErr);
        // Non-critical error, continue
      }
    }

    log.info(`Avatar uploaded successfully for user ${userId}`);

    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      message_en: 'Avatar uploaded successfully',
      data: {
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Error in POST /avatar:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في رفع الصورة',
      message_en: 'Failed to upload avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/user/profile/avatar
 * Remove user avatar
 */
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current avatar
    const { data: currentUser } = await supabase
      .from('user_details')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    // Update database to remove avatar_url from metadata
    const { error: updateError } = await supabase
      .from('users')
      .update({
        raw_user_meta_data: supabase.raw(`
          COALESCE(raw_user_meta_data, '{}'::jsonb) - 'avatar_url'
        `),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      log.error('Database update error:', updateError);
      throw updateError;
    }

    // Delete file from storage
    if (currentUser?.avatar_url) {
      try {
        // Extract path from URL
        const avatarUrl = currentUser.avatar_url;
        const bucketUrl = `${supabase.storage.from(BUCKET_NAME).getPublicUrl('').data.publicUrl}/`;
        const filePath = avatarUrl.replace(bucketUrl, '');

        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        if (deleteError) {
          log.warn('Failed to delete avatar file:', deleteError);
          // Non-critical error, continue
        } else {
          log.info(`Avatar file deleted: ${filePath}`);
        }
      } catch (deleteErr) {
        log.warn('Error during avatar file deletion:', deleteErr);
        // Non-critical error, continue
      }
    }

    log.info(`Avatar removed for user ${userId}`);

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      message_en: 'Avatar removed successfully'
    });
  } catch (error) {
    log.error('Error in DELETE /avatar:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الصورة',
      message_en: 'Failed to remove avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile information (name, email, phone)
 * Note: Currently placeholder for future implementation
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, email, phone } = req.body;

    // Validate inputs
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تقديم أي تحديثات',
        message_en: 'No updates provided'
      });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Update user record
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      log.error('Profile update error:', error);
      throw error;
    }

    log.info(`Profile updated for user ${userId}`);

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      message_en: 'Profile updated successfully',
      data: {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        updated_at: data.updated_at
      }
    });
  } catch (error) {
    log.error('Error in PUT /profile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الملف الشخصي',
      message_en: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
