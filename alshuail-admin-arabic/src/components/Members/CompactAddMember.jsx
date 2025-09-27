import React, { useState } from 'react';
import './CompactAddMember.css';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  HomeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  PhotoIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const CompactAddMember = ({ onMemberAdded }) => {
  const [formData, setFormData] = useState({
    // Personal Info
    full_name: '',
    phone: '',
    email: '',
    national_id: '',
    tribal_section: '', // Added tribal section

    // Address Info
    city: '',
    district: '',

    // Professional Info
    occupation: '',
    workplace: '',

    // Account Info
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idDocPreview, setIdDocPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [idDocFile, setIdDocFile] = useState(null);

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
        [name]: ''
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, photo: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' }));
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, photo: '' }));
    }
  };

  const handleIdDocChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrors(prev => ({ ...prev, idDoc: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت' }));
        return;
      }
      setIdDocFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setIdDocPreview(event.target.result);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, idDoc: '' }));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const removeIdDoc = () => {
    setIdDocFile(null);
    setIdDocPreview(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'الاسم مطلوب';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'رقم هاتف غير صالح';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'بريد إلكتروني غير صالح';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful response
      const newMember = {
        id: Date.now(),
        ...formData,
        status: 'active',
        profile_completed: true,
        created_at: new Date().toISOString()
      };

      setSuccess(true);

      // Clear form after 2 seconds and call parent callback
      setTimeout(() => {
        setFormData({
          full_name: '',
          phone: '',
          email: '',
          national_id: '',
          tribal_section: '',
          city: '',
          district: '',
          occupation: '',
          workplace: '',
          password: '',
          confirmPassword: ''
        });
        setSuccess(false);
        if (onMemberAdded) {
          onMemberAdded(newMember);
        }
      }, 2000);

    } catch (error) {
      console.error('Error adding member:', error);
      setErrors({ submit: 'حدث خطأ في إضافة العضو' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-screen">
        <CheckCircleIcon className="success-icon" />
        <h2>تمت إضافة العضو بنجاح!</h2>
        <p>جاري العودة إلى قائمة الأعضاء...</p>
      </div>
    );
  }

  return (
    <div className="compact-add-member-form">
      <form onSubmit={handleSubmit} className="member-form">
        <div className="form-grid">
          {/* Column 1: Personal Information */}
          <div className="form-column">
            <div className="column-header">
              <UserIcon className="header-icon" />
              <h3>المعلومات الشخصية</h3>
            </div>

            <div className="form-group">
              <label htmlFor="full_name">الاسم الكامل *</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={errors.full_name ? 'error' : ''}
                placeholder="أدخل الاسم الكامل"
                dir="rtl"
              />
              {errors.full_name && <span className="error-message">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">رقم الهاتف *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'error' : ''}
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="example@email.com"
                dir="ltr"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="national_id">رقم الهوية</label>
              <input
                type="text"
                id="national_id"
                name="national_id"
                value={formData.national_id}
                onChange={handleChange}
                placeholder="رقم الهوية الوطنية"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tribal_section">الفخذ</label>
              <select
                id="tribal_section"
                name="tribal_section"
                value={formData.tribal_section}
                onChange={handleChange}
                className="form-select"
                dir="rtl"
              >
                <option value="">اختر الفخذ</option>
                <option value="البديد">البديد</option>
                <option value="جميع المتحد">جميع المتحد</option>
                <option value="جميع الفديد">جميع الفديد</option>
                <option value="رشود">رشود</option>
                <option value="الرشيس">الرشيس</option>
                <option value="نيد">نيد</option>
                <option value="المد">المد</option>
                <option value="الوايلة">الوايلة</option>
                <option value="الشيمان">الشيمان</option>
                <option value="المسعود">المسعود</option>
                <option value="عقاب">عقاب</option>
              </select>
            </div>

            {/* Photo Upload */}
            <div className="form-group">
              <label>الصورة الشخصية</label>
              <div className="upload-area">
                {photoPreview ? (
                  <div className="preview-container">
                    <img src={photoPreview} alt="صورة شخصية" className="photo-preview" />
                    <button type="button" className="remove-btn" onClick={removePhoto}>
                      <XMarkIcon />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="photo-upload" className="upload-label">
                    <PhotoIcon className="upload-icon" />
                    <span>اضغط لرفع الصورة</span>
                    <span className="upload-hint">JPG, PNG (حد أقصى 5MB)</span>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              {errors.photo && <span className="error-message">{errors.photo}</span>}
            </div>
          </div>

          {/* Column 2: Address & Professional */}
          <div className="form-column">
            <div className="column-header">
              <HomeIcon className="header-icon" />
              <h3>العنوان والعمل</h3>
            </div>

            <div className="form-group">
              <label htmlFor="city">المدينة</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="المدينة"
                dir="rtl"
              />
            </div>

            <div className="form-group">
              <label htmlFor="district">الحي</label>
              <input
                type="text"
                id="district"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="الحي"
                dir="rtl"
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupation">المهنة</label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="المهنة"
                dir="rtl"
              />
            </div>

            <div className="form-group">
              <label htmlFor="workplace">جهة العمل</label>
              <input
                type="text"
                id="workplace"
                name="workplace"
                value={formData.workplace}
                onChange={handleChange}
                placeholder="جهة العمل"
                dir="rtl"
              />
            </div>

            {/* ID Document Upload */}
            <div className="form-group">
              <label>صورة الهوية الوطنية</label>
              <div className="upload-area">
                {idDocPreview ? (
                  <div className="preview-container">
                    {idDocPreview.includes('application/pdf') ? (
                      <div className="pdf-preview">
                        <DocumentIcon className="doc-icon" />
                        <span>ملف PDF</span>
                      </div>
                    ) : (
                      <img src={idDocPreview} alt="الهوية" className="id-preview" />
                    )}
                    <button type="button" className="remove-btn" onClick={removeIdDoc}>
                      <XMarkIcon />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="id-upload" className="upload-label">
                    <DocumentIcon className="upload-icon" />
                    <span>اضغط لرفع صورة الهوية</span>
                    <span className="upload-hint">JPG, PNG, PDF (حد أقصى 10MB)</span>
                    <input
                      type="file"
                      id="id-upload"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleIdDocChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              {errors.idDoc && <span className="error-message">{errors.idDoc}</span>}
            </div>
          </div>

          {/* Column 3: Account Settings */}
          <div className="form-column">
            <div className="column-header">
              <IdentificationIcon className="header-icon" />
              <h3>معلومات الحساب</h3>
            </div>

            <div className="form-group">
              <label htmlFor="password">كلمة المرور *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                dir="ltr"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">تأكيد كلمة المرور *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="••••••••"
                dir="ltr"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="btn-icon" />
                    إضافة العضو
                  </>
                )}
              </button>
            </div>

            {errors.submit && (
              <div className="submit-error">
                {errors.submit}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompactAddMember;