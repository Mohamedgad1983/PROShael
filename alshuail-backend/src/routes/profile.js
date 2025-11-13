/**
 * User Profile Routes
 * Handles user profile management including avatar upload
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth.js';
import { upload, supabase, BUCKET_NAME, generateFilePath } from '../config/documentStorage.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// Rate limiting for password changes (5 attempts per hour per user)
const passwordChangeAttempts = new Map();
const MAX_PASSWORD_ATTEMPTS = 5;
const PASSWORD_ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Cleanup old attempts every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of passwordChangeAttempts.entries()) {
    if (now - data.firstAttempt > PASSWORD_ATTEMPT_WINDOW) {
      passwordChangeAttempts.delete(userId);
    }
  }
}, 10 * 60 * 1000);

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
      .maybeSingle();

    if (error) {
      log.error('Error fetching user profile:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
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
 * GET /api/user/profile/notifications
 * Get user notification preferences
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query profiles for notification_preferences
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      log.error('Error fetching notification preferences:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Return notification preferences with defaults if null
    const defaultPreferences = {
      email_notifications: true,
      push_notifications: false,
      member_updates: true,
      financial_alerts: true,
      system_updates: false
    };

    res.json({
      success: true,
      data: data.notification_preferences || defaultPreferences
    });
  } catch (error) {
    log.error('Error in GET /notifications:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الإشعارات',
      message_en: 'Failed to fetch notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/profile/notifications
 * Update user notification preferences
 */
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_notifications,
      push_notifications,
      member_updates,
      financial_alerts,
      system_updates
    } = req.body;

    // Validate that at least one preference is provided
    if (
      email_notifications === undefined &&
      push_notifications === undefined &&
      member_updates === undefined &&
      financial_alerts === undefined &&
      system_updates === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تقديم أي تحديثات للإشعارات',
        message_en: 'No notification preferences provided'
      });
    }

    // Prepare notification preferences object
    const preferences = {};
    if (email_notifications !== undefined) preferences.email_notifications = !!email_notifications;
    if (push_notifications !== undefined) preferences.push_notifications = !!push_notifications;
    if (member_updates !== undefined) preferences.member_updates = !!member_updates;
    if (financial_alerts !== undefined) preferences.financial_alerts = !!financial_alerts;
    if (system_updates !== undefined) preferences.system_updates = !!system_updates;

    // Fetch current preferences first
    const { data: currentData } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    // Merge with existing preferences
    const currentPreferences = currentData?.notification_preferences || {
      email_notifications: true,
      push_notifications: false,
      member_updates: true,
      financial_alerts: true,
      system_updates: false
    };

    const updatedPreferences = {
      ...currentPreferences,
      ...preferences
    };

    // Update notification preferences in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        notification_preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      log.error('Notification preferences update error:', updateError);
      throw updateError;
    }

    log.info(`Notification preferences updated for user ${userId}`);

    res.json({
      success: true,
      message: 'تم تحديث إعدادات الإشعارات بنجاح',
      message_en: 'Notification preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    log.error('Error in PUT /notifications:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الإشعارات',
      message_en: 'Failed to update notification preferences',
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

    // Get current avatar and member_id to delete old avatar and update member record
    const { data: currentUser } = await supabase
      .from('user_details')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();

    // Get user's member_id from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('member_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profileData || !profileData.member_id) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم ليس عضواً في النظام',
        message_en: 'User is not a member in the system'
      });
    }

    const memberId = profileData.member_id;

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

    // Update member's profile_image_url
    const { error: updateError } = await supabase
      .from('members')
      .update({
        profile_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

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
      .maybeSingle();

    // Get user's member_id from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('member_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profileData || !profileData.member_id) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم ليس عضواً في النظام',
        message_en: 'User is not a member in the system'
      });
    }

    const memberId = profileData.member_id;

    // Remove avatar_url from member's profile_image_url
    const { error: updateError } = await supabase
      .from('members')
      .update({
        profile_image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

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
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, email, phone } = req.body;

    // Prepare update data
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    // Check if any updates provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تقديم أي تحديثات',
        message_en: 'No updates provided'
      });
    }

    // Validate input data
    const validationErrors = validateProfileUpdates(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        message_en: 'Invalid data',
        errors: validationErrors
      });
    }

    // Check email uniqueness if email is being updated
    if (updateData.email) {
      const emailUnique = await isEmailUnique(supabase, updateData.email, userId);
      if (!emailUnique) {
        return res.status(409).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل',
          message_en: 'Email is already in use',
          errors: [{
            field: 'email',
            message: 'البريد الإلكتروني مستخدم بالفعل',
            message_en: 'Email is already in use'
          }]
        });
      }
    }

    // Check phone uniqueness if phone is being updated
    if (updateData.phone) {
      const phoneUnique = await isPhoneUnique(supabase, updateData.phone, userId);
      if (!phoneUnique) {
        return res.status(409).json({
          success: false,
          message: 'رقم الهاتف مستخدم بالفعل',
          message_en: 'Phone number is already in use',
          errors: [{
            field: 'phone',
            message: 'رقم الهاتف مستخدم بالفعل',
            message_en: 'Phone number is already in use'
          }]
        });
      }
    }

    // Update profiles table
    const profileUpdates = {};
    if (updateData.full_name !== undefined) profileUpdates.full_name = updateData.full_name;
    if (updateData.email !== undefined) profileUpdates.email = updateData.email;
    profileUpdates.updated_at = new Date().toISOString();

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
      .select('member_id')
      .maybeSingle();

    if (profileError) {
      log.error('Profile update error:', profileError);
      throw profileError;
    }

    if (!profileData) {
      return res.status(404).json({
        success: false,
        message: 'الملف الشخصي غير موجود',
        message_en: 'Profile not found'
      });
    }

    // If phone is being updated and user has member record, update members table
    if (updateData.phone && profileData.member_id) {
      const { error: memberError } = await supabase
        .from('members')
        .update({
          phone: updateData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileData.member_id);

      if (memberError) {
        log.error('Member phone update error:', memberError);
        // Non-critical error, continue
      }
    }

    // Fetch updated user details
    const { data: updatedUser } = await supabase
      .from('user_details')
      .select('id, email, full_name, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    log.info(`Profile updated for user ${userId}`);

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      message_en: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
        updated_at: profileUpdates.updated_at
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

/**
 * POST /api/user/change-password
 * Change user password with security validation
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Rate limiting check
    const now = Date.now();
    const userAttempts = passwordChangeAttempts.get(userId);

    if (userAttempts) {
      if (now - userAttempts.firstAttempt > PASSWORD_ATTEMPT_WINDOW) {
        // Window expired, reset
        passwordChangeAttempts.delete(userId);
      } else if (userAttempts.count >= MAX_PASSWORD_ATTEMPTS) {
        log.warn(`Password change rate limit exceeded for user ${userId}`);
        return res.status(429).json({
          success: false,
          message: 'تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً',
          message_en: 'Too many attempts. Please try again later'
        });
      }
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبة',
        message_en: 'Current and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل',
        message_en: 'New password must be at least 8 characters long'
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام',
        message_en: 'Password must contain uppercase, lowercase letters and numbers'
      });
    }

    // Prevent same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية',
        message_en: 'New password must be different from current password'
      });
    }

    // Track attempt
    if (!userAttempts) {
      passwordChangeAttempts.set(userId, { count: 1, firstAttempt: now });
    } else {
      userAttempts.count++;
    }

    // Get current password hash from auth.users
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('encrypted_password')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData) {
      log.error('Error fetching user for password change:', userError);
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.encrypted_password);
    if (!isValidPassword) {
      log.warn(`Invalid current password for user ${userId}`);
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
        message_en: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in auth.users
    const { error: updateError } = await supabase
      .from('auth.users')
      .update({
        encrypted_password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      log.error('Password update error:', updateError);
      throw updateError;
    }

    // Log password change audit trail
    log.info(`Password changed successfully for user ${userId}`, {
      userId,
      timestamp: new Date().toISOString(),
      action: 'password_change'
    });

    // Reset rate limit counter on success
    passwordChangeAttempts.delete(userId);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      message_en: 'Password changed successfully'
    });
  } catch (error) {
    log.error('Error in POST /change-password:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تغيير كلمة المرور',
      message_en: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/user/profile/reset-password-rate-limit
 * Reset password change rate limit for current user (development/testing only)
 */
router.delete('/reset-password-rate-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear rate limit for this user
    passwordChangeAttempts.delete(userId);

    log.info(`Password change rate limit reset for user ${userId}`);

    res.json({
      success: true,
      message: 'تم إعادة تعيين حد المحاولات بنجاح',
      message_en: 'Rate limit reset successfully'
    });
  } catch (error) {
    log.error('Error resetting rate limit:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تعيين حد المحاولات',
      message_en: 'Failed to reset rate limit'
    });
  }
});

export default router;
