# 06-FRONTEND-INTEGRATION.md
# Al-Shuail Frontend Integration - Claude Code Instructions

## 📋 OVERVIEW

Integrate the backend APIs with the existing frontend admin panel:
- Connect to registration APIs
- Implement approval workflow UI
- Integrate family tree visualization
- Add admin dashboard
- Handle authentication

**Prerequisites**: Files 01-05 completed, Frontend deployed on Cloudflare Pages

---

## 🎯 IMPLEMENTATION CHECKLIST

```
□ API service layer
□ Authentication integration
□ Member management UI
□ Approval workflow interface
□ Family tree visualization
□ Dashboard statistics
□ Error handling
```

---

## 📁 FILE STRUCTURE TO CREATE

```
frontend/
├── src/
│   ├── services/
│   │   ├── api.service.js          ← Create this (Base API)
│   │   ├── auth.service.js         ← Create this
│   │   ├── members.service.js      ← Create this
│   │   ├── approval.service.js     ← Create this
│   │   └── familytree.service.js   ← Create this
│   ├── components/
│   │   ├── MemberForm.js           ← Create this
│   │   ├── ApprovalQueue.js        ← Create this
│   │   ├── FamilyTreeView.js       ← Create this
│   │   └── Dashboard.js            ← Update this
│   └── utils/
│       ├── constants.js            ← Create this
│       └── validators.js           ← Create this
```

---

## STEP 1: API SERVICE LAYER

### File: `frontend/src/services/api.service.js`

```javascript
// Base API Service
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }

    // Extract error message
    const errorMessage = 
      error.response?.data?.message ||
      error.message ||
      'حدث خطأ غير متوقع';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// API methods
const apiService = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data, config = {}) => apiClient.post(url, data, config),
  put: (url, data, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
  patch: (url, data, config = {}) => apiClient.patch(url, data, config),
};

export default apiService;
```

**Command to create:**
```bash
mkdir -p frontend/src/services
cat > frontend/src/services/api.service.js << 'EOF'
[paste code above]
EOF
```

---

### File: `frontend/src/services/auth.service.js`

```javascript
// Authentication Service
import apiService from './api.service';

const authService = {
  /**
   * Admin login
   */
  async login(email, password) {
    try {
      const response = await apiService.post('/auth/login', {
        email,
        password
      });

      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        return response;
      }

      throw new Error('فشل تسجيل الدخول');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  /**
   * Check if user has role
   */
  hasRole(...roles) {
    const user = this.getCurrentUser();
    return user && roles.includes(user.role);
  },

  /**
   * Get auth token
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }
};

export default authService;
```

**Command to create:**
```bash
cat > frontend/src/services/auth.service.js << 'EOF'
[paste code above]
EOF
```

---

### File: `frontend/src/services/members.service.js`

```javascript
// Members Management Service
import apiService from './api.service';

const membersService = {
  /**
   * Add new member (Admin)
   */
  async addMember(memberData) {
    return await apiService.post('/admin/members', memberData);
  },

  /**
   * Get all members
   */
  async getAllMembers(filters = {}) {
    const params = new URLSearchParams(filters);
    return await apiService.get(`/members?${params}`);
  },

  /**
   * Get member by ID
   */
  async getMemberById(memberId) {
    return await apiService.get(`/members/${memberId}`);
  },

  /**
   * Update member
   */
  async updateMember(memberId, updates) {
    return await apiService.put(`/members/${memberId}`, updates);
  },

  /**
   * Update member subdivision
   */
  async updateSubdivision(memberId, subdivisionId) {
    return await apiService.put(`/admin/members/${memberId}/subdivision`, {
      family_branch_id: subdivisionId
    });
  },

  /**
   * Get subdivisions (فخوذ)
   */
  async getSubdivisions() {
    return await apiService.get('/admin/subdivisions');
  },

  /**
   * Delete member
   */
  async deleteMember(memberId) {
    return await apiService.delete(`/members/${memberId}`);
  },

  /**
   * Search members
   */
  async searchMembers(query) {
    return await apiService.get(`/members/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Export members to Excel
   */
  async exportToExcel(filters = {}) {
    const params = new URLSearchParams(filters);
    return await apiService.get(`/members/export?${params}`, {
      responseType: 'blob'
    });
  }
};

export default membersService;
```

**Command to create:**
```bash
cat > frontend/src/services/members.service.js << 'EOF'
[paste code above]
EOF
```

---

### File: `frontend/src/services/approval.service.js`

```javascript
// Approval Workflow Service
import apiService from './api.service';

const approvalService = {
  /**
   * Get pending approvals
   */
  async getPendingApprovals() {
    return await apiService.get('/approvals/pending');
  },

  /**
   * Get member for approval review
   */
  async getMemberForApproval(memberId) {
    return await apiService.get(`/approvals/${memberId}`);
  },

  /**
   * Approve member
   */
  async approveMember(memberId, notes = '') {
    return await apiService.post(`/approvals/${memberId}/approve`, { notes });
  },

  /**
   * Reject member
   */
  async rejectMember(memberId, reason) {
    return await apiService.post(`/approvals/${memberId}/reject`, { reason });
  },

  /**
   * Get approval statistics
   */
  async getApprovalStats() {
    return await apiService.get('/approvals/stats');
  }
};

export default approvalService;
```

**Command to create:**
```bash
cat > frontend/src/services/approval.service.js << 'EOF'
[paste code above]
EOF
```

---

### File: `frontend/src/services/familytree.service.js`

```javascript
// Family Tree Service
import apiService from './api.service';

const familyTreeService = {
  /**
   * Get full family tree
   */
  async getFullTree(subdivisionId = null) {
    const params = subdivisionId ? `?subdivision_id=${subdivisionId}` : '';
    return await apiService.get(`/family-tree${params}`);
  },

  /**
   * Get member relationships
   */
  async getMemberRelationships(memberId) {
    return await apiService.get(`/family-tree/${memberId}/relationships`);
  },

  /**
   * Add family relationship
   */
  async addRelationship(relationshipData) {
    return await apiService.post('/family-tree/relationships', relationshipData);
  },

  /**
   * Search tree
   */
  async searchTree(query, filters = {}) {
    const params = new URLSearchParams({ query, ...filters });
    return await apiService.get(`/family-tree/search?${params}`);
  },

  /**
   * Get tree statistics
   */
  async getTreeStats(subdivisionId = null) {
    const params = subdivisionId ? `?subdivision_id=${subdivisionId}` : '';
    return await apiService.get(`/family-tree/stats${params}`);
  }
};

export default familyTreeService;
```

**Command to create:**
```bash
cat > frontend/src/services/familytree.service.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 2: VALIDATORS & CONSTANTS

### File: `frontend/src/utils/validators.js`

```javascript
// Form Validators

/**
 * Validate Saudi phone number
 * Format: +966 5X XXX XXXX
 */
export const validateSaudiPhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  const saudiRegex = /^(\+966|966|0)?5[0-9]{8}$/;
  return saudiRegex.test(cleaned);
};

/**
 * Validate Kuwaiti phone number
 * Format: +965 XXXX XXXX
 */
export const validateKuwaitiPhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  const kuwaitiRegex = /^(\+965|965)?[569][0-9]{7}$/;
  return kuwaitiRegex.test(cleaned);
};

/**
 * Validate phone (Saudi or Kuwaiti)
 */
export const validatePhone = (phone) => {
  return validateSaudiPhone(phone) || validateKuwaitiPhone(phone);
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  
  // Saudi format
  if (cleaned.startsWith('966') || cleaned.startsWith('+966')) {
    const number = cleaned.replace(/^\+?966/, '');
    return `+966 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
  }
  
  // Kuwaiti format
  if (cleaned.startsWith('965') || cleaned.startsWith('+965')) {
    const number = cleaned.replace(/^\+?965/, '');
    return `+965 ${number.slice(0, 4)} ${number.slice(4)}`;
  }
  
  return phone;
};

/**
 * Validate Arabic name
 */
export const validateArabicName = (name) => {
  const arabicRegex = /^[\u0600-\u06FF\s]+$/;
  return arabicRegex.test(name) && name.trim().length >= 3;
};

/**
 * Validate email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate national ID (Saudi or Kuwaiti)
 */
export const validateNationalId = (id) => {
  // Saudi: 10 digits starting with 1 or 2
  // Kuwaiti: 12 digits
  const saudiRegex = /^[12]\d{9}$/;
  const kuwaitiRegex = /^\d{12}$/;
  return saudiRegex.test(id) || kuwaitiRegex.test(id);
};

export default {
  validateSaudiPhone,
  validateKuwaitiPhone,
  validatePhone,
  formatPhone,
  validateArabicName,
  validateEmail,
  validateNationalId
};
```

**Command to create:**
```bash
mkdir -p frontend/src/utils
cat > frontend/src/utils/validators.js << 'EOF'
[paste code above]
EOF
```

---

### File: `frontend/src/utils/constants.js`

```javascript
// Application Constants

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCIAL_MANAGER: 'financial_manager',
  FAMILY_TREE_MANAGER: 'family_tree_manager',
  VIEWER: 'viewer'
};

export const REGISTRATION_STATUS = {
  INCOMPLETE: 'incomplete',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const RELATIONSHIP_TYPES = {
  FATHER: 'father',
  MOTHER: 'mother',
  SON: 'son',
  DAUGHTER: 'daughter',
  SPOUSE: 'spouse',
  BROTHER: 'brother',
  SISTER: 'sister',
  GRANDFATHER: 'grandfather',
  GRANDMOTHER: 'grandmother'
};

export const RELATIONSHIP_LABELS_AR = {
  father: 'أب',
  mother: 'أم',
  son: 'ابن',
  daughter: 'ابنة',
  spouse: 'زوج/زوجة',
  brother: 'أخ',
  sister: 'أخت',
  grandfather: 'جد',
  grandmother: 'جدة'
};

export const STATUS_COLORS = {
  incomplete: '#FFA500',
  pending_approval: '#FFD700',
  approved: '#4CAF50',
  rejected: '#F44336'
};

export const STATUS_LABELS_AR = {
  incomplete: 'غير مكتمل',
  pending_approval: 'في انتظار الموافقة',
  approved: 'مُوافق عليه',
  rejected: 'مرفوض'
};

export const PHONE_PREFIXES = {
  SAUDI: '+966',
  KUWAIT: '+965'
};

export default {
  API_BASE_URL,
  ROLES,
  REGISTRATION_STATUS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_LABELS_AR,
  STATUS_COLORS,
  STATUS_LABELS_AR,
  PHONE_PREFIXES
};
```

**Command to create:**
```bash
cat > frontend/src/utils/constants.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 3: REACT COMPONENTS

### File: `frontend/src/components/MemberForm.js`

```javascript
// Add Member Form Component
import React, { useState, useEffect } from 'react';
import membersService from '../services/members.service';
import { validatePhone, formatPhone, validateArabicName } from '../utils/validators';
import { PHONE_PREFIXES } from '../utils/constants';

const MemberForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name_ar: '',
    full_name_en: '',
    phone: '',
    family_branch_id: ''
  });

  const [subdivisions, setSubdivisions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState(PHONE_PREFIXES.SAUDI);

  useEffect(() => {
    loadSubdivisions();
  }, []);

  const loadSubdivisions = async () => {
    try {
      const response = await membersService.getSubdivisions();
      if (response.success) {
        setSubdivisions(response.data);
      }
    } catch (error) {
      console.error('Error loading subdivisions:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit length based on prefix
    if (phonePrefix === PHONE_PREFIXES.SAUDI) {
      value = value.slice(0, 9); // 5XXXXXXXX
    } else {
      value = value.slice(0, 8); // XXXXXXXX
    }
    
    setFormData(prev => ({
      ...prev,
      phone: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate Arabic name
    if (!formData.full_name_ar.trim()) {
      newErrors.full_name_ar = 'الاسم بالعربية مطلوب';
    } else if (!validateArabicName(formData.full_name_ar)) {
      newErrors.full_name_ar = 'يجب إدخال اسم عربي صحيح (3 أحرف على الأقل)';
    }

    // Validate phone
    const fullPhone = phonePrefix + formData.phone;
    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!validatePhone(fullPhone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    // Validate subdivision
    if (!formData.family_branch_id) {
      newErrors.family_branch_id = 'الفخذ مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const fullPhone = phonePrefix + formData.phone;
      
      const response = await membersService.addMember({
        ...formData,
        phone: fullPhone
      });

      if (response.success) {
        alert('تمت إضافة العضو بنجاح! سيتم إرسال دعوة عبر واتساب');
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء إضافة العضو');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-form">
      <h2>إضافة عضو جديد</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Arabic Name */}
        <div className="form-group">
          <label>الاسم بالعربية *</label>
          <input
            type="text"
            name="full_name_ar"
            value={formData.full_name_ar}
            onChange={handleChange}
            placeholder="أدخل الاسم الكامل بالعربية"
            dir="rtl"
          />
          {errors.full_name_ar && (
            <span className="error">{errors.full_name_ar}</span>
          )}
        </div>

        {/* English Name (Optional) */}
        <div className="form-group">
          <label>الاسم بالإنجليزية (اختياري)</label>
          <input
            type="text"
            name="full_name_en"
            value={formData.full_name_en}
            onChange={handleChange}
            placeholder="Enter full name in English"
          />
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label>رقم الهاتف *</label>
          <div className="phone-input">
            <select 
              value={phonePrefix}
              onChange={(e) => {
                setPhonePrefix(e.target.value);
                setFormData(prev => ({ ...prev, phone: '' }));
              }}
            >
              <option value={PHONE_PREFIXES.SAUDI}>🇸🇦 +966</option>
              <option value={PHONE_PREFIXES.KUWAIT}>🇰🇼 +965</option>
            </select>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder={phonePrefix === PHONE_PREFIXES.SAUDI ? "5XXXXXXXX" : "XXXXXXXX"}
            />
          </div>
          {errors.phone && (
            <span className="error">{errors.phone}</span>
          )}
        </div>

        {/* Subdivision */}
        <div className="form-group">
          <label>الفخذ *</label>
          <select
            name="family_branch_id"
            value={formData.family_branch_id}
            onChange={handleChange}
          >
            <option value="">اختر الفخذ</option>
            {subdivisions.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.branch_name}
              </option>
            ))}
          </select>
          {errors.family_branch_id && (
            <span className="error">{errors.family_branch_id}</span>
          )}
        </div>

        {/* Buttons */}
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'جاري الإضافة...' : 'إضافة العضو'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              إلغاء
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .member-form {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
        }

        input, select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .phone-input {
          display: flex;
          gap: 0.5rem;
        }

        .phone-input select {
          width: 120px;
        }

        .error {
          color: #F44336;
          font-size: 0.875rem;
          display: block;
          margin-top: 0.25rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
        }

        button[type="submit"] {
          background: #4CAF50;
          color: white;
          flex: 1;
        }

        button[type="submit"]:hover:not(:disabled) {
          background: #45a049;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #757575;
          color: white;
        }

        .btn-secondary:hover {
          background: #616161;
        }
      `}</style>
    </div>
  );
};

export default MemberForm;
```

**Command to create:**
```bash
mkdir -p frontend/src/components
cat > frontend/src/components/MemberForm.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 4: CREATE .ENV FILE

### File: `frontend/.env`

```bash
# API Configuration
REACT_APP_API_URL=https://proshael.onrender.com/api

# App Configuration
REACT_APP_NAME=Al-Shuail Admin Panel
REACT_APP_VERSION=1.0.0

# Mobile App URL (for registration invites)
REACT_APP_MOBILE_URL=https://alshuail-mobile.app
```

**Command to create:**
```bash
cat > frontend/.env << 'EOF'
REACT_APP_API_URL=https://proshael.onrender.com/api
REACT_APP_NAME=Al-Shuail Admin Panel
REACT_APP_VERSION=1.0.0
REACT_APP_MOBILE_URL=https://alshuail-mobile.app
EOF
```

---

## ✅ VERIFICATION CHECKLIST

```
□ API services created and working
□ Authentication service integrated
□ Member form validates phone numbers
□ Saudi (+966) and Kuwaiti (+965) formats supported
□ Subdivision selection working
□ Error handling implemented
□ Loading states display correctly
□ Environment variables configured
```

---

## 🔧 TROUBLESHOOTING

### Issue: CORS errors
**Solution**: Update backend CORS settings:
```javascript
// In backend/server.js
app.use(cors({
  origin: ['https://alshuail-admin.pages.dev', 'http://localhost:3000'],
  credentials: true
}));
```

### Issue: API calls fail
**Solution**: Check network tab and verify:
1. Token is being sent in Authorization header
2. API URL is correct in .env file
3. Backend is running and accessible

---

## 📝 NEXT STEPS

After completing this file:
- ✅ Frontend connected to backend
- ✅ Member management UI working
- ✅ Phone validation implemented
- ⏭️ **NEXT**: File 07 - WhatsApp Integration

---

**Status**: Ready for Claude Code execution
**Estimated Time**: 30-40 minutes
**Dependencies**: Files 01-05 completed, Frontend deployed
**Next File**: 07-WHATSAPP-SMS-INTEGRATION.md
