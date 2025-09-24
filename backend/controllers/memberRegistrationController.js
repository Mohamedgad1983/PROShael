import { supabase } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Helper function to convert Gregorian date to Hijri
function convertToHijri(gregorianDate) {
  try {
    if (!gregorianDate) return null;

    const date = new Date(gregorianDate);
    const hijriDate = date.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return hijriDate;
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    return null;
  }
}

// Helper function to validate National ID
function validateNationalId(nationalId) {
  if (!nationalId) return false;

  // Saudi National ID validation (10 digits, starts with 1 or 2)
  const cleanId = nationalId.toString().replace(/\D/g, '');

  if (cleanId.length !== 10) return false;
  if (!cleanId.startsWith('1') && !cleanId.startsWith('2')) return false;

  // Luhn algorithm validation for Saudi National ID
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleanId[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit = digit - 9;
    }
    sum += digit;
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return checkDigit === parseInt(cleanId[9]);
}

// Helper function to validate email
function validateEmail(email) {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate profile image URL
function validateImageUrl(url) {
  if (!url) return true; // Image is optional
  try {
    new URL(url);
    // Check if URL ends with common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  } catch {
    return false;
  }
}

export const verifyRegistrationToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 8) {
      return res.status(400).json({
        success: false,
        error: 'رمز التسجيل غير صحيح'
      });
    }

    // Get token data with member information
    const { data: tokenData, error: tokenError } = await supabase
      .from('member_registration_tokens')
      .select(`
        *,
        members (
          id,
          full_name,
          phone,
          whatsapp_number,
          membership_number,
          profile_completed
        )
      `)
      .eq('token', token.toUpperCase())
      .eq('is_used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(tokenData.expires_at);

    if (now > expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'رمز التسجيل منتهي الصلاحية'
      });
    }

    // Check if profile is already completed
    if (tokenData.members.profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });
    }

    // Return member data for registration form
    res.json({
      success: true,
      data: {
        token: tokenData.token,
        member: {
          id: tokenData.members.id,
          full_name: tokenData.members.full_name,
          phone: tokenData.members.phone,
          whatsapp_number: tokenData.members.whatsapp_number,
          membership_number: tokenData.members.membership_number
        },
        expires_at: tokenData.expires_at
      },
      message: 'رمز التسجيل صحيح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في التحقق من رمز التسجيل'
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      national_id,
      birth_date,
      employer,
      email,
      social_security_beneficiary,
      profile_image_url,
      national_id_document_url,
      temp_password
    } = req.body;

    // Validate required fields including National ID document
    if (!national_id || !birth_date || social_security_beneficiary === undefined || !temp_password || !national_id_document_url) {
      return res.status(400).json({
        success: false,
        error: 'الرقم الوطني وتاريخ الميلاد وحالة الضمان الاجتماعي وكلمة المرور المؤقتة وصورة الهوية مطلوبة'
      });
    }

    // Validate National ID
    if (!validateNationalId(national_id)) {
      return res.status(400).json({
        success: false,
        error: 'الرقم الوطني غير صحيح'
      });
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني غير صحيح'
      });
    }

    // Validate profile image URL if provided
    if (profile_image_url && !validateImageUrl(profile_image_url)) {
      return res.status(400).json({
        success: false,
        error: 'رابط الصورة الشخصية غير صحيح'
      });
    }

    // Validate birth date
    const birthDate = new Date(birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 15 || age > 100) {
      return res.status(400).json({
        success: false,
        error: 'تاريخ الميلاد غير صحيح'
      });
    }

    // Get and verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('member_registration_tokens')
      .select(`
        *,
        members (
          id,
          temp_password,
          profile_completed
        )
      `)
      .eq('token', token.toUpperCase())
      .eq('is_used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(tokenData.expires_at);

    if (now > expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'رمز التسجيل منتهي الصلاحية'
      });
    }

    // Check if profile is already completed
    if (tokenData.members.profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });
    }

    // Verify temporary password
    const passwordMatch = await bcrypt.compare(temp_password, tokenData.members.temp_password);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور المؤقتة غير صحيحة'
      });
    }

    // Store national_id in additional_info for now (since it's not a direct column)
    // In a production environment, you'd want to add this as a proper column

    // Check for duplicate email if provided
    if (email) {
      const { data: existingEmail } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .neq('id', tokenData.members.id)
        .single();

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'البريد الإلكتروني موجود مسبقاً'
        });
      }
    }

    // Convert birth date to Hijri
    const hijriBirthDate = convertToHijri(birth_date);

    // Update member profile
    const updateData = {
      date_of_birth: birth_date,
      date_of_birth_hijri: hijriBirthDate,
      employer: employer || null,
      email: email || null,
      social_security_beneficiary: social_security_beneficiary === true || social_security_beneficiary === 'true',
      profile_image_url: profile_image_url || null,
      profile_completed: true,
      temp_password: null, // Clear temporary password
      additional_info: JSON.stringify({
        national_id,
        national_id_document_url,
        national_id_verified: false, // Admin will verify later
        document_upload_date: new Date().toISOString()
      }), // Store national_id and document info
      updated_at: new Date().toISOString()
    };

    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', tokenData.members.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('member_registration_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);

    if (tokenUpdateError) {
      console.error('Error updating token status:', tokenUpdateError);
    }

    // Return success response
    res.json({
      success: true,
      data: {
        member: {
          id: updatedMember.id,
          full_name: updatedMember.full_name,
          membership_number: updatedMember.membership_number,
          phone: updatedMember.phone,
          email: updatedMember.email,
          profile_completed: updatedMember.profile_completed
        }
      },
      message: 'تم إكمال الملف الشخصي بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إكمال الملف الشخصي'
    });
  }
};

export const resendRegistrationToken = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get member data
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, phone, profile_completed')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    if (member.profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });
    }

    // Deactivate old tokens
    const { error: deactivateError } = await supabase
      .from('member_registration_tokens')
      .update({ is_used: true })
      .eq('member_id', memberId)
      .eq('is_used', false);

    if (deactivateError) {
      console.error('Error deactivating old tokens:', deactivateError);
    }

    // Generate new token
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let registrationToken;
    let tokenExists = true;

    while (tokenExists) {
      registrationToken = '';
      for (let i = 0; i < 8; i++) {
        registrationToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { data: existingToken } = await supabase
        .from('member_registration_tokens')
        .select('id')
        .eq('token', registrationToken)
        .single();

      tokenExists = !!existingToken;
    }

    // Get temporary password from member record
    const { data: memberWithPassword } = await supabase
      .from('member_registration_tokens')
      .select('temp_password')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tempPassword = memberWithPassword?.temp_password || '123456';

    // Create new token record
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const { error: tokenError } = await supabase
      .from('member_registration_tokens')
      .insert({
        member_id: memberId,
        token: registrationToken,
        temp_password: tempPassword,
        expires_at: expiryDate.toISOString(),
        is_used: false
      });

    if (tokenError) throw tokenError;

    res.json({
      success: true,
      data: {
        member_name: member.full_name,
        phone: member.phone,
        registration_token: registrationToken,
        temp_password: tempPassword,
        expires_at: expiryDate.toISOString()
      },
      message: 'تم إنشاء رمز تسجيل جديد بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء رمز تسجيل جديد'
    });
  }
};