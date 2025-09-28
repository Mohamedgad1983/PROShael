import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaFileAlt, FaFilePdf, FaImage, FaSearch, FaFilter, FaTrash, FaDownload, FaEye } from 'react-icons/fa';
import './DocumentManager.css';

const DOCUMENT_CATEGORIES = {
  national_id: 'الهوية الوطنية',
  marriage_certificate: 'عقد الزواج',
  property_deed: 'صك الملكية',
  birth_certificate: 'شهادة الميلاد',
  death_certificate: 'شهادة الوفاة',
  passport: 'جواز السفر',
  driver_license: 'رخصة القيادة',
  education: 'الشهادات التعليمية',
  medical: 'التقارير الطبية',
  other: 'أخرى'
};

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    category: 'other'
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [stats, setStats] = useState({
    total_documents: 0,
    total_size_mb: '0',
    by_category: []
  });

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/documents/member?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/documents/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [selectedCategory, searchTerm]);

  // Handle file drop
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadFormData({
        ...uploadFormData,
        title: acceptedFiles[0].name
      });
      setShowUploadModal(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  // Upload document
  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('title', uploadFormData.title);
    formData.append('description', uploadFormData.description);
    formData.append('category', uploadFormData.category);

    setUploadProgress(0);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadFormData({ title: '', description: '', category: 'other' });
        fetchDocuments();
        fetchStats();
        alert('تم رفع المستند بنجاح');
      } else {
        alert('فشل رفع المستند');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('حدث خطأ أثناء رفع المستند');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Delete document
  const handleDelete = async (documentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchDocuments();
        fetchStats();
        alert('تم حذف المستند بنجاح');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <FaFilePdf className="file-icon pdf" />;
    if (fileType?.includes('image')) return <FaImage className="file-icon image" />;
    return <FaFileAlt className="file-icon default" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="document-manager" dir="rtl">
      {/* Header */}
      <div className="dm-header">
        <h2>إدارة المستندات</h2>
        <div className="dm-stats">
          <div className="stat-item">
            <span className="stat-label">إجمالي المستندات:</span>
            <span className="stat-value">{stats.total_documents}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">الحجم الإجمالي:</span>
            <span className="stat-value">{stats.total_size_mb} MB</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="dm-controls">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="البحث في المستندات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <FaFilter />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">جميع الفئات</option>
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <FaUpload className="upload-icon" />
        <p className="upload-text">
          {isDragActive ? 'أفلت الملف هنا...' : 'اسحب وأفلت الملف هنا أو انقر للاختيار'}
        </p>
        <p className="upload-hint">PDF, JPG, PNG - الحد الأقصى 10MB</p>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="loading-spinner">جاري التحميل...</div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="doc-icon">
                {getFileIcon(doc.file_type)}
              </div>
              <div className="doc-info">
                <h4 className="doc-title">{doc.title}</h4>
                <p className="doc-category">{DOCUMENT_CATEGORIES[doc.category]}</p>
                <p className="doc-size">{formatFileSize(doc.file_size)}</p>
                <p className="doc-date">{new Date(doc.created_at).toLocaleDateString('ar-SA')}</p>
                {doc.description && (
                  <p className="doc-description">{doc.description}</p>
                )}
              </div>
              <div className="doc-actions">
                <button
                  className="action-btn view"
                  onClick={() => window.open(doc.signed_url, '_blank')}
                  title="عرض"
                >
                  <FaEye />
                </button>
                <a
                  href={doc.signed_url}
                  download={doc.original_name}
                  className="action-btn download"
                  title="تحميل"
                >
                  <FaDownload />
                </a>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(doc.id)}
                  title="حذف"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>تحميل مستند جديد</h3>
            <div className="form-group">
              <label>العنوان</label>
              <input
                type="text"
                value={uploadFormData.title}
                onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                placeholder="أدخل عنوان المستند"
              />
            </div>
            <div className="form-group">
              <label>الوصف</label>
              <textarea
                value={uploadFormData.description}
                onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                placeholder="أدخل وصف المستند (اختياري)"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>الفئة</label>
              <select
                value={uploadFormData.category}
                onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
              >
                {Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleUpload} disabled={loading}>
                {loading ? 'جاري الرفع...' : 'رفع المستند'}
              </button>
              <button className="btn-secondary" onClick={() => setShowUploadModal(false)}>
                إلغاء
              </button>
            </div>
            {uploadProgress > 0 && (
              <div className="upload-progress">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;