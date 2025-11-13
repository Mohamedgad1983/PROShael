/**
 * Profile Update Validation Utility
 * Validates user profile information updates (name, email, phone)
 */

/**
 * Validate profile update data
 * @param {Object} data - Profile data to validate
 * @param {string} [data.full_name] - User's full name (Arabic)
 * @param {string} [data.email] - User's email address
 * @param {string} [data.phone] - User's phone number (Saudi format)
 * @returns {Array} Array of validation error objects
 */
export function validateProfileUpdates(data) {
  const errors = [];

  // Full name validation (Arabic)
  if (data.full_name !== undefined) {
    if (!data.full_name || data.full_name.trim().length === 0) {
      errors.push({
        field: 'full_name',
        message: 'الاسم الكامل مطلوب',
        message_en: 'Full name is required'
      });
    } else if (data.full_name.trim().length < 3) {
      errors.push({
        field: 'full_name',
        message: 'الاسم يجب أن يكون 3 أحرف على الأقل',
        message_en: 'Name must be at least 3 characters'
      });
    } else if (data.full_name.trim().length > 100) {
      errors.push({
        field: 'full_name',
        message: 'الاسم يجب ألا يتجاوز 100 حرف',
        message_en: 'Name must not exceed 100 characters'
      });
    }
  }

  // Email validation
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني غير صالح',
        message_en: 'Invalid email address'
      });
    } else if (data.email.length > 255) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني يجب ألا يتجاوز 255 حرف',
        message_en: 'Email must not exceed 255 characters'
      });
    }
  }

  // Phone validation (Saudi format: 05xxxxxxxx or 5xxxxxxxx)
  if (data.phone !== undefined && data.phone) {
    const phoneRegex = /^(05|5)[0-9]{8}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push({
        field: 'phone',
        message: 'رقم الهاتف يجب أن يكون بصيغة سعودية صحيحة (05xxxxxxxx)',
        message_en: 'Phone must be a valid Saudi number (05xxxxxxxx)'
      });
    }
  }

  return errors;
}

/**
 * Check if email is unique (not used by another user)
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email to check
 * @param {string} currentUserId - Current user's ID to exclude from check
 * @returns {Promise<boolean>} True if email is unique, false if already used
 */
export async function isEmailUnique(supabase, email, currentUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .neq('id', currentUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null;
}

/**
 * Check if phone is unique (not used by another member)
 * @param {Object} supabase - Supabase client
 * @param {string} phone - Phone number to check
 * @param {string} currentUserId - Current user's ID to exclude from check
 * @returns {Promise<boolean>} True if phone is unique, false if already used
 */
export async function isPhoneUnique(supabase, phone, currentUserId) {
  // Get current user's member_id
  const { data: profileData } = await supabase
    .from('profiles')
    .select('member_id')
    .eq('id', currentUserId)
    .maybeSingle();

  if (!profileData || !profileData.member_id) {
    return true; // User has no member record, skip check
  }

  // Check if phone is used by another member
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('phone', phone)
    .neq('id', profileData.member_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null;
}
