import { query, getClient } from '../services/database.js';
import bcrypt from 'bcryptjs';
import { log } from '../utils/logger.js';

// Helper function to convert Gregorian date to Hijri
function convertToHijri(gregorianDate) {
  try {
    if (!gregorianDate) {return null;}

    const date = new Date(gregorianDate);
    const hijriDate = date.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return hijriDate;
  } catch (error) {
    log.error('Error converting to Hijri', { error: error.message });
    return null;
  }
}

// Helper function to validate National ID
function validateNationalId(nationalId) {
  if (!nationalId) {return false;}

  // Saudi National ID validation (10 digits, starts with 1 or 2)
  const cleanId = nationalId.toString().replace(/\D/g, '');

  if (cleanId.length !== 10) {return false;}
  if (!cleanId.startsWith('1') && !cleanId.startsWith('2')) {return false;}

  // Luhn algorithm validation for Saudi National ID
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleanId[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {digit = digit - 9;}
    }
    sum += digit;
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return checkDigit === parseInt(cleanId[9]);
}

// Helper function to validate email
function validateEmail(email) {
  if (!email) {return true;} // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate profile image URL
function validateImageUrl(url) {
  if (!url) {return true;} // Image is optional
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
    const tokenResult = await query(
      `SELECT mrt.*,
              m.id as member_id, m.full_name, m.phone, m.whatsapp_number,
              m.membership_number, m.profile_completed
       FROM member_registration_tokens mrt
       INNER JOIN members m ON mrt.member_id = m.id
       WHERE mrt.token = $1 AND mrt.is_used = false`,
      [token.toUpperCase()]
    );

    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });
    }

    const tokenData = tokenResult.rows[0];

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
    if (tokenData.profile_completed) {
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
          id: tokenData.member_id,
          full_name: tokenData.full_name,
          phone: tokenData.phone,
          whatsapp_number: tokenData.whatsapp_number,
          membership_number: tokenData.membership_number
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
    const tokenResult = await query(
      `SELECT mrt.*,
              m.id as member_id, m.temp_password, m.profile_completed
       FROM member_registration_tokens mrt
       INNER JOIN members m ON mrt.member_id = m.id
       WHERE mrt.token = $1 AND mrt.is_used = false`,
      [token.toUpperCase()]
    );

    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });
    }

    const tokenData = tokenResult.rows[0];

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
    if (tokenData.profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });
    }

    // Verify temporary password
    const passwordMatch = await bcrypt.compare(temp_password, tokenData.temp_password);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور المؤقتة غير صحيحة'
      });
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmailResult = await query(
        'SELECT id FROM members WHERE email = $1 AND id != $2',
        [email, tokenData.member_id]
      );

      if (existingEmailResult.rows && existingEmailResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'البريد الإلكتروني موجود مسبقاً'
        });
      }
    }

    // Convert birth date to Hijri
    const hijriBirthDate = convertToHijri(birth_date);

    // Update member profile
    const updatedMemberResult = await query(
      `UPDATE members
       SET date_of_birth = $1,
           date_of_birth_hijri = $2,
           employer = $3,
           email = $4,
           social_security_beneficiary = $5,
           profile_image_url = $6,
           profile_completed = $7,
           temp_password = $8,
           additional_info = $9,
           updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        birth_date,
        hijriBirthDate,
        employer || null,
        email || null,
        social_security_beneficiary === true || social_security_beneficiary === 'true',
        profile_image_url || null,
        true,
        null, // Clear temporary password
        JSON.stringify({
          national_id,
          national_id_document_url,
          national_id_verified: false,
          document_upload_date: new Date().toISOString()
        }),
        new Date().toISOString(),
        tokenData.member_id
      ]
    );

    const updatedMember = updatedMemberResult.rows[0];

    // Mark token as used
    await query(
      `UPDATE member_registration_tokens
       SET is_used = $1, used_at = $2
       WHERE id = $3`,
      [true, new Date().toISOString(), tokenData.id]
    );

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
    const memberResult = await query(
      'SELECT id, full_name, phone, profile_completed FROM members WHERE id = $1',
      [memberId]
    );

    if (!memberResult.rows || memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    const member = memberResult.rows[0];

    if (member.profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });
    }

    // Deactivate old tokens
    await query(
      `UPDATE member_registration_tokens
       SET is_used = true
       WHERE member_id = $1 AND is_used = false`,
      [memberId]
    );

    // Generate new token
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let registrationToken;
    let tokenExists = true;

    while (tokenExists) {
      registrationToken = '';
      for (let i = 0; i < 8; i++) {
        registrationToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existingTokenResult = await query(
        'SELECT id FROM member_registration_tokens WHERE token = $1',
        [registrationToken]
      );

      tokenExists = existingTokenResult.rows && existingTokenResult.rows.length > 0;
    }

    // Get temporary password from most recent token
    const recentTokenResult = await query(
      `SELECT temp_password FROM member_registration_tokens
       WHERE member_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [memberId]
    );

    const tempPassword = recentTokenResult.rows && recentTokenResult.rows.length > 0
      ? recentTokenResult.rows[0].temp_password
      : '123456';

    // Create new token record
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await query(
      `INSERT INTO member_registration_tokens (
        member_id, token, temp_password, expires_at, is_used
      ) VALUES ($1, $2, $3, $4, $5)`,
      [memberId, registrationToken, tempPassword, expiryDate.toISOString(), false]
    );

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
