import React, { useState, useRef, useCallback } from 'react';
import { memberService } from '../../services/memberService';
import {
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

const MemberImport = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Load import history on component mount
  React.useEffect(() => {
    loadImportHistory();
  }, []);

  const loadImportHistory = async () => {
    try {
      const history = await memberService.getImportHistory();
      setImportHistory(history);
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 file.type === 'application/vnd.ms-excel' ||
                 file.name.endsWith('.xlsx') ||
                 file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      alert('يرجى اختيار ملف Excel صحيح (.xlsx أو .xls)');
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await memberService.importMembersFromExcel(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setImportResult(result);
      setSelectedFile(null);
      loadImportHistory(); // Reload history after successful import

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setImportResult({
        success: false,
        message: error.message || 'حدث خطأ أثناء رفع الملف',
        errors: [{ message: error.message || 'خطأ في الرفع' }]
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Send reminders
  const handleSendReminders = async () => {
    try {
      const result = await memberService.sendRegistrationReminders();
      alert(`تم إرسال ${result.sentCount} رسالة تذكيرية بنجاح`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('حدث خطأ أثناء إرسال التذكيرات');
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    // Create a sample Excel template
    const templateData = [
      ['الاسم الكامل', 'رقم الهاتف', 'رقم الواتساب', 'رقم العضوية'],
      ['أحمد محمد الشعيل', '966501234567', '966501234567', '10001'],
      ['فاطمة عبدالله الشعيل', '966509876543', '966509876543', '10002'],
      ['محمد سعد الشعيل', '966555555555', '966555555555', '10003']
    ];

    // Convert to CSV format
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'نموذج_الأعضاء.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6" dir="rtl">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">استيراد الأعضاء من Excel</h1>
          <p className="text-gray-600">قم برفع ملف Excel يحتوي على بيانات الأعضاء الجدد</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">رفع ملف Excel</h2>

          {/* Expected Format Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">التنسيق المطلوب:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• الاسم الكامل (باللغة العربية)</li>
              <li>• رقم الهاتف (مع رمز البلد مثل 966501234567)</li>
              <li>• رقم الواتساب (مع رمز البلد)</li>
              <li>• رقم العضوية (يبدأ من 10001)</li>
            </ul>
            <button
              onClick={handleDownloadTemplate}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              تحميل نموذج Excel
            </button>
          </div>

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="space-y-4">
              <CloudArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto" />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <DocumentArrowUpIcon className="w-5 h-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    حجم الملف: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg text-gray-600">اسحب وأفلت ملف Excel هنا</p>
                  <p className="text-sm text-gray-500">أو انقر لاختيار ملف</p>
                  <p className="text-xs text-gray-400">يدعم .xlsx و .xls فقط</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">جاري الرفع...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <ClockIcon className="w-5 h-5 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-5 h-5" />
                رفع الملف
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Import Results */}
          {importResult && (
            <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">نتائج الاستيراد</h2>

              <div className={`p-4 rounded-lg border ${
                importResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {importResult.success ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-600" />
                  )}
                  <h3 className={`font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.success ? 'تم الاستيراد بنجاح' : 'فشل في الاستيراد'}
                  </h3>
                </div>

                {importResult.success && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 p-3 rounded">
                      <div className="text-2xl font-bold text-green-600">{importResult.successCount || 0}</div>
                      <div className="text-sm text-gray-600">تم إضافتهم بنجاح</div>
                    </div>
                    <div className="bg-white/50 p-3 rounded">
                      <div className="text-2xl font-bold text-red-600">{importResult.failedCount || 0}</div>
                      <div className="text-sm text-gray-600">فشل في الإضافة</div>
                    </div>
                  </div>
                )}

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-800 mb-2">الأخطاء:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700 bg-white/50 p-2 rounded">
                          {error.row && `الصف ${error.row}: `}{error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.message && (
                  <p className={`text-sm mt-2 ${
                    importResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {importResult.message}
                  </p>
                )}
              </div>

              {importResult.success && (
                <button
                  onClick={handleSendReminders}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                  إرسال رسائل التسجيل للأعضاء الجدد
                </button>
              )}
            </div>
          )}

          {/* Import History */}
          <div className="backdrop-blur-md bg-white/70 rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">سجل الاستيراد</h2>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showHistory ? 'إخفاء' : 'عرض'} السجل
              </button>
            </div>

            {showHistory && (
              <div className="space-y-3">
                {importHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد عمليات استيراد سابقة</p>
                ) : (
                  importHistory.slice(0, 5).map((record, index) => (
                    <div key={index} className="bg-white/50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">
                          {new Date(record.created_at).toLocaleDateString('ar-SA')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status === 'completed' ? 'مكتمل' : 'فاشل'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>الملف: {record.filename}</p>
                        <p>النجح: {record.success_count} | فشل: {record.failed_count}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberImport;