import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FaCamera,
  FaImage,
  FaUpload,
  FaTimes,
  FaCheckCircle,
  FaFileImage,
  FaSpinner,
  FaRedo
} from 'react-icons/fa';
import '../../styles/mobile/ReceiptUpload.css';

interface ReceiptUploadProps {
  onUploadComplete: (url: string) => void;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('نوع الملف غير مدعوم. الرجاء اختيار صورة (JPG, PNG) أو PDF');
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${apiUrl}/api/receipts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        setUploadSuccess(true);

        // Wait for animation then call callback
        setTimeout(() => {
          onUploadComplete(data.url);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'فشل رفع الملف');
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('حدث خطأ في رفع الملف');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setUploadProgress(0);
    setUploadSuccess(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setUploadProgress(0);
    setUploadSuccess(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="receipt-upload-container">
      <h2>رفع إيصال الدفع</h2>

      {!selectedFile ? (
        <>
          {/* Upload Options */}
          <div className="upload-options">
            <button
              className="upload-option camera"
              onClick={() => cameraInputRef.current?.click()}
            >
              <FaCamera />
              <span>التقاط صورة</span>
            </button>
            <button
              className="upload-option gallery"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaImage />
              <span>اختيار من المعرض</span>
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            hidden
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            hidden
          />

          <div className="upload-info">
            <p>الملفات المدعومة: JPG, PNG, PDF</p>
            <p>الحجم الأقصى: 5 ميجابايت</p>
          </div>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FaTimes />
              <span>{error}</span>
            </motion.div>
          )}
        </>
      ) : (
        <>
          {/* File Preview */}
          <div className="file-preview">
            {preview ? (
              <img src={preview} alt="Receipt preview" />
            ) : (
              <div className="pdf-preview">
                <FaFileImage />
                <span>ملف PDF</span>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">{formatFileSize(selectedFile.size)}</span>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <motion.div
              className="success-message"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <FaCheckCircle />
              <span>تم رفع الإيصال بنجاح</span>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <FaTimes />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="upload-actions">
            {!uploading && !uploadSuccess && !error && (
              <>
                <button
                  className="upload-btn primary"
                  onClick={handleUpload}
                >
                  <FaUpload />
                  <span>رفع الإيصال</span>
                </button>
                <button
                  className="upload-btn secondary"
                  onClick={handleReset}
                >
                  <FaTimes />
                  <span>إلغاء</span>
                </button>
              </>
            )}

            {uploading && (
              <button className="upload-btn loading" disabled>
                <FaSpinner className="spinner" />
                <span>جاري الرفع...</span>
              </button>
            )}

            {error && (
              <>
                <button
                  className="upload-btn primary"
                  onClick={handleRetry}
                >
                  <FaRedo />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  className="upload-btn secondary"
                  onClick={handleReset}
                >
                  <FaTimes />
                  <span>اختيار ملف آخر</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReceiptUpload;