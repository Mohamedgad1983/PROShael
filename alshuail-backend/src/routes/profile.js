/**
 * User Profile Routes
 * Handles user profile management including avatar upload
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth.js';
import { upload, supabase, BUCKET_NAME, generateFilePath, uploadToSupabase, deleteFromSupabase, getSignedUrl } from '../config/documentStorage.js';
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

    // Upload to local filesystem (migrated from Supabase Storage)
    const uploadResult = await uploadToSupabase(file, userId, 'avatars');
    const publicUrl = uploadResult.url;

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
      await deleteFromSupabase(uploadResult.path);
      throw updateError;
    }

    // Delete old avatar if exists
    if (currentUser?.avatar_url) {
      try {
        // Extract path from URL - for local storage, path is after /member-documents/
        const oldUrl = currentUser.avatar_url;
        const pathMatch = oldUrl.match(/member-documents\/(.+)$/);
        if (pathMatch) {
          const oldPath = pathMatch[1];
          await deleteFromSupabase(oldPath);
          log.info(`Old avatar deleted: ${oldPath}`);
        }
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
        // Extract path from URL - for local storage, path is after /member-documents/
        const avatarUrl = currentUser.avatar_url;
        const pathMatch = avatarUrl.match(/member-documents\/(.+)$/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          await deleteFromSupabase(filePath);
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

    // Get current password hash from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('password_hash')
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

    if (!userData.password_hash) {
      log.error(`No password hash found for user ${userId}`);
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تغيير كلمة المرور لهذا الحساب',
        message_en: 'Cannot change password for this account'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.password_hash);
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

    // Update password in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
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

// ============================================================================
// NOTIFICATION SETTINGS ENDPOINTS
// Feature 5.1: User Notification Preferences Management
// ============================================================================

// Rate limiting for notification settings updates (10 updates per hour per user)
const notificationSettingsAttempts = new Map();
const MAX_NOTIFICATION_UPDATES = 10;
const NOTIFICATION_UPDATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Cleanup old attempts every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of notificationSettingsAttempts.entries()) {
    if (now - data.firstAttempt > NOTIFICATION_UPDATE_WINDOW) {
      notificationSettingsAttempts.delete(userId);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/user/profile/notification-settings
 * Retrieve current user's notification preferences
 *
 * Response:
 * {
 *   success: true,
 *   settings: {
 *     email_enabled: boolean,
 *     sms_enabled: boolean,
 *     push_enabled: boolean,
 *     types: string[],
 *     frequency: 'instant' | 'daily' | 'weekly',
 *     quiet_hours: { start: 'HH:MM', end: 'HH:MM', overnight: boolean }
 *   }
 * }
 */
router.get('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    log.info(`Fetching notification settings for user ${userId}`);

    // Query user's notification settings
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('notification_settings')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      log.error('Database error fetching notification settings:', userError);
      throw userError;
    }

    if (!userData) {
      log.warn(`User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Return notification settings (will always have defaults due to database constraint)
    log.info(`Successfully retrieved notification settings for user ${userId}`);

    res.json({
      success: true,
      settings: userData.notification_settings,
      message: 'تم جلب إعدادات الإشعارات بنجاح',
      message_en: 'Notification settings retrieved successfully'
    });

  } catch (error) {
    log.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الإشعارات',
      message_en: 'Failed to retrieve notification settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/profile/notification-settings
 * Update current user's notification preferences
 *
 * Request Body:
 * {
 *   email_enabled?: boolean,
 *   sms_enabled?: boolean,
 *   push_enabled?: boolean,
 *   types?: string[],
 *   frequency?: 'instant' | 'daily' | 'weekly',
 *   quiet_hours?: { start: 'HH:MM', end: 'HH:MM', overnight?: boolean }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   settings: { ... updated settings ... }
 * }
 */
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    log.info(`Updating notification settings for user ${userId}`, { updateData });

    // Rate limiting check
    const now = Date.now();
    const attempts = notificationSettingsAttempts.get(userId);

    if (attempts) {
      if (now - attempts.firstAttempt < NOTIFICATION_UPDATE_WINDOW) {
        if (attempts.count >= MAX_NOTIFICATION_UPDATES) {
          const timeLeft = Math.ceil((NOTIFICATION_UPDATE_WINDOW - (now - attempts.firstAttempt)) / 60000);
          log.warn(`Rate limit exceeded for user ${userId}`);
          return res.status(429).json({
            success: false,
            message: `تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${timeLeft} دقيقة`,
            message_en: `Rate limit exceeded. Please try again in ${timeLeft} minutes`,
            retryAfter: timeLeft
          });
        }
        attempts.count++;
      } else {
        notificationSettingsAttempts.set(userId, { firstAttempt: now, count: 1 });
      }
    } else {
      notificationSettingsAttempts.set(userId, { firstAttempt: now, count: 1 });
    }

    // Validation: Ensure at least one field is being updated
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث',
        message_en: 'No data to update'
      });
    }

    // Validation: Check valid fields
    const validFields = ['email_enabled', 'sms_enabled', 'push_enabled', 'types', 'frequency', 'quiet_hours'];
    const invalidFields = Object.keys(updateData).filter(key => !validFields.includes(key));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `حقول غير صالحة: ${invalidFields.join(', ')}`,
        message_en: `Invalid fields: ${invalidFields.join(', ')}`
      });
    }

    // Validation: Type checks
    if (updateData.email_enabled !== undefined && typeof updateData.email_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'email_enabled يجب أن يكون قيمة منطقية',
        message_en: 'email_enabled must be a boolean'
      });
    }

    if (updateData.sms_enabled !== undefined && typeof updateData.sms_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'sms_enabled يجب أن يكون قيمة منطقية',
        message_en: 'sms_enabled must be a boolean'
      });
    }

    if (updateData.push_enabled !== undefined && typeof updateData.push_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'push_enabled يجب أن يكون قيمة منطقية',
        message_en: 'push_enabled must be a boolean'
      });
    }

    // Validation: Notification types
    if (updateData.types !== undefined) {
      if (!Array.isArray(updateData.types)) {
        return res.status(400).json({
          success: false,
          message: 'types يجب أن يكون مصفوفة',
          message_en: 'types must be an array'
        });
      }

      if (updateData.types.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب اختيار نوع إشعار واحد على الأقل',
          message_en: 'At least one notification type must be selected'
        });
      }

      const validTypes = ['system', 'security', 'members', 'finance', 'family_tree'];
      const invalidTypes = updateData.types.filter(type => !validTypes.includes(type));

      if (invalidTypes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `أنواع إشعارات غير صالحة: ${invalidTypes.join(', ')}`,
          message_en: `Invalid notification types: ${invalidTypes.join(', ')}`
        });
      }
    }

    // Validation: Frequency
    if (updateData.frequency !== undefined) {
      const validFrequencies = ['instant', 'daily', 'weekly'];
      if (!validFrequencies.includes(updateData.frequency)) {
        return res.status(400).json({
          success: false,
          message: 'frequency يجب أن يكون: instant, daily, أو weekly',
          message_en: 'frequency must be one of: instant, daily, weekly'
        });
      }
    }

    // Validation: Quiet hours
    if (updateData.quiet_hours !== undefined) {
      if (typeof updateData.quiet_hours !== 'object' || updateData.quiet_hours === null) {
        return res.status(400).json({
          success: false,
          message: 'quiet_hours يجب أن يكون كائن',
          message_en: 'quiet_hours must be an object'
        });
      }

      const { start, end } = updateData.quiet_hours;
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (!start || !timeRegex.test(start)) {
        return res.status(400).json({
          success: false,
          message: 'وقت البداية يجب أن يكون بصيغة HH:MM',
          message_en: 'Start time must be in HH:MM format'
        });
      }

      if (!end || !timeRegex.test(end)) {
        return res.status(400).json({
          success: false,
          message: 'وقت النهاية يجب أن يكون بصيغة HH:MM',
          message_en: 'End time must be in HH:MM format'
        });
      }

      // Add overnight flag if times indicate overnight period
      if (start > end) {
        updateData.quiet_hours.overnight = true;
      } else {
        updateData.quiet_hours.overnight = false;
      }
    }

    // Fetch current settings
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('notification_settings')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      log.error('Database error fetching current settings:', fetchError);
      throw fetchError;
    }

    if (!currentUser) {
      log.warn(`User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Merge with existing settings (partial update support)
    const updatedSettings = {
      ...currentUser.notification_settings,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    log.info(`Merged settings for user ${userId}:`, updatedSettings);

    // Update database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ notification_settings: updatedSettings })
      .eq('id', userId)
      .select('notification_settings')
      .single();

    if (updateError) {
      log.error('Database error updating notification settings:', updateError);

      // Check if it's a constraint violation
      if (updateError.code === '23514') {
        return res.status(400).json({
          success: false,
          message: 'البيانات المدخلة لا تتوافق مع القيود المطلوبة',
          message_en: 'Data does not meet required constraints',
          error: updateError.message
        });
      }

      throw updateError;
    }

    // Log successful update in audit log
    log.info(`Notification settings updated successfully for user ${userId}`, {
      oldSettings: currentUser.notification_settings,
      newSettings: updatedUser.notification_settings
    });

    res.json({
      success: true,
      settings: updatedUser.notification_settings,
      message: 'تم تحديث إعدادات الإشعارات بنجاح',
      message_en: 'Notification settings updated successfully'
    });

  } catch (error) {
    log.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الإشعارات',
      message_en: 'Failed to update notification settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/user/profile/notification-settings/reset-rate-limit
 * Reset notification settings update rate limit for current user
 * Utility endpoint for testing and support
 */
router.delete('/notification-settings/reset-rate-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    notificationSettingsAttempts.delete(userId);

    log.info(`Notification settings rate limit reset for user ${userId}`);

    res.json({
      success: true,
      message: 'تم إعادة تعيين حد المحاولات بنجاح',
      message_en: 'Rate limit reset successfully'
    });
  } catch (error) {
    log.error('Error resetting notification settings rate limit:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تعيين حد المحاولات',
      message_en: 'Failed to reset rate limit'
    });
  }
});

// ============================================================================
// APPEARANCE SETTINGS ENDPOINTS (Feature 5.2)
// ============================================================================

// Rate limiting for appearance settings updates
const appearanceSettingsAttempts = new Map();
const MAX_APPEARANCE_UPDATES = 10;
const APPEARANCE_UPDATE_WINDOW = 60 * 60 * 1000; // 1 hour

// Cleanup old appearance attempts every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of appearanceSettingsAttempts.entries()) {
    if (now - data.firstAttempt > APPEARANCE_UPDATE_WINDOW) {
      appearanceSettingsAttempts.delete(userId);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/user/profile/appearance-settings
 * Retrieve user's appearance/theme settings
 */
router.get('/appearance-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    log.info(`Fetching appearance settings for user ${userId}`);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('appearance_settings')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      log.error('Database error fetching appearance settings:', userError);
      throw userError;
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    log.info(`Appearance settings retrieved successfully for user ${userId}`);

    res.json({
      success: true,
      settings: userData.appearance_settings,
      message: 'تم جلب إعدادات المظهر بنجاح',
      message_en: 'Appearance settings retrieved successfully'
    });
  } catch (error) {
    log.error('Error fetching appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات المظهر',
      message_en: 'Failed to retrieve appearance settings'
    });
  }
});

/**
 * PUT /api/user/profile/appearance-settings
 * Update user's appearance/theme settings
 */
router.put('/appearance-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    log.info(`Updating appearance settings for user ${userId}`, { updateData });

    // Rate limiting check
    const now = Date.now();
    const attempts = appearanceSettingsAttempts.get(userId);

    if (attempts) {
      if (attempts.count >= MAX_APPEARANCE_UPDATES) {
        const timeLeft = Math.ceil((APPEARANCE_UPDATE_WINDOW - (now - attempts.firstAttempt)) / 60000);
        log.warn(`Rate limit exceeded for user ${userId}`);
        return res.status(429).json({
          success: false,
          message: `تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${timeLeft} دقيقة`,
          message_en: `Rate limit exceeded. Please try again in ${timeLeft} minutes`,
          retryAfter: timeLeft
        });
      }
      attempts.count++;
    } else {
      appearanceSettingsAttempts.set(userId, { count: 1, firstAttempt: now });
    }

    // Validation: Check if there's data to update
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث',
        message_en: 'No data to update'
      });
    }

    // Validation: theme_mode
    if (updateData.theme_mode !== undefined) {
      if (typeof updateData.theme_mode !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'theme_mode يجب أن يكون نص',
          message_en: 'theme_mode must be a string'
        });
      }
      const validThemeModes = ['light', 'dark', 'auto'];
      if (!validThemeModes.includes(updateData.theme_mode)) {
        return res.status(400).json({
          success: false,
          message: `theme_mode يجب أن يكون: ${validThemeModes.join(', ')}`,
          message_en: `theme_mode must be one of: ${validThemeModes.join(', ')}`
        });
      }
    }

    // Validation: primary_color (hex format)
    if (updateData.primary_color !== undefined) {
      if (typeof updateData.primary_color !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'primary_color يجب أن يكون نص',
          message_en: 'primary_color must be a string'
        });
      }
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(updateData.primary_color)) {
        return res.status(400).json({
          success: false,
          message: 'primary_color يجب أن يكون رمز لون hex صالح (مثال: #1976d2)',
          message_en: 'primary_color must be a valid hex color code (e.g., #1976d2)'
        });
      }
    }

    // Validation: font_size
    if (updateData.font_size !== undefined) {
      if (typeof updateData.font_size !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'font_size يجب أن يكون نص',
          message_en: 'font_size must be a string'
        });
      }
      const validFontSizes = ['small', 'medium', 'large'];
      if (!validFontSizes.includes(updateData.font_size)) {
        return res.status(400).json({
          success: false,
          message: `font_size يجب أن يكون: ${validFontSizes.join(', ')}`,
          message_en: `font_size must be one of: ${validFontSizes.join(', ')}`
        });
      }
    }

    // Validation: compact_mode
    if (updateData.compact_mode !== undefined && typeof updateData.compact_mode !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'compact_mode يجب أن يكون قيمة منطقية',
        message_en: 'compact_mode must be a boolean'
      });
    }

    // Validation: animations_enabled
    if (updateData.animations_enabled !== undefined && typeof updateData.animations_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'animations_enabled يجب أن يكون قيمة منطقية',
        message_en: 'animations_enabled must be a boolean'
      });
    }

    // Fetch current settings to merge with updates
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('appearance_settings')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      log.error('Error fetching current appearance settings:', fetchError);
      throw fetchError;
    }

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Merge updates with existing settings (partial update support)
    const updatedSettings = {
      ...currentUser.appearance_settings,
      ...updateData
    };

    // Remove updated_at if user provided it (we control this field)
    delete updatedSettings.updated_at;

    // Update database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ appearance_settings: updatedSettings })
      .eq('id', userId)
      .select('appearance_settings')
      .single();

    if (updateError) {
      log.error('Error updating appearance settings:', updateError);

      // Handle database constraint violations
      if (updateError.code === '23514') {
        return res.status(400).json({
          success: false,
          message: 'بيانات الإعدادات غير صالحة',
          message_en: 'Invalid settings data',
          details: updateError.message
        });
      }

      throw updateError;
    }

    log.info(`Appearance settings updated successfully for user ${userId}`, {
      oldSettings: currentUser.appearance_settings,
      newSettings: updatedUser.appearance_settings
    });

    res.json({
      success: true,
      settings: updatedUser.appearance_settings,
      message: 'تم تحديث إعدادات المظهر بنجاح',
      message_en: 'Appearance settings updated successfully'
    });
  } catch (error) {
    log.error('Error updating appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات المظهر',
      message_en: 'Failed to update appearance settings'
    });
  }
});

/**
 * DELETE /api/user/profile/appearance-settings/reset-rate-limit
 * Reset rate limit for appearance settings updates (for testing)
 */
router.delete('/appearance-settings/reset-rate-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    appearanceSettingsAttempts.delete(userId);

    log.info(`Rate limit reset for appearance settings - user ${userId}`);

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

// ============================================================================
// LANGUAGE & REGION SETTINGS ENDPOINTS (Feature 5.3)
// ============================================================================

// Rate limiting for language settings updates
const languageSettingsAttempts = new Map();
const MAX_LANGUAGE_UPDATES = 10;
const LANGUAGE_UPDATE_WINDOW = 60 * 60 * 1000; // 1 hour

// Cleanup old language attempts every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of languageSettingsAttempts.entries()) {
    if (now - data.firstAttempt > LANGUAGE_UPDATE_WINDOW) {
      languageSettingsAttempts.delete(userId);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/user/profile/language-settings
 * Retrieve user's language and region settings
 */
router.get('/language-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    log.info(`Fetching language settings for user ${userId}`);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('language_settings')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      log.error('Database error fetching language settings:', userError);
      throw userError;
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    log.info(`Language settings retrieved successfully for user ${userId}`);

    res.json({
      success: true,
      settings: userData.language_settings,
      message: 'تم جلب إعدادات اللغة والمنطقة بنجاح',
      message_en: 'Language settings retrieved successfully'
    });
  } catch (error) {
    log.error('Error fetching language settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات اللغة والمنطقة',
      message_en: 'Failed to retrieve language settings'
    });
  }
});

/**
 * PUT /api/user/profile/language-settings
 * Update user's language and region settings
 */
router.put('/language-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    log.info(`Updating language settings for user ${userId}`, { updateData });

    // Rate limiting check
    const now = Date.now();
    const attempts = languageSettingsAttempts.get(userId);

    if (attempts) {
      if (attempts.count >= MAX_LANGUAGE_UPDATES) {
        const timeLeft = Math.ceil((LANGUAGE_UPDATE_WINDOW - (now - attempts.firstAttempt)) / 60000);
        log.warn(`Rate limit exceeded for user ${userId}`);
        return res.status(429).json({
          success: false,
          message: `تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ${timeLeft} دقيقة`,
          message_en: `Rate limit exceeded. Please try again in ${timeLeft} minutes`,
          retryAfter: timeLeft
        });
      }
      attempts.count++;
    } else {
      languageSettingsAttempts.set(userId, { count: 1, firstAttempt: now });
    }

    // Validation: Check if there's data to update
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث',
        message_en: 'No data to update'
      });
    }

    // Validation: language
    if (updateData.language !== undefined) {
      if (typeof updateData.language !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'language يجب أن يكون نص',
          message_en: 'language must be a string'
        });
      }
      const validLanguages = ['ar', 'en', 'both'];
      if (!validLanguages.includes(updateData.language)) {
        return res.status(400).json({
          success: false,
          message: `language يجب أن يكون: ${validLanguages.join(', ')}`,
          message_en: `language must be one of: ${validLanguages.join(', ')}`
        });
      }
    }

    // Validation: region (2-letter ISO code)
    if (updateData.region !== undefined) {
      if (typeof updateData.region !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'region يجب أن يكون نص',
          message_en: 'region must be a string'
        });
      }
      const regionRegex = /^[A-Z]{2}$/;
      if (!regionRegex.test(updateData.region)) {
        return res.status(400).json({
          success: false,
          message: 'region يجب أن يكون رمز ISO من حرفين (مثال: SA)',
          message_en: 'region must be a 2-letter ISO code (e.g., SA)'
        });
      }
    }

    // Validation: currency (3-letter ISO code)
    if (updateData.currency !== undefined) {
      if (typeof updateData.currency !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'currency يجب أن يكون نص',
          message_en: 'currency must be a string'
        });
      }
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(updateData.currency)) {
        return res.status(400).json({
          success: false,
          message: 'currency يجب أن يكون رمز ISO من ثلاثة أحرف (مثال: SAR)',
          message_en: 'currency must be a 3-letter ISO code (e.g., SAR)'
        });
      }
    }

    // Validation: date_format
    if (updateData.date_format !== undefined) {
      if (typeof updateData.date_format !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'date_format يجب أن يكون نص',
          message_en: 'date_format must be a string'
        });
      }
      const validDateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
      if (!validDateFormats.includes(updateData.date_format)) {
        return res.status(400).json({
          success: false,
          message: `date_format يجب أن يكون: ${validDateFormats.join(', ')}`,
          message_en: `date_format must be one of: ${validDateFormats.join(', ')}`
        });
      }
    }

    // Validation: time_format
    if (updateData.time_format !== undefined) {
      if (typeof updateData.time_format !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'time_format يجب أن يكون نص',
          message_en: 'time_format must be a string'
        });
      }
      const validTimeFormats = ['12h', '24h'];
      if (!validTimeFormats.includes(updateData.time_format)) {
        return res.status(400).json({
          success: false,
          message: `time_format يجب أن يكون: ${validTimeFormats.join(', ')}`,
          message_en: `time_format must be one of: ${validTimeFormats.join(', ')}`
        });
      }
    }

    // Validation: number_format
    if (updateData.number_format !== undefined) {
      if (typeof updateData.number_format !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'number_format يجب أن يكون نص',
          message_en: 'number_format must be a string'
        });
      }
      const validNumberFormats = ['western', 'arabic'];
      if (!validNumberFormats.includes(updateData.number_format)) {
        return res.status(400).json({
          success: false,
          message: `number_format يجب أن يكون: ${validNumberFormats.join(', ')}`,
          message_en: `number_format must be one of: ${validNumberFormats.join(', ')}`
        });
      }
    }

    // Validation: week_start
    if (updateData.week_start !== undefined) {
      if (typeof updateData.week_start !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'week_start يجب أن يكون نص',
          message_en: 'week_start must be a string'
        });
      }
      const validWeekStarts = ['saturday', 'sunday', 'monday'];
      if (!validWeekStarts.includes(updateData.week_start)) {
        return res.status(400).json({
          success: false,
          message: `week_start يجب أن يكون: ${validWeekStarts.join(', ')}`,
          message_en: `week_start must be one of: ${validWeekStarts.join(', ')}`
        });
      }
    }

    // Validation: timezone (basic check for valid string format)
    if (updateData.timezone !== undefined) {
      if (typeof updateData.timezone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'timezone يجب أن يكون نص',
          message_en: 'timezone must be a string'
        });
      }
      // Basic validation: timezone should contain a slash (e.g., "Asia/Riyadh")
      if (!updateData.timezone.includes('/')) {
        return res.status(400).json({
          success: false,
          message: 'timezone يجب أن يكون منطقة زمنية صالحة (مثال: Asia/Riyadh)',
          message_en: 'timezone must be a valid timezone (e.g., Asia/Riyadh)'
        });
      }
    }

    // Fetch current settings to merge with updates
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('language_settings')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      log.error('Error fetching current language settings:', fetchError);
      throw fetchError;
    }

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Merge updates with existing settings (partial update support)
    const updatedSettings = {
      ...currentUser.language_settings,
      ...updateData
    };

    // Remove updated_at if user provided it (we control this field)
    delete updatedSettings.updated_at;

    // Update database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ language_settings: updatedSettings })
      .eq('id', userId)
      .select('language_settings')
      .single();

    if (updateError) {
      log.error('Error updating language settings:', updateError);

      // Handle database constraint violations
      if (updateError.code === '23514') {
        return res.status(400).json({
          success: false,
          message: 'بيانات الإعدادات غير صالحة',
          message_en: 'Invalid settings data',
          details: updateError.message
        });
      }

      throw updateError;
    }

    log.info(`Language settings updated successfully for user ${userId}`, {
      oldSettings: currentUser.language_settings,
      newSettings: updatedUser.language_settings
    });

    res.json({
      success: true,
      settings: updatedUser.language_settings,
      message: 'تم تحديث إعدادات اللغة والمنطقة بنجاح',
      message_en: 'Language settings updated successfully'
    });
  } catch (error) {
    log.error('Error updating language settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات اللغة والمنطقة',
      message_en: 'Failed to update language settings'
    });
  }
});

/**
 * DELETE /api/user/profile/language-settings
 * Reset language settings to defaults
 */
router.delete('/language-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    log.info(`Resetting language settings to defaults for user ${userId}`);

    // Default language settings
    const defaultSettings = {
      language: 'ar',
      region: 'SA',
      timezone: 'Asia/Riyadh',
      date_format: 'DD/MM/YYYY',
      time_format: '12h',
      number_format: 'western',
      currency: 'SAR',
      week_start: 'saturday'
    };

    // Update database with defaults
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ language_settings: defaultSettings })
      .eq('id', userId)
      .select('language_settings')
      .single();

    if (updateError) {
      log.error('Error resetting language settings:', updateError);
      throw updateError;
    }

    log.info(`Language settings reset to defaults for user ${userId}`);

    res.json({
      success: true,
      settings: updatedUser.language_settings,
      message: 'تم إعادة تعيين إعدادات اللغة والمنطقة إلى الافتراضية بنجاح',
      message_en: 'Language settings reset to defaults successfully'
    });
  } catch (error) {
    log.error('Error resetting language settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تعيين إعدادات اللغة والمنطقة',
      message_en: 'Failed to reset language settings'
    });
  }
});

/**
 * DELETE /api/user/profile/language-settings/reset-rate-limit
 * Reset rate limit for language settings updates (for testing)
 */
router.delete('/language-settings/reset-rate-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    languageSettingsAttempts.delete(userId);

    log.info(`Rate limit reset for language settings - user ${userId}`);

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
