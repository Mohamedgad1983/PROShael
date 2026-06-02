import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Camera, User, Mail, MapPin, Briefcase, Calendar, Heart, FileText, Upload, Trash2, Eye, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'
import { memberService } from '../services'

const ProfileWizard = () => {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    birthdate_hijri: '',
    profession: '',
    city: '',
    marital_status: '',
    email: '',
    photo: null,
    photoFile: null
  })

  // Document state
  const [documents, setDocuments] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('identity')

  const totalSteps = 4

  const documentCategories = [
    { value: 'identity', label: 'الهوية الوطنية', icon: '🪪' },
    { value: 'passport', label: 'جواز السفر', icon: '📘' },
    { value: 'birth_certificate', label: 'شهادة الميلاد', icon: '📜' },
    { value: 'marriage_certificate', label: 'عقد الزواج', icon: '💍' },
    { value: 'education', label: 'الشهادات التعليمية', icon: '🎓' },
    { value: 'other', label: 'أخرى', icon: '📎' }
  ]

  useEffect(() => {
    if (step === 4) {
      loadDocuments()
    }
  }, [step])

  const loadDocuments = async () => {
    setDocumentsLoading(true)
    try {
      const response = await memberService.getDocuments()
      if (response.success && response.data) {
        setDocuments(response.data)
      }
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, photo: event.target.result, photoFile: file }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setDocError('حجم الملف يتجاوز 10 ميجابايت')
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setDocError('نوع الملف غير مدعوم. استخدم PDF أو صور')
      return
    }

    setUploadingDoc(true)
    setDocError(null)

    try {
      const categoryLabel = documentCategories.find(c => c.value === selectedCategory)?.label || selectedCategory
      const response = await memberService.uploadDocument(file, {
        title: `${categoryLabel} - ${file.name}`,
        category: selectedCategory
      })

      if (response.success) {
        await loadDocuments()
      }
    } catch (err) {
      console.error('Upload error:', err)
      setDocError('فشل في رفع المستند')
    } finally {
      setUploadingDoc(false)
      e.target.value = '' // Reset input
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('هل تريد حذف هذا المستند؟')) return

    try {
      await memberService.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete error:', err)
      setDocError('فشل في حذف المستند')
    }
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Upload avatar if selected
      if (formData.photoFile) {
        try {
          await memberService.uploadAvatar(formData.photoFile)
        } catch (avatarErr) {
          console.log('Avatar upload failed:', avatarErr)
        }
      }

      // Update profile data
      const profileData = {
        birthdate_hijri: formData.birthdate_hijri,
        profession: formData.profession,
        city: formData.city,
        marital_status: formData.marital_status,
        email: formData.email
      }

      try {
        await memberService.updateProfile(profileData)
      } catch (profileErr) {
        console.log('Profile update note:', profileErr)
      }

      // Update local user
      const updatedUser = { ...user, profileCompletion: 100, ...formData }
      login(updatedUser)
      navigate('/profile')
    } catch (err) {
      console.log('Saving locally')
      const updatedUser = { ...user, profileCompletion: 100, ...formData }
      login(updatedUser)
      navigate('/profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/profile')
  }

  const cities = [
    'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة',
    'الدمام', 'الخبر', 'الطائف', 'تبوك', 'بريدة', 'أخرى'
  ]

  const maritalStatuses = [
    { value: 'single', label: 'أعزب' },
    { value: 'married', label: 'متزوج' },
    { value: 'widowed', label: 'أرمل' }
  ]

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="back-button ml-3">
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">تعديل الملف الشخصي</h2>
            <p className="text-white/80 text-sm mt-1">أكمل بياناتك وارفع مستنداتك</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-500 text-sm">التقدم</span>
            <span className="text-primary-500 font-semibold">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {s < step ? <Check size={16} /> : s}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">
                  {s === 1 ? 'الأساسية' : s === 2 ? 'إضافية' : s === 3 ? 'الصورة' : 'المستندات'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card animate-fadeIn">
          {step === 1 && (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4">الخطوة 1: البيانات الأساسية</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    <Calendar size={16} className="inline ml-1" />
                    تاريخ الميلاد (هجري)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="1410/05/20"
                    value={formData.birthdate_hijri}
                    onChange={(e) => handleChange('birthdate_hijri', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    <Briefcase size={16} className="inline ml-1" />
                    المهنة
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: مهندس، طبيب، معلم"
                    value={formData.profession}
                    onChange={(e) => handleChange('profession', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    <MapPin size={16} className="inline ml-1" />
                    المدينة
                  </label>
                  <select
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  >
                    <option value="">اختر المدينة</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4">الخطوة 2: معلومات إضافية</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    <Heart size={16} className="inline ml-1" />
                    الحالة الاجتماعية
                  </label>
                  <select
                    className="form-input"
                    value={formData.marital_status}
                    onChange={(e) => handleChange('marital_status', e.target.value)}
                  >
                    <option value="">اختر</option>
                    {maritalStatuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    <Mail size={16} className="inline ml-1" />
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4">الخطوة 3: الصورة الشخصية</h3>

              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-4 ${
                    formData.photo ? 'border-primary-500' : 'border-gray-200 bg-gray-100'
                  }`}>
                    {formData.photo ? (
                      <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-gray-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                    <Camera size={20} className="text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                <p className="text-gray-400 text-sm">
                  الصورة اختيارية ويمكنك إضافتها لاحقاً
                </p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                <FileText size={20} className="inline ml-2" />
                الخطوة 4: المستندات الرسمية
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                ارفع مستنداتك الرسمية (الهوية، جواز السفر، الشهادات)
              </p>

              {docError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>{docError}</span>
                  <button onClick={() => setDocError(null)} className="mr-auto">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-gray-600 text-sm mb-2">نوع المستند</label>
                <div className="grid grid-cols-2 gap-2">
                  {documentCategories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`p-3 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                        selectedCategory === cat.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Button */}
              <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                uploadingDoc ? 'border-gray-300 bg-gray-50' : 'border-primary-300 hover:border-primary-500 hover:bg-primary-50'
              }`}>
                {uploadingDoc ? (
                  <>
                    <div className="spinner w-5 h-5"></div>
                    <span className="text-gray-500">جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-primary-500" />
                    <span className="text-primary-500 font-medium">اختر ملف للرفع</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDoc}
                />
              </label>
              <p className="text-gray-400 text-xs text-center mt-2">
                PDF أو صور (حد أقصى 10 ميجابايت)
              </p>

              {/* Documents List */}
              <div className="mt-6">
                <h4 className="text-gray-700 font-medium mb-3">المستندات المرفوعة ({documents.length})</h4>

                {documentsLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner mx-auto"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا توجد مستندات مرفوعة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => {
                      const category = documentCategories.find(c => c.value === doc.category)
                      return (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-lg">
                            {category?.icon || '📎'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 text-sm font-medium truncate">{doc.title || doc.original_name}</p>
                            <p className="text-gray-400 text-xs">
                              {category?.label || doc.category} • {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {doc.signed_url && (
                              <a
                                href={doc.signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500"
                              >
                                <Eye size={16} />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold"
              >
                السابق
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-white ${
                step === totalSteps
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gradient-to-r from-primary-500 to-purple-500'
              }`}
            >
              {loading ? (
                <div className="spinner w-5 h-5 mx-auto border-2 border-white/30 border-t-white"></div>
              ) : step === totalSteps ? (
                <>✓ حفظ التغييرات</>
              ) : (
                'التالي'
              )}
            </button>
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="w-full text-center text-gray-400 text-sm mt-4 py-2"
        >
          تخطي وإكمال لاحقاً
        </button>
      </div>
    </div>
  )
}

export default ProfileWizard
