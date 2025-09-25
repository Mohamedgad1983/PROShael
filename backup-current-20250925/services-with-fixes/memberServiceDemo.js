/**
 * Demo file showing how to use the Member Service
 * أمثلة على كيفية استخدام خدمة الأعضاء
 */

import { memberService } from './memberService';

// Example usage for Admin functions
export const adminExamples = {
  // Import members from Excel file
  async importMembers(excelFile) {
    try {
      const result = await memberService.importMembersFromExcel(excelFile);
      console.log('Import result:', result);
      /*
      Expected response:
      {
        success: true,
        successCount: 25,
        failedCount: 3,
        message: "تم استيراد 25 عضو بنجاح",
        errors: [
          { row: 4, message: "رقم الهاتف مكرر" },
          { row: 7, message: "رقم العضوية غير صحيح" }
        ]
      }
      */
      return result;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },

  // Get members list with filters
  async getMembers(filters = {}, page = 1, limit = 10) {
    try {
      const result = await memberService.getMembersList(filters, page, limit);
      console.log('Members list:', result);
      /*
      Expected response:
      {
        members: [
          {
            id: "1",
            full_name_arabic: "أحمد محمد الشعيل",
            phone: "966501234567",
            whatsapp: "966501234567",
            membership_number: "10001",
            profile_completed: true,
            status: "active",
            social_security_beneficiary: false,
            created_at: "2024-09-17T10:00:00Z"
          }
        ],
        total: 45,
        totalPages: 5,
        currentPage: 1
      }
      */
      return result;
    } catch (error) {
      console.error('Failed to get members:', error);
      throw error;
    }
  },

  // Get member statistics
  async getStatistics() {
    try {
      const stats = await memberService.getMemberStatistics();
      console.log('Member statistics:', stats);
      /*
      Expected response:
      {
        total: 45,
        active: 42,
        completed_profiles: 38,
        pending_registration: 7,
        social_security_beneficiaries: 12
      }
      */
      return stats;
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  },

  // Send registration reminders
  async sendReminders(memberIds = []) {
    try {
      const result = await memberService.sendRegistrationReminders(memberIds);
      console.log('Reminders sent:', result);
      /*
      Expected response:
      {
        sentCount: 7,
        failedCount: 0,
        message: "تم إرسال 7 رسائل تذكيرية بنجاح"
      }
      */
      return result;
    } catch (error) {
      console.error('Failed to send reminders:', error);
      throw error;
    }
  },

  // Export members to Excel
  async exportMembers(filters = {}) {
    try {
      const blob = await memberService.exportMembersToExcel(filters);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `الأعضاء_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Export completed successfully');
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
};

// Example usage for Public registration functions
export const publicExamples = {
  // Verify registration token
  async verifyToken(token) {
    try {
      const result = await memberService.verifyRegistrationToken(token);
      console.log('Token verified:', result);
      /*
      Expected response:
      {
        valid: true,
        member: {
          id: "1",
          full_name_arabic: "أحمد محمد الشعيل",
          phone: "966501234567",
          membership_number: "10001",
          profile_completed: false
        },
        expires_at: "2024-09-24T10:00:00Z"
      }
      */
      return result;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  // Complete member profile
  async completeProfile(token, profileData) {
    try {
      // Example profile data
      const exampleData = {
        national_id: '1234567890',
        birth_date: '1990-05-15',
        employer: 'شركة التقنية المتقدمة',
        email: 'ahmed@example.com',
        social_security_beneficiary: 'false',
        profile_photo: null // File object or null
      };

      const result = await memberService.completeProfile(token, profileData || exampleData);
      console.log('Profile completed:', result);
      /*
      Expected response:
      {
        success: true,
        member: {
          id: "1",
          full_name_arabic: "أحمد محمد الشعيل",
          profile_completed: true,
          profile_photo_url: "https://example.com/photos/1.jpg"
        },
        message: "تم إكمال ملفك الشخصي بنجاح"
      }
      */
      return result;
    } catch (error) {
      console.error('Profile completion failed:', error);
      throw error;
    }
  },

  // Upload profile photo separately
  async uploadPhoto(token, photoFile) {
    try {
      const result = await memberService.uploadProfilePhoto(token, photoFile);
      console.log('Photo uploaded:', result);
      /*
      Expected response:
      {
        success: true,
        photo_url: "https://example.com/photos/1.jpg",
        message: "تم رفع الصورة بنجاح"
      }
      */
      return result;
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw error;
    }
  }
};

// Example usage in React components
export const reactExamples = {
  // In a React component
  useInComponent: `
    import React, { useState, useEffect } from 'react';
    import { memberService } from '../services/memberService';

    const MembersList = () => {
      const [members, setMembers] = useState([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        loadMembers();
      }, []);

      const loadMembers = async () => {
        try {
          setLoading(true);
          const result = await memberService.getMembersList();
          setMembers(result.members);
        } catch (error) {
          console.error('Error loading members:', error);
        } finally {
          setLoading(false);
        }
      };

      const handleImport = async (file) => {
        try {
          const result = await memberService.importMembersFromExcel(file);
          alert(\`تم استيراد \${result.successCount} عضو بنجاح\`);
          loadMembers(); // Reload list
        } catch (error) {
          alert('حدث خطأ أثناء الاستيراد');
        }
      };

      if (loading) return <div>جاري التحميل...</div>;

      return (
        <div>
          <h2>قائمة الأعضاء</h2>
          {members.map(member => (
            <div key={member.id}>
              {member.full_name_arabic} - {member.membership_number}
            </div>
          ))}
        </div>
      );
    };
  `
};

// Error handling examples
export const errorHandling = {
  // Common error scenarios and how to handle them
  examples: {
    // Token expired
    tokenExpired: {
      error: { message: 'رمز التسجيل منتهي الصلاحية' },
      handling: 'Redirect user to request new token'
    },

    // File too large
    fileTooLarge: {
      error: { message: 'حجم الملف كبير جداً' },
      handling: 'Show file size limit and compression options'
    },

    // Network error
    networkError: {
      error: { message: 'خطأ في الشبكة' },
      handling: 'Show retry option and offline mode'
    },

    // Validation error
    validationError: {
      error: {
        message: 'بيانات غير صحيحة',
        details: { national_id: 'رقم الهوية غير صحيح' }
      },
      handling: 'Highlight specific field errors'
    }
  },

  // Generic error handler
  handleError: (error, context = 'عملية') => {
    console.error(`Error in ${context}:`, error);

    if (error.message.includes('token')) {
      return 'رمز التسجيل غير صحيح أو منتهي الصلاحية';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى';
    } else if (error.message.includes('file') || error.message.includes('size')) {
      return 'خطأ في الملف. يرجى التأكد من نوع وحجم الملف';
    } else {
      return error.message || `حدث خطأ أثناء ${context}`;
    }
  }
};

export default {
  adminExamples,
  publicExamples,
  reactExamples,
  errorHandling
};