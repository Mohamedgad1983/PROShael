# Al-Shuail Members Management System - Complete Implementation Guide

## Current Implementation Status

**Status**: Members system is **NOT FULLY IMPLEMENTED** in the current Al-Shuail project.

Based on documentation review:
- ✅ **Database Schema**: Members table exists with proper structure
- ✅ **Storage Buckets**: member-photos and member-documents buckets configured
- ❌ **Member Registration System**: Not implemented
- ❌ **Excel Import Functionality**: Not implemented
- ❌ **Progressive Profile Completion**: Not implemented
- ❌ **Social Security Question**: Not added to schema

---

## Implementation Requirements

### 1. Excel Import Data Structure
You mentioned you'll provide an Excel file with:
- **Full Name (Arabic)**: الاسم الكامل بالعربي
- **Phone Number**: رقم الهاتف
- **WhatsApp Number**: رقم الواتساب
- **Membership Numbers**: Starting from 10001 to infinity

### 2. Member Profile Completion Fields
Members will complete their profiles with:
- **Full Name**: الاسم الكامل (pre-filled from Excel)
- **National ID**: رقم الهوية
- **Date of Birth**: تاريخ الميلاد
- **Employer**: جهة العمل
- **WhatsApp Number**: رقم الواتساب (pre-filled)
- **Email**: البريد الإلكتروني
- **Personal Photo**: الصورة الشخصية (camera capture)
- **Social Security Beneficiary**: هل أنت مستفيد من الضمان الاجتماعي؟ (Yes/No)

---

## Database Schema Status

Database schema updates have been completed. The following fields are now available:
- `social_security_beneficiary` - Boolean field for social security question
- `employer` - Employer/workplace information
- `whatsapp_number` - WhatsApp contact number
- `profile_completed` - Profile completion status
- Excel import tracking tables - For batch import management
- Registration tokens table - For secure member onboarding

---

## Backend API Implementation

### 1. Excel Import Controller
```javascript
// controllers/memberImportController.js
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class MemberImportController {
    // Upload and process Excel file
    async importMembersFromExcel(req, res) {
        try {
            // 1. Parse Excel file
            const workbook = XLSX.readFile(req.file.path);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(worksheet);
            
            // 2. Create import batch record
            const batchId = uuidv4();
            const batch = await supabase
                .from('excel_import_batches')
                .insert({
                    id: batchId,
                    batch_name: `Import_${new Date().toISOString().split('T')[0]}`,
                    file_name: req.file.filename,
                    total_records: data.length,
                    imported_by: req.user.id
                })
                .single();
            
            // 3. Process each record
            let successful = 0;
            let failed = 0;
            const errors = [];
            
            for (const row of data) {
                try {
                    // Generate temporary password
                    const tempPassword = this.generateTempPassword();
                    const hashedPassword = await bcrypt.hash(tempPassword, 10);
                    
                    // Create member record
                    const member = await supabase
                        .from('members')
                        .insert({
                            full_name: row['Full Name Arabic'] || row['الاسم الكامل'],
                            membership_number: row['Membership Number'] || row['رقم العضوية'],
                            phone: row['Phone'] || row['رقم الهاتف'],
                            whatsapp_number: row['WhatsApp'] || row['رقم الواتساب'],
                            temp_password: hashedPassword,
                            excel_import_batch: batchId,
                            status: 'pending_completion'
                        })
                        .single();
                    
                    // Generate registration token
                    await this.generateRegistrationToken(
                        member.id,
                        row['Phone'],
                        row['Membership Number']
                    );
                    
                    successful++;
                } catch (error) {
                    failed++;
                    errors.push({
                        row: row,
                        error: error.message
                    });
                }
            }
            
            // 4. Update batch status
            await supabase
                .from('excel_import_batches')
                .update({
                    successful_imports: successful,
                    failed_imports: failed,
                    import_status: 'completed',
                    error_log: errors,
                    completed_at: new Date()
                })
                .eq('id', batchId);
            
            res.json({
                success: true,
                batch_id: batchId,
                total: data.length,
                successful,
                failed,
                errors: errors.slice(0, 10) // Return first 10 errors
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Excel import failed',
                error: error.message
            });
        }
    }
    
    // Generate 6-digit temporary password
    generateTempPassword() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Generate registration token for member
    async generateRegistrationToken(memberId, phone, membershipNumber) {
        const token = uuidv4().split('-')[0]; // Short token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry
        
        await supabase
            .from('member_registration_tokens')
            .insert({
                member_id: memberId,
                token,
                phone_number: phone,
                membership_number: membershipNumber,
                expires_at: expiresAt
            });
        
        return token;
    }
    
    // Get import history
    async getImportHistory(req, res) {
        try {
            const { data: batches } = await supabase
                .from('excel_import_batches')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            res.json({
                success: true,
                data: batches
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch import history',
                error: error.message
            });
        }
    }
}

module.exports = new MemberImportController();
```

### 2. Member Registration Controller
```javascript
// controllers/memberRegistrationController.js
class MemberRegistrationController {
    // Verify registration token and get member data
    async verifyRegistrationToken(req, res) {
        try {
            const { token } = req.params;
            
            // Check token validity
            const { data: tokenData } = await supabase
                .from('member_registration_tokens')
                .select(`
                    *,
                    members:member_id (
                        id,
                        full_name,
                        membership_number,
                        phone,
                        whatsapp_number,
                        profile_completed
                    )
                `)
                .eq('token', token)
                .eq('is_used', false)
                .gte('expires_at', new Date().toISOString())
                .single();
            
            if (!tokenData) {
                return res.status(400).json({
                    success: false,
                    message: 'رمز التسجيل غير صحيح أو منتهي الصلاحية',
                    message_en: 'Invalid or expired registration token'
                });
            }
            
            res.json({
                success: true,
                data: {
                    member: tokenData.members,
                    token_valid: true
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'فشل في التحقق من رمز التسجيل',
                message_en: 'Token verification failed',
                error: error.message
            });
        }
    }
    
    // Complete member profile registration
    async completeProfile(req, res) {
        try {
            const { token } = req.params;
            const {
                national_id,
                birth_date,
                employer,
                email,
                social_security_beneficiary,
                profile_image_url
            } = req.body;
            
            // Validate required fields
            if (!national_id || !birth_date || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'يرجى ملء جميع الحقول المطلوبة',
                    message_en: 'Please fill all required fields'
                });
            }
            
            // Get token data
            const { data: tokenData } = await supabase
                .from('member_registration_tokens')
                .select('member_id')
                .eq('token', token)
                .eq('is_used', false)
                .single();
            
            if (!tokenData) {
                return res.status(400).json({
                    success: false,
                    message: 'رمز التسجيل غير صحيح'
                });
            }
            
            // Convert birth date to Hijri
            const hijriDate = this.convertToHijri(birth_date);
            
            // Update member profile
            const { data: member } = await supabase
                .from('members')
                .update({
                    national_id,
                    birth_date,
                    hijri_birth_date: hijriDate.hijri_string,
                    employer,
                    email,
                    social_security_beneficiary: social_security_beneficiary === 'yes',
                    profile_image_url,
                    profile_completed: true,
                    status: 'active',
                    updated_at: new Date()
                })
                .eq('id', tokenData.member_id)
                .select()
                .single();
            
            // Mark token as used
            await supabase
                .from('member_registration_tokens')
                .update({
                    is_used: true,
                    used_at: new Date()
                })
                .eq('token', token);
            
            // Create user account for login
            await this.createUserAccount(member);
            
            res.json({
                success: true,
                message: 'تم إكمال التسجيل بنجاح',
                message_en: 'Registration completed successfully',
                data: member
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'فشل في إكمال التسجيل',
                message_en: 'Registration completion failed',
                error: error.message
            });
        }
    }
    
    // Create user account after profile completion
    async createUserAccount(member) {
        const { data: user } = await supabase.auth.admin.createUser({
            email: member.email,
            phone: member.phone,
            password: member.temp_password, // They can change this later
            user_metadata: {
                full_name: member.full_name,
                membership_number: member.membership_number,
                role: 'member'
            }
        });
        
        // Link user to member record
        await supabase
            .from('members')
            .update({ user_id: user.id })
            .eq('id', member.id);
        
        return user;
    }
    
    // Convert Gregorian to Hijri date
    convertToHijri(gregorianDate) {
        // Implementation of Hijri conversion
        // This is a simplified version - use proper Hijri library in production
        const date = new Date(gregorianDate);
        try {
            const hijriFormatted = date.toLocaleDateString('ar-SA-u-ca-islamic', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            return {
                hijri_string: hijriFormatted + ' هـ',
                hijri_year: parseInt(date.toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric' })),
                hijri_month: parseInt(date.toLocaleDateString('ar-SA-u-ca-islamic', { month: 'numeric' })),
                hijri_day: parseInt(date.toLocaleDateString('ar-SA-u-ca-islamic', { day: 'numeric' }))
            };
        } catch (error) {
            return {
                hijri_string: 'تاريخ هجري غير صحيح',
                hijri_year: null,
                hijri_month: null,
                hijri_day: null
            };
        }
    }
}

module.exports = new MemberRegistrationController();
```

### 3. Member Management Controller
```javascript
// controllers/memberController.js
class MemberController {
    // Get all members with filtering
    async getAllMembers(req, res) {
        try {
            const {
                status = 'all',
                profile_completed = 'all',
                search = '',
                page = 1,
                limit = 50
            } = req.query;
            
            let query = supabase
                .from('members')
                .select(`
                    *,
                    families:family_id (
                        id,
                        name_ar,
                        name_en
                    )
                `)
                .order('created_at', { ascending: false });
            
            // Apply filters
            if (status !== 'all') {
                query = query.eq('status', status);
            }
            
            if (profile_completed !== 'all') {
                query = query.eq('profile_completed', profile_completed === 'true');
            }
            
            if (search) {
                query = query.or(`full_name.ilike.%${search}%,membership_number.ilike.%${search}%,phone.ilike.%${search}%`);
            }
            
            // Pagination
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);
            
            const { data: members, error } = await query;
            
            if (error) throw error;
            
            // Get total count for pagination
            const { count } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });
            
            res.json({
                success: true,
                data: members,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'فشل في جلب بيانات الأعضاء',
                error: error.message
            });
        }
    }
    
    // Get member statistics
    async getMemberStatistics(req, res) {
        try {
            // Total members
            const { count: totalMembers } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });
            
            // Active members
            const { count: activeMembers } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
            
            // Profile completed
            const { count: completedProfiles } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('profile_completed', true);
            
            // Pending registration
            const { count: pendingRegistration } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('profile_completed', false);
            
            // Social security beneficiaries
            const { count: socialSecurityBeneficiaries } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('social_security_beneficiary', true);
            
            // Recent registrations (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { count: recentRegistrations } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString());
            
            res.json({
                success: true,
                statistics: {
                    total_members: totalMembers,
                    active_members: activeMembers,
                    completed_profiles: completedProfiles,
                    pending_registration: pendingRegistration,
                    social_security_beneficiaries: socialSecurityBeneficiaries,
                    recent_registrations: recentRegistrations,
                    completion_rate: totalMembers > 0 ? Math.round((completedProfiles / totalMembers) * 100) : 0
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'فشل في جلب إحصائيات الأعضاء',
                error: error.message
            });
        }
    }
    
    // Send registration reminders
    async sendRegistrationReminders(req, res) {
        try {
            // Get members with incomplete profiles
            const { data: incompleteMembers } = await supabase
                .from('members')
                .select(`
                    *,
                    member_registration_tokens!inner (token)
                `)
                .eq('profile_completed', false)
                .eq('member_registration_tokens.is_used', false);
            
            // Send SMS reminders (placeholder - implement actual SMS service)
            const reminders = [];
            for (const member of incompleteMembers) {
                const registrationLink = `${process.env.FRONTEND_URL}/register/${member.member_registration_tokens[0].token}`;
                
                // Add to SMS queue or send immediately
                reminders.push({
                    phone: member.phone,
                    message: `مرحباً ${member.full_name}، يرجى إكمال تسجيلك في تطبيق آل الشعيل: ${registrationLink}`,
                    member_id: member.id
                });
            }
            
            res.json({
                success: true,
                message: `تم إرسال ${reminders.length} تذكير للأعضاء`,
                message_en: `Sent ${reminders.length} registration reminders`,
                reminders_sent: reminders.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'فشل في إرسال التذكيرات',
                error: error.message
            });
        }
    }
}

module.exports = new MemberController();
```

---

## Frontend Implementation

### 1. Excel Import Interface
```jsx
// components/admin/MemberImport.jsx
import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';

const MemberImport = () => {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    
    const handleFileUpload = async (event) => {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;
        
        setFile(selectedFile);
        setImporting(true);
        
        try {
            const formData = new FormData();
            formData.append('excel_file', selectedFile);
            
            const response = await fetch('/api/admin/members/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const result = await response.json();
            setImportResult(result);
            
            if (result.success) {
                // Refresh member list or show success
                alert(`تم استيراد ${result.successful} عضو بنجاح`);
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            alert('فشل في استيراد الملف');
        } finally {
            setImporting(false);
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-right">
                استيراد الأعضاء من Excel
            </h2>
            
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                    اسحب ملف Excel هنا أو انقر للاختيار
                </p>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700"
                >
                    اختيار ملف
                </label>
            </div>
            
            {/* Expected Format */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2 text-right">
                    تنسيق الملف المطلوب:
                </h3>
                <ul className="text-blue-700 text-sm space-y-1 text-right">
                    <li>• العمود الأول: الاسم الكامل بالعربي</li>
                    <li>• العمود الثاني: رقم الهاتف</li>
                    <li>• العمود الثالث: رقم الواتساب</li>
                    <li>• العمود الرابع: رقم العضوية (يبدأ من 10001)</li>
                </ul>
            </div>
            
            {/* Import Results */}
            {importResult && (
                <div className={`rounded-lg p-4 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h3 className="font-semibold mb-2 text-right">
                        نتائج الاستيراد:
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-right">
                            <span className="text-green-600">نجح: {importResult.successful}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-red-600">فشل: {importResult.failed}</span>
                        </div>
                    </div>
                    
                    {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-red-800 text-right">أخطاء:</h4>
                            <ul className="text-red-700 text-sm mt-2 space-y-1">
                                {importResult.errors.slice(0, 5).map((error, index) => (
                                    <li key={index} className="text-right">
                                        • {error.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            
            {/* Loading State */}
            {importing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-700">جاري استيراد البيانات...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberImport;
```

### 2. Member Registration Form (Mobile-Optimized)
```jsx
// components/MemberRegistration.jsx
import React, { useState, useEffect } from 'react';
import { Camera, User, Phone, Mail, Building, Calendar, CreditCard } from 'lucide-react';

const MemberRegistration = () => {
    const [token, setToken] = useState(null);
    const [member, setMember] = useState(null);
    const [formData, setFormData] = useState({
        national_id: '',
        birth_date: '',
        employer: '',
        email: '',
        social_security_beneficiary: '',
        profile_image_url: ''
    });
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        // Get token from URL
        const urlToken = window.location.pathname.split('/').pop();
        setToken(urlToken);
        
        // Verify token and get member data
        verifyToken(urlToken);
    }, []);
    
    const verifyToken = async (token) => {
        try {
            const response = await fetch(`/api/members/verify-token/${token}`);
            const result = await response.json();
            
            if (result.success) {
                setMember(result.data.member);
            } else {
                alert('رمز التسجيل غير صحيح أو منتهي الصلاحية');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
    };
    
    const handlePhotoCapture = async () => {
        try {
            // Camera capture implementation
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            
            // Create video element for preview
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            // You would implement a photo capture interface here
            // For now, we'll use file input as fallback
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        setPhoto(e.target.result);
                        setFormData(prev => ({
                            ...prev,
                            profile_image_url: e.target.result
                        }));
                    };
                    reader.readAsDataURL(file);
                }
            };
            
            input.click();
            
        } catch (error) {
            console.error('Camera access failed:', error);
            alert('فشل في الوصول للكاميرا');
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await fetch(`/api/members/complete-profile/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('تم إكمال التسجيل بنجاح! يمكنك الآن تسجيل الدخول');
                window.location.href = '/login';
            } else {
                alert(result.message || 'فشل في إكمال التسجيل');
            }
            
        } catch (error) {
            console.error('Registration failed:', error);
            alert('فشل في إكمال التسجيل');
        } finally {
            setLoading(false);
        }
    };
    
    if (!member) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-700">جاري التحقق من رمز التسجيل...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 py-8 px-4" dir="rtl">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-8">
                    <h1 className="text-3xl font-bold mb-2">مرحباً بك في آل الشعيل</h1>
                    <p className="text-blue-100">يرجى إكمال بياناتك الشخصية</p>
                </div>
                
                {/* Member Info Card */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">معلوماتك الأساسية</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">الاسم:</span>
                            <span className="font-semibold">{member.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">رقم العضوية:</span>
                            <span className="font-semibold text-blue-600">{member.membership_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">الهاتف:</span>
                            <span className="font-semibold">{member.phone}</span>
                        </div>
                    </div>
                </div>
                
                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">إكمال البيانات الشخصية</h3>
                    
                    {/* Profile Photo */}
                    <div className="mb-6 text-center">
                        <div className="relative inline-block">
                            {photo ? (
                                <img
                                    src={photo}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handlePhotoCapture}
                                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">اضغط لالتقاط صورة شخصية</p>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* National ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CreditCard className="w-4 h-4 inline ml-2" />
                                رقم الهوية *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.national_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, national_id: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                                placeholder="1234567890"
                            />
                        </div>
                        
                        {/* Birth Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline ml-2" />
                                تاريخ الميلاد *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.birth_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                            />
                        </div>
                        
                        {/* Employer */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Building className="w-4 h-4 inline ml-2" />
                                جهة العمل
                            </label>
                            <input
                                type="text"
                                value={formData.employer}
                                onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                                placeholder="اختياري"
                            />
                        </div>
                        
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Mail className="w-4 h-4 inline ml-2" />
                                البريد الإلكتروني *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                                placeholder="example@domain.com"
                            />
                        </div>
                        
                        {/* Social Security Beneficiary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                هل أنت مستفيد من الضمان الاجتماعي؟ *
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="social_security"
                                        value="yes"
                                        checked={formData.social_security_beneficiary === 'yes'}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            social_security_beneficiary: e.target.value 
                                        }))}
                                        className="ml-2"
                                        required
                                    />
                                    <span>نعم، أنا مستفيد من الضمان الاجتماعي</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="social_security"
                                        value="no"
                                        checked={formData.social_security_beneficiary === 'no'}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            social_security_beneficiary: e.target.value 
                                        }))}
                                        className="ml-2"
                                        required
                                    />
                                    <span>لا، لست مستفيداً من الضمان الاجتماعي</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-8 font-semibold text-lg"
                    >
                        {loading ? 'جاري الحفظ...' : 'إكمال التسجيل'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MemberRegistration;
```

---

## API Routes Setup

### 1. Express Routes Configuration
```javascript
// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const memberImportController = require('../controllers/memberImportController');
const memberRegistrationController = require('../controllers/memberRegistrationController');
const memberController = require('../controllers/memberController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Multer configuration for Excel uploads
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Admin routes (require authentication + admin role)
router.post('/admin/members/import', 
    authMiddleware, 
    adminMiddleware, 
    upload.single('excel_file'), 
    memberImportController.importMembersFromExcel
);

router.get('/admin/members/import-history', 
    authMiddleware, 
    adminMiddleware, 
    memberImportController.getImportHistory
);

router.get('/admin/members', 
    authMiddleware, 
    adminMiddleware, 
    memberController.getAllMembers
);

router.get('/admin/members/statistics', 
    authMiddleware, 
    adminMiddleware, 
    memberController.getMemberStatistics
);

router.post('/admin/members/send-reminders', 
    authMiddleware, 
    adminMiddleware, 
    memberController.sendRegistrationReminders
);

// Public registration routes
router.get('/members/verify-token/:token', memberRegistrationController.verifyRegistrationToken);
router.post('/members/complete-profile/:token', memberRegistrationController.completeProfile);

module.exports = router;
```

### 2. Middleware Setup
```javascript
// middleware/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
    // Check if user has admin role
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
            message_ar: 'غير مسموح. يتطلب صلاحيات المدير.'
        });
    }
    
    next();
};

module.exports = adminMiddleware;
```

---

## Implementation Checklist

### Database Setup
- [ ] Update members table with new columns
- [ ] Create excel_import_batches table
- [ ] Create member_registration_tokens table
- [ ] Add proper indexes for performance

### Backend Implementation
- [ ] Excel import controller with validation
- [ ] Member registration controller
- [ ] SMS integration for reminders
- [ ] Photo upload to member-photos bucket
- [ ] Hijri date conversion utility

### Frontend Implementation
- [ ] Admin Excel import interface
- [ ] Member registration form (mobile-optimized)
- [ ] Camera integration for profile photos
- [ ] Member management dashboard
- [ ] Registration status tracking

### Integration Points
- [ ] Connect with existing Activities system
- [ ] Link with Subscription system (50 SAR + multiples)
- [ ] Integrate with notification system
- [ ] Connect with storage buckets

### Testing & Validation
- [ ] Excel import with sample data
- [ ] Member registration flow
- [ ] Photo upload functionality
- [ ] Social security question handling
- [ ] Arabic name validation
- [ ] SMS reminder system

---

## Next Steps

1. **Provide Excel File**: Share the Excel file with member data
2. **Database Migration**: Run the SQL updates to add missing columns
3. **Backend Development**: Implement the controllers and routes
4. **Frontend Development**: Create the member registration interface
5. **SMS Integration**: Setup SMS service for registration reminders
6. **Testing**: Test the complete flow from Excel import to member registration

This comprehensive implementation will handle the complete member management lifecycle from Excel import to member self-registration with all required fields including the social security beneficiary question.
