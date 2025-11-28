import React, { memo,  useState } from 'react';
import { logger } from '../../utils/logger';

import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  HashtagIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

const AddMemberModal = ({ isOpen, onClose, onMemberAdded }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    membership_number: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    national_id: '',
    employer: '',
    social_security_beneficiary: false,
    send_registration_link: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Generate membership number automatically
  const generateMembershipNumber = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `SH-${randomNum}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.full_name.trim()) {
      errors.push('الاسم الكامل مطلوب');
    }

    if (!formData.phone.trim()) {
      errors.push('رقم الهاتف مطلوب');
    }

    // Phone number validation (Saudi format)
    const phoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      errors.push('رقم الهاتف غير صحيح');
    }

    // Email validation if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('البريد الإلكتروني غير صحيح');
    }

    // National ID validation if provided (10 digits)
    if (formData.national_id && !/^\d{10}$/.test(formData.national_id)) {
      errors.push('رقم الهوية يجب أن يكون 10 أرقام');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('، '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate membership number if not provided
      const membershipNumber = formData.membership_number || generateMembershipNumber();

      // Prepare member data
      const memberData = {
        full_name: formData.full_name.trim(),
        membership_number: membershipNumber,
        phone: formData.phone.trim(),
        whatsapp_number: formData.whatsapp_number.trim() || formData.phone.trim(),
        email: formData.email.trim() || null,
        employer: formData.employer.trim() || null,
        social_security_beneficiary: formData.social_security_beneficiary,
        status: 'pending_verification',
        membership_status: 'active',
        profile_completed: false,
        // Store National ID in additional_info if provided
        additional_info: formData.national_id ? JSON.stringify({
          national_id: formData.national_id,
          added_manually: true,
          added_date: new Date().toISOString()
        }) : null
      };

      // Call API to create member
      const response = await fetch(`${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')}/api/members/add-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...memberData,
          send_registration_link: formData.send_registration_link
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);

        // Show success message briefly then close
        setTimeout(() => {
          setSuccess(false);
          onMemberAdded(data.data.member);
          onClose();

          // Reset form
          setFormData({
            full_name: '',
            membership_number: '',
            phone: '',
            whatsapp_number: '',
            email: '',
            national_id: '',
            employer: '',
            social_security_beneficiary: false,
            send_registration_link: true
          });
        }, 1500);
      } else {
        setError(data.error || 'حدث خطأ أثناء إضافة العضو');
      }
    } catch (error) {
      logger.error('Error adding member:', { error });
      setError('فشل في إضافة العضو. يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-50 z-50 overflow-hidden"
      dir="rtl"
    >
      <div className="w-full h-screen flex flex-col bg-white">
        {/* Full-Width Header Bar */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 w-full px-6 sm:px-8 lg:px-16 py-6 sm:py-8 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center ml-3 sm:ml-4">
                  <UserPlusIcon className="w-7 sm:w-8 h-7 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">إضافة عضو جديد</h1>
                  <p className="text-blue-100 text-sm sm:text-base font-medium mt-1">إنشاء حساب عضوية جديد في النظام</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 sm:w-12 h-10 sm:h-12 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-200"
                disabled={loading}
              >
                <XMarkIcon className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Success Overlay */}
          {success && (
            <div className="absolute inset-0 bg-white bg-opacity-98 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <CheckCircleIcon className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">تم بنجاح!</h3>
                <p className="text-gray-600 text-lg">تم إضافة العضو الجديد بنجاح</p>
                {formData.send_registration_link && (
                  <p className="text-sm text-green-600 mt-3 bg-green-50 px-4 py-2 rounded-lg inline-block">
                    سيتم إرسال رابط التسجيل إلى رقم الهاتف المسجل
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 mt-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center ml-3">
                    <XMarkIcon className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Full-Page Form */}
          <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column */}
              <div className="space-y-6 lg:space-y-8">
                {/* Personal Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">البيانات الشخصية</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        الاسم الكامل *
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="أدخل الاسم الكامل بالعربي"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        رقم الهاتف *
                      </label>
                      <div className="relative">
                        <PhoneIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="05xxxxxxxx"
                          required
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        رقم الواتساب
                      </label>
                      <div className="relative">
                        <DevicePhoneMobileIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          name="whatsapp_number"
                          value={formData.whatsapp_number}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="05xxxxxxxx (اختياري)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Identity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center ml-3">
                        <EnvelopeIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">التواصل والهوية</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="example@email.com (اختياري)"
                        />
                      </div>
                    </div>

                    {/* National ID */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        رقم الهوية الوطنية
                      </label>
                      <div className="relative">
                        <IdentificationIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="national_id"
                          value={formData.national_id}
                          onChange={handleInputChange}
                          maxLength="10"
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="10 أرقام (اختياري)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6 lg:space-y-8">
                {/* Membership & Work */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center ml-3">
                        <BriefcaseIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">العضوية والعمل</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Membership Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        رقم العضوية
                      </label>
                      <div className="relative">
                        <HashtagIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="membership_number"
                          value={formData.membership_number}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="يتم توليده تلقائياً إذا ترك فارغاً"
                        />
                      </div>
                    </div>

                    {/* Employer */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-right">
                        جهة العمل
                      </label>
                      <div className="relative">
                        <BriefcaseIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="employer"
                          value={formData.employer}
                          onChange={handleInputChange}
                          className="w-full h-12 pr-12 pl-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right placeholder-gray-400 bg-white"
                          placeholder="اسم جهة العمل (اختياري)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center ml-3">
                        <ShieldCheckIcon className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">الإعدادات</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Social Security */}
                    <label className="flex items-center cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 transition-all duration-200">
                      <input
                        type="checkbox"
                        name="social_security_beneficiary"
                        checked={formData.social_security_beneficiary}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-4"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900">مستفيد من الضمان الاجتماعي</span>
                          <p className="text-xs text-gray-600 mt-1">تحديد حالة الاستفادة من الضمان الاجتماعي</p>
                        </div>
                      </div>
                    </label>

                    {/* SMS Registration */}
                    <label className="flex items-center cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-green-50 transition-all duration-200">
                      <input
                        type="checkbox"
                        name="send_registration_link"
                        checked={formData.send_registration_link}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ml-4"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center ml-3">
                          <PaperAirplaneIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900">إرسال رابط التسجيل عبر SMS</span>
                          <p className="text-xs text-gray-600 mt-1">سيتم إرسال رابط التفعيل إلى رقم الهاتف المسجل</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Actions Footer */}
            <div className="bg-white border-t border-gray-200 mt-8 -mx-6 sm:-mx-8 lg:-mx-16 px-6 sm:px-8 lg:px-16 py-6 sticky bottom-0">
              <div className="max-w-7xl mx-auto flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 min-w-[120px]"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[140px] justify-center shadow-lg hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-5 h-5 ml-2" />
                      إضافة العضو
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default memo(AddMemberModal);