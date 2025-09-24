# نظام إضافة وإدارة الأعضاء المتكامل
# Complete Member Management System - Arabic Names & Progressive Registration

## 🎯 متطلبات النظام (System Requirements)

### المرحلة الأولى: إضافة من قبل الأدمن
1. الأدمن يضيف الاسم الثلاثي/الرباعي بالعربية
2. النظام ينشئ كلمة مرور مؤقتة بسيطة
3. العضو يحصل على بيانات الدخول المؤقتة

### المرحلة الثانية: إكمال البيانات من العضو  
1. العضو يدخل بالبيانات المؤقتة
2. يكمل بياناته الشخصية
3. ينشئ كلمة مرور جديدة أو يفعل Face ID

---

## 📋 Implementation - Members Controller

### File: `controllers/membersController.js`

```javascript
const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');
const { generateTempPassword, generateMembershipNumber } = require('../utils/memberUtils');

class MembersController {
  // قائمة الأعضاء - Get Members List
  async getMembers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = '', 
        status = '',
        sortBy = 'created_at',
        sortOrder = 'desc' 
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('members')
        .select('id, full_name, email, phone, role, status, membership_number, created_at, profile_completed', 
                { count: 'exact' });

      // البحث بالاسم أو الإيميل أو الهاتف
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,membership_number.ilike.%${search}%`
        );
      }

      if (role) query = query.eq('role', role);
      if (status) query = query.eq('status', status);
      else query = query.neq('status', 'deleted');

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: members, error, count } = await query;

      if (error) {
        logger.error('خطأ في استرجاع الأعضاء:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع بيانات الأعضاء',
          error: error.message
        });
      }

      // تنسيق البيانات مع معلومات إضافية
      const formattedMembers = members.map(member => ({
        ...member,
        name: member.full_name,
        hijri_created_at: formatHijriDate(new Date(member.created_at)),
        needs_profile_completion: member.status === 'pending_profile_completion',
        registration_status: this.getRegistrationStatus(member)
      }));

      res.json({
        success: true,
        message: `تم العثور على ${count} عضو`,
        data: {
          members: formattedMembers,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في استرجاع الأعضاء:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // إضافة عضو جديد من قبل الأدمن - Admin adds new member
  async addMemberByAdmin(req, res) {
    try {
      const { 
        full_name,           // الاسم الثلاثي أو الرباعي
        phone,              // رقم الهاتف (اختياري في البداية)
        email,              // الإيميل (اختياري في البداية)
        role = 'member',    // الدور الافتراضي
        notes = ''          // ملاحظات إدارية
      } = req.body;

      // التحقق من صلاحيات الأدمن
      if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لإضافة أعضاء جدد',
          messageEn: 'Insufficient permissions to add members'
        });
      }

      // التحقق من صحة الاسم العربي
      if (!this.validateArabicName(full_name)) {
        return res.status(400).json({
          success: false,
          message: 'يجب أن يكون الاسم ثلاثياً أو رباعياً بالعربية',
          messageEn: 'Name must be 3-4 parts in Arabic'
        });
      }

      // توليد كلمة مرور مؤقتة بسيطة
      const tempPassword = generateTempPassword();
      const hashedTempPassword = await bcrypt.hash(tempPassword, 12);
      
      // توليد رقم عضوية
      const membershipNumber = generateMembershipNumber();

      // إنشاء العضو في قاعدة البيانات
      const { data: newMember, error } = await supabase
        .from('members')
        .insert([{
          full_name: full_name.trim(),
          email: email || null,
          phone: phone || null,
          password: hashedTempPassword,
          temp_password: tempPassword, // حفظ كلمة المرور المؤقتة للعرض
          role,
          status: 'pending_profile_completion', // في انتظار إكمال البيانات
          membership_number: membershipNumber,
          profile_completed: false,
          created_by: req.user.id,
          admin_notes: notes,
          created_at: new Date().toISOString(),
          hijri_created_at: formatHijriDate(new Date())
        }])
        .select('id, full_name, membership_number, temp_password, status')
        .single();

      if (error) {
        logger.error('خطأ في إضافة العضو:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في إضافة العضو الجديد',
          error: error.message
        });
      }

      // تسجيل العملية
      logger.info(`تم إضافة عضو جديد: ${newMember.full_name} بواسطة ${req.user.full_name}`);

      // إرسال بيانات الدخول المؤقتة
      res.status(201).json({
        success: true,
        message: `تم إضافة العضو ${newMember.full_name} بنجاح`,
        messageEn: `Member ${newMember.full_name} added successfully`,
        data: {
          member_id: newMember.id,
          full_name: newMember.full_name,
          membership_number: newMember.membership_number,
          temp_credentials: {
            username: newMember.membership_number, // يستخدم رقم العضوية للدخول
            temp_password: newMember.temp_password,
            instructions: 'يرجى إعطاء هذه البيانات للعضو لإكمال التسجيل'
          },
          status: 'pending_profile_completion',
          next_step: 'العضو يجب أن يدخل لإكمال بياناته'
        }
      });

    } catch (error) {
      logger.error('خطأ في إضافة العضو:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // دخول العضو بالبيانات المؤقتة - Member login with temp credentials
  async memberTempLogin(req, res) {
    try {
      const { username, temp_password } = req.body; // username = membership_number

      // البحث عن العضو برقم العضوية
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('membership_number', username)
        .eq('status', 'pending_profile_completion')
        .single();

      if (error || !member) {
        return res.status(401).json({
          success: false,
          message: 'بيانات الدخول غير صحيحة أو انتهت صلاحيتها',
          messageEn: 'Invalid or expired temporary credentials'
        });
      }

      // التحقق من كلمة المرور المؤقتة
      const isValidTempPassword = await bcrypt.compare(temp_password, member.password);
      
      if (!isValidTempPassword) {
        return res.status(401).json({
          success: false,
          message: 'كلمة المرور المؤقتة غير صحيحة',
          messageEn: 'Invalid temporary password'
        });
      }

      // إنشاء JWT مؤقت لإكمال التسجيل
      const jwt = require('jsonwebtoken');
      const tempToken = jwt.sign(
        { 
          userId: member.id, 
          membership_number: member.membership_number,
          temp_access: true,
          purpose: 'profile_completion'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // صالح لمدة 24 ساعة لإكمال التسجيل
      );

      res.json({
        success: true,
        message: `أهلاً وسهلاً ${member.full_name}، يرجى إكمال بياناتك`,
        messageEn: `Welcome ${member.full_name}, please complete your profile`,
        data: {
          temp_token: tempToken,
          member: {
            id: member.id,
            full_name: member.full_name,
            membership_number: member.membership_number,
            profile_completed: false
          },
          required_steps: [
            'إضافة رقم الهاتف',
            'إضافة البريد الإلكتروني', 
            'تعيين كلمة مرور جديدة',
            'إضافة البيانات الشخصية الأخرى'
          ]
        }
      });

    } catch (error) {
      logger.error('خطأ في الدخول المؤقت:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // إكمال البيانات الشخصية - Complete member profile
  async completeProfile(req, res) {
    try {
      const {
        phone,
        email,
        birth_date,
        hijri_birth_date,
        address,
        emergency_contact,
        new_password,
        face_id_enabled = false,
        additional_info = {}
      } = req.body;

      // التحقق من الرمز المؤقت
      if (!req.user.temp_access) {
        return res.status(403).json({
          success: false,
          message: 'رمز الوصول غير صالح لهذه العملية',
          messageEn: 'Invalid access token for this operation'
        });
      }

      const memberId = req.user.userId;

      // التحقق من عدم استخدام الهاتف أو الإيميل من قبل
      if (phone || email) {
        const { data: existingMember } = await supabase
          .from('members')
          .select('id')
          .neq('id', memberId)
          .or(phone ? `phone.eq.${phone}` : email ? `email.eq.${email}` : 'false.eq.true')
          .single();

        if (existingMember) {
          return res.status(400).json({
            success: false,
            message: phone ? 'رقم الهاتف مستخدم من قبل عضو آخر' : 'البريد الإلكتروني مستخدم من قبل عضو آخر',
            messageEn: phone ? 'Phone number already in use' : 'Email already in use'
          });
        }
      }

      // تشفير كلمة المرور الجديدة
      let hashedNewPassword = null;
      if (new_password) {
        hashedNewPassword = await bcrypt.hash(new_password, 12);
      }

      // تحضير البيانات للتحديث
      const updateData = {
        phone: phone || null,
        email: email || null,
        birth_date: birth_date || null,
        hijri_birth_date: hijri_birth_date || formatHijriDate(new Date(birth_date)),
        address: address || null,
        emergency_contact: emergency_contact || null,
        profile_completed: true,
        status: 'active', // تفعيل العضوية
        face_id_enabled: face_id_enabled,
        additional_info: additional_info,
        profile_completed_at: new Date().toISOString(),
        hijri_profile_completed_at: formatHijriDate(new Date()),
        temp_password: null, // حذف كلمة المرور المؤقتة
        updated_at: new Date().toISOString()
      };

      // إضافة كلمة المرور الجديدة إذا تم توفيرها
      if (hashedNewPassword) {
        updateData.password = hashedNewPassword;
      }

      // تحديث بيانات العضو
      const { data: updatedMember, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)
        .select('id, full_name, email, phone, role, status, membership_number, profile_completed')
        .single();

      if (error) {
        logger.error('خطأ في إكمال البيانات:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في حفظ البيانات',
          error: error.message
        });
      }

      // إنشاء JWT نهائي للعضو
      const jwt = require('jsonwebtoken');
      const finalToken = jwt.sign(
        { 
          userId: updatedMember.id, 
          email: updatedMember.email, 
          role: updatedMember.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      const refreshToken = jwt.sign(
        { userId: updatedMember.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );

      // حفظ refresh token
      await supabase
        .from('refresh_tokens')
        .insert([{
          user_id: updatedMember.id,
          token: refreshToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }]);

      logger.info(`تم إكمال تسجيل العضو: ${updatedMember.full_name}`);

      res.json({
        success: true,
        message: `مرحباً ${updatedMember.full_name}، تم إكمال تسجيلك بنجاح!`,
        messageEn: `Welcome ${updatedMember.full_name}, your registration is complete!`,
        data: {
          user: {
            id: updatedMember.id,
            full_name: updatedMember.full_name,
            name: updatedMember.full_name,
            email: updatedMember.email,
            phone: updatedMember.phone,
            role: updatedMember.role,
            membership_number: updatedMember.membership_number
          },
          token: finalToken,
          refreshToken: refreshToken,
          profile_completed: true,
          face_id_enabled: face_id_enabled
        }
      });

    } catch (error) {
      logger.error('خطأ في إكمال البيانات:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // تحديث بيانات عضو موجود - Update existing member
  async updateMember(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // التحقق من وجود العضو
      const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingMember) {
        return res.status(404).json({
          success: false,
          message: 'العضو غير موجود',
          messageEn: 'Member not found'
        });
      }

      // التحقق من الصلاحيات
      const canUpdate = ['super_admin', 'admin'].includes(req.user.role) || 
                       req.user.userId === id;

      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لتحديث هذا العضو',
          messageEn: 'Insufficient permissions'
        });
      }

      // منع تحديث حقول حساسة
      const restrictedFields = ['password', 'temp_password', 'created_by', 'membership_number'];
      restrictedFields.forEach(field => delete updateData[field]);

      // تحديث العضو
      const { data: updatedMember, error } = await supabase
        .from('members')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'خطأ في تحديث البيانات',
          error: error.message
        });
      }

      // إزالة الحقول الحساسة من الاستجابة
      const { password, temp_password, ...memberData } = updatedMember;

      res.json({
        success: true,
        message: `تم تحديث بيانات ${updatedMember.full_name} بنجاح`,
        data: {
          ...memberData,
          name: updatedMember.full_name
        }
      });

    } catch (error) {
      logger.error('خطأ في تحديث العضو:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // حذف عضو (حذف منطقي) - Soft delete member
  async deleteMember(req, res) {
    try {
      const { id } = req.params;

      if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لحذف الأعضاء',
          messageEn: 'Insufficient permissions'
        });
      }

      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('full_name, status')
        .eq('id', id)
        .single();

      if (fetchError || !member) {
        return res.status(404).json({
          success: false,
          message: 'العضو غير موجود',
          messageEn: 'Member not found'
        });
      }

      if (member.status === 'deleted') {
        return res.status(400).json({
          success: false,
          message: 'العضو محذوف مسبقاً',
          messageEn: 'Member already deleted'
        });
      }

      // حذف منطقي
      const { error } = await supabase
        .from('members')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: req.user.userId
        })
        .eq('id', id);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'خطأ في حذف العضو',
          error: error.message
        });
      }

      res.json({
        success: true,
        message: `تم حذف العضو ${member.full_name} بنجاح`,
        messageEn: `Member ${member.full_name} deleted successfully`
      });

    } catch (error) {
      logger.error('خطأ في حذف العضو:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      });
    }
  }

  // دالة مساعدة للتحقق من صحة الاسم العربي
  validateArabicName(name) {
    if (!name || typeof name !== 'string') return false;
    
    const trimmedName = name.trim();
    const nameParts = trimmedName.split(/\s+/);
    
    // يجب أن يكون الاسم من 3 إلى 4 أجزاء
    if (nameParts.length < 3 || nameParts.length > 4) return false;
    
    // التحقق من وجود أحرف عربية
    const arabicRegex = /[\u0600-\u06FF]/;
    return nameParts.every(part => arabicRegex.test(part) && part.length > 1);
  }

  // تحديد حالة التسجيل
  getRegistrationStatus(member) {
    if (member.status === 'pending_profile_completion') {
      return {
        status: 'incomplete',
        message: 'في انتظار إكمال البيانات',
        messageEn: 'Awaiting profile completion'
      };
    }
    if (member.profile_completed) {
      return {
        status: 'complete',
        message: 'مكتمل',
        messageEn: 'Complete'
      };
    }
    return {
      status: 'active',
      message: 'نشط',
      messageEn: 'Active'
    };
  }
}

module.exports = new MembersController();
```

---

## 🔧 Utility Functions

### File: `utils/memberUtils.js`

```javascript
// توليد كلمة مرور مؤقتة بسيطة
function generateTempPassword() {
  const numbers = Math.floor(Math.random() * 9000) + 1000; // 4 أرقام
  const letters = Math.random().toString(36).substring(2, 4).toUpperCase(); // حرفين
  return `${numbers}${letters}`; // مثال: 1234AB
}

// توليد رقم عضوية
function generateMembershipNumber() {
  const timestamp = Date.now().toString().slice(-6); // آخر 6 أرقام من الوقت
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `SH${timestamp}${random}`; // مثال: SH123456
}

// التحقق من قوة كلمة المرور
function validatePasswordStrength(password) {
  if (!password || password.length < 8) return false;
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  
  return hasUpper && hasLower && hasNumber && hasSpecial;
}

// تنسيق الاسم العربي
function formatArabicName(name) {
  return name.trim()
    .split(/\s+/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(' ');
}

module.exports = {
  generateTempPassword,
  generateMembershipNumber,
  validatePasswordStrength,
  formatArabicName
};
```

---

## 🛣️ Routes Configuration

### File: `routes/members.js`

```javascript
const express = require('express');
const { body, param, query } = require('express-validator');
const membersController = require('../controllers/membersController');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();

// قائمة الأعضاء (تتطلب تسجيل دخول)
router.get('/', authenticateToken, membersController.getMembers);

// إضافة عضو جديد من قبل الأدمن
router.post('/admin-add', [
  authenticateToken,
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  body('full_name')
    .notEmpty().withMessage('الاسم الكامل مطلوب')
    .isLength({ min: 6, max: 100 }).withMessage('الاسم يجب أن يكون بين 6 و 100 حرف')
    .matches(/[\u0600-\u06FF]/).withMessage('يجب أن يحتوي الاسم على أحرف عربية'),
  body('phone').optional().matches(/^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(Object.values(ROLES)),
  validateRequest
], membersController.addMemberByAdmin);

// دخول العضو بالبيانات المؤقتة
router.post('/temp-login', [
  body('username')
    .notEmpty().withMessage('رقم العضوية مطلوب')
    .matches(/^SH\d+$/).withMessage('صيغة رقم العضوية غير صحيحة'),
  body('temp_password')
    .notEmpty().withMessage('كلمة المرور المؤقتة مطلوبة'),
  validateRequest
], membersController.memberTempLogin);

// إكمال البيانات الشخصية
router.post('/complete-profile', [
  authenticateToken,
  body('phone')
    .matches(/^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/)
    .withMessage('رقم الجوال غير صحيح'),
  body('email')
    .isEmail().withMessage('صيغة البريد الإلكتروني غير صحيحة')
    .normalizeEmail(),
  body('new_password')
    .optional()
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص'),
  body('birth_date').optional().isISO8601(),
  validateRequest
], membersController.completeProfile);

// تحديث عضو موجود
router.put('/:id', [
  authenticateToken,
  param('id').isUUID(),
  validateRequest
], membersController.updateMember);

// حذف عضو
router.delete('/:id', [
  authenticateToken,
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  param('id').isUUID(),
  validateRequest
], membersController.deleteMember);

module.exports = router;
```

---

## 🗄️ Database Schema Updates

Add these columns to your `members` table:

```sql
-- إضافة الحقول المطلوبة للنظام الجديد
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(20),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hijri_profile_completed_at VARCHAR(100),
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS face_id_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_info JSONB,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES members(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES members(id);

-- إنشاء فهرس لرقم العضوية
CREATE INDEX IF NOT EXISTS idx_membership_number ON members(membership_number);
```

---

## 🧪 Testing the System

### 1. Admin adds new member:
```bash
POST /api/members/admin-add
Authorization: Bearer admin_jwt_token
{
  "full_name": "محمد أحمد علي الشعيل",
  "phone": "0551234567",
  "role": "member",
  "notes": "عضو جديد - عائلة الشعيل"
}
```

### 2. Member logs in with temp credentials:
```bash
POST /api/members/temp-login
{
  "username": "SH123456",  // membership number from step 1
  "temp_password": "1234AB"  // temp password from step 1
}
```

### 3. Member completes profile:
```bash
POST /api/members/complete-profile
Authorization: Bearer temp_jwt_token
{
  "phone": "0551234567",
  "email": "mohammed@alshuail.com",
  "birth_date": "1990-05-15",
  "address": "الكويت، حولي",
  "emergency_contact": "0559876543",
  "new_password": "MyNewPassword123!",
  "face_id_enabled": true
}
```

## ✅ النظام الآن يدعم:

1. **إضافة الأعضاء من الأدمن** - بالاسم الثلاثي/الرباعي
2. **كلمات مرور مؤقتة** - بسيطة وآمنة
3. **إكمال البيانات** - من العضو نفسه
4. **Face ID** - كخيار للمصادقة
5. **حالات متعددة** - pending, active, completed
6. **أرقام عضوية** - فريدة لكل عضو
7. **التحقق من الأسماء العربية** - ثلاثي أو رباعي
8. **نظام صلاحيات** - حسب الدور

هذا النظام يوفر تجربة مستخدم سلسة ومرونة في إدارة الأعضاء! 🎉
