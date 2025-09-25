import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberService } from '../../services/memberService';
import {
  UserIcon,
  PhoneIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const MemberRegistration = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState(null);
  const [formData, setFormData] = useState({
    national_id: '',
    birth_date: '',
    employer: '',
    email: '',
    social_security_beneficiary: '',
    profile_photo: null,
    national_id_document: null,
    national_id_document_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [nationalIdPreview, setNationalIdPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const fileInputRef = useRef(null);
  const nationalIdInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Verify token and load member data on component mount
  useEffect(() => {
    verifyToken();
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('رمز التسجيل مفقود');
      setLoading(false);
      return;
    }

    try {
      const response = await memberService.verifyRegistrationToken(token);
      setMemberData(response.member);
      setError('');
    } catch (error) {
      console.error('Token verification error:', error);
      setError('رمز التسجيل غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRadioChange = (value) => {
    setFormData(prev => ({
      ...prev,
      social_security_beneficiary: value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processPhoto(file);
    }
  };

  const processPhoto = (file) => {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صحيح');
      return;
    }

    setFormData(prev => ({
      ...prev,
      profile_photo: file
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle National ID document upload
  const handleNationalIdUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB for documents)
      if (file.size > 10 * 1024 * 1024) {
        alert('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
        return;
      }

      // Check file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('يرجى رفع صورة (JPG, PNG) أو ملف PDF لصورة الهوية الوطنية');
        return;
      }

      setFormData(prev => ({
        ...prev,
        national_id_document: file,
        national_id_document_url: URL.createObjectURL(file)
      }));

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setNationalIdPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDF, just show file name
        setNationalIdPreview('PDF');
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('تعذر الوصول إلى الكاميرا. يرجى السماح بالوصول أو استخدام رفع الملف.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob((blob) => {
        const file = new File([blob], 'profile_photo.jpg', { type: 'image/jpeg' });
        processPhoto(file);
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const validateForm = () => {
    const errors = {};

    // National ID validation
    if (!formData.national_id.trim()) {
      errors.national_id = 'رقم الهوية مطلوب';
    } else if (!/^\d{10}$/.test(formData.national_id.trim())) {
      errors.national_id = 'رقم الهوية يجب أن يكون 10 أرقام';
    }

    // Birth date validation
    if (!formData.birth_date) {
      errors.birth_date = 'تاريخ الميلاد مطلوب';
    } else {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 1 || age > 120) {
        errors.birth_date = 'تاريخ الميلاد غير صحيح';
      }
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    // Social security question validation
    if (!formData.social_security_beneficiary) {
      errors.social_security_beneficiary = 'يرجى الإجابة على سؤال الضمان الاجتماعي';
    }

    // National ID document validation - REQUIRED
    if (!formData.national_id_document) {
      errors.national_id_document = 'يرجى رفع صورة من الهوية الوطنية للتحقق من البيانات';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await memberService.completeProfile(token, formData);
      setSuccess(true);

      // Redirect to success page or login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'حدث خطأ أثناء إتمام التسجيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-8 shadow-lg border border-white/20 text-center">
          <ClockIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحقق من رمز التسجيل...</p>
        </div>
      </div>
    );
  }

  if (error && !memberData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-8 shadow-lg border border-white/20 text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">خطأ في التحقق</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-8 shadow-lg border border-white/20 text-center max-w-md">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">تم التسجيل بنجاح!</h2>
          <p className="text-gray-600 mb-6">
            تم إكمال ملفك الشخصي بنجاح. سيتم توجيهك إلى صفحة تسجيل الدخول خلال لحظات.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4" dir="rtl">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">إكمال ملف العضوية</h1>
            <p className="text-gray-600">مرحباً {memberData?.full_name_arabic}</p>
            <p className="text-sm text-gray-500 mt-1">رقم العضوية: {memberData?.membership_number}</p>
          </div>
        </div>
      </div>

      {/* Pre-filled Information */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">البيانات المسجلة مسبقاً</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg">
              <UserIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">الاسم الكامل</p>
                <p className="font-medium text-gray-800">{memberData?.full_name_arabic || 'غير محدد'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg">
              <PhoneIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">رقم الهاتف</p>
                <p className="font-medium text-gray-800">{memberData?.phone || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="max-w-2xl mx-auto">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهوية الوطنية *
              </label>
              <div className="relative">
                <IdentificationIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleInputChange}
                  placeholder="أدخل رقم الهوية (10 أرقام)"
                  className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.national_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength="10"
                />
              </div>
              {validationErrors.national_id && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.national_id}</p>
              )}
            </div>

            {/* National ID Document Upload - REQUIRED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                صورة الهوية الوطنية *
                <span className="text-xs text-gray-500 block mt-1">
                  (يرجى رفع صورة واضحة للهوية الوطنية للتحقق من صحة البيانات)
                </span>
              </label>
              <div className="space-y-3">
                {/* Upload Area */}
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  validationErrors.national_id_document ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-500'
                } transition-colors duration-200`}>
                  {nationalIdPreview ? (
                    <div className="space-y-3">
                      {nationalIdPreview === 'PDF' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 18h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2v13a2 2 0 002 2z"/>
                          </svg>
                          <span className="text-sm font-medium">ملف PDF محمل</span>
                        </div>
                      ) : (
                        <img
                          src={nationalIdPreview}
                          alt="National ID Preview"
                          className="max-w-full h-40 object-contain mx-auto rounded-lg shadow-md"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNationalIdPreview(null);
                          setFormData(prev => ({
                            ...prev,
                            national_id_document: null,
                            national_id_document_url: ''
                          }));
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        إزالة وإعادة الرفع
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        اضغط لرفع صورة الهوية أو اسحب الملف هنا
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF حتى 10 ميجابايت
                      </p>
                      <input
                        ref={nationalIdInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleNationalIdUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => nationalIdInputRef.current?.click()}
                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                      >
                        اختر ملف
                      </button>
                    </div>
                  )}
                </div>
                {validationErrors.national_id_document && (
                  <p className="text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 ml-1" />
                    {validationErrors.national_id_document}
                  </p>
                )}
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الميلاد *
              </label>
              <div className="relative">
                <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleInputChange}
                  className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.birth_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {validationErrors.birth_date && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.birth_date}</p>
              )}
            </div>

            {/* Employer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                جهة العمل (اختياري)
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="employer"
                  value={formData.employer}
                  onChange={handleInputChange}
                  placeholder="أدخل جهة العمل"
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="أدخل البريد الإلكتروني"
                  className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Social Security Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                هل أنت مستفيد من الضمان الاجتماعي؟ *
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="social_security_beneficiary"
                    value="true"
                    checked={formData.social_security_beneficiary === 'true'}
                    onChange={() => handleRadioChange('true')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="mr-3 text-gray-800">نعم، أنا مستفيد من الضمان الاجتماعي</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="social_security_beneficiary"
                    value="false"
                    checked={formData.social_security_beneficiary === 'false'}
                    onChange={() => handleRadioChange('false')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="mr-3 text-gray-800">لا، لست مستفيد من الضمان الاجتماعي</span>
                </label>
              </div>
              {validationErrors.social_security_beneficiary && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.social_security_beneficiary}</p>
              )}
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الصورة الشخصية (اختياري)
              </label>

              {/* Photo Preview */}
              {photoPreview && (
                <div className="mb-4 text-center">
                  <img
                    src={photoPreview}
                    alt="معاينة الصورة"
                    className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-white shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setFormData(prev => ({ ...prev, profile_photo: null }));
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    حذف الصورة
                  </button>
                </div>
              )}

              {/* Camera Section */}
              {cameraActive && (
                <div className="mb-4 text-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-sm rounded-lg border-2 border-gray-300"
                  />
                  <div className="flex gap-3 mt-3 justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      التقط الصورة
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Photo Upload Options */}
              {!photoPreview && !cameraActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <CameraIcon className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-700">استخدم الكاميرا</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <ArrowLeftIcon className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-700">اختر من الملفات</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  جاري إتمام التسجيل...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  إتمام التسجيل
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-sm text-gray-500">
          &copy; 2024 نظام الشعيل. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default MemberRegistration;