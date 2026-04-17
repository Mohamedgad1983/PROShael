import React, { memo,  useState, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FaUpload, FaFileAlt, FaFilePdf, FaImage, FaSearch, FaFilter,
  FaTrash, FaDownload, FaEye, FaFolder, FaFolderOpen, FaUser,
  FaChevronDown, FaChevronLeft
} from 'react-icons/fa';
import { logger } from '../../utils/logger';

import './DocumentManager.css';

const DOCUMENT_CATEGORIES = {
  receipts: 'إيصالات الدفع',
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

  // Tree view state — which member folders and which (member, category)
  // subfolders are expanded. Members collapse by default to keep the page
  // short when there are hundreds of them.
  const [expandedMembers, setExpandedMembers] = useState(() => new Set());
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());

  const toggleMember = (memberId) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleCategory = (key) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      // Tree view groups by member so we want everything on one page, not 25.
      params.append('limit', '2000');

      // Admin-facing page: use GET /api/documents (admin-scoped, returns all
      // members' documents with member info joined). The old /api/documents/member
      // endpoint returned only the logged-in user's own docs, which for an admin
      // was always empty — that's why the page appeared blank before.
      const response = await fetch(`${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')}/api/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        logger.warn('🔑 Authentication error, redirecting to login...');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching documents:', { error });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')}/api/documents/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        logger.warn('🔑 Authentication error, redirecting to login...');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      logger.error('Error fetching stats:', { error });
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')}/api/documents/upload`, {
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `فشل رفع المستند (${response.status})`;
        logger.error('Upload failed:', { status: response.status, errorData });
        alert(`فشل رفع المستند: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('Upload error:', { error });
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')}/api/documents/${documentId}`, {
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
      logger.error('Delete error:', { error });
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

  // Group documents into a tree: { [memberId]: { member, categories: { [cat]: [docs] } } }
  // Orphan docs with no linked member land under a synthetic "(بدون عضو)" node.
  const groupedTree = useMemo(() => {
    const groups = {};
    for (const doc of documents) {
      const mid = doc.member_id || '__unassigned__';
      const memberLabel = doc.member?.full_name_ar
        || doc.member?.full_name
        || 'بدون عضو';
      const membershipNumber = doc.member?.membership_number;

      if (!groups[mid]) {
        groups[mid] = {
          memberId: mid,
          memberLabel,
          membershipNumber,
          categories: {},
          totalFiles: 0
        };
      }
      const g = groups[mid];
      const cat = doc.category || 'other';
      if (!g.categories[cat]) g.categories[cat] = [];
      g.categories[cat].push(doc);
      g.totalFiles += 1;
    }
    // Stable sort by member label (Arabic-aware)
    return Object.values(groups).sort((a, b) =>
      a.memberLabel.localeCompare(b.memberLabel, 'ar')
    );
  }, [documents]);

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

      {/* Tree view — folder per member → subfolder per category → files */}
      {loading ? (
        <div className="loading-spinner">جاري التحميل...</div>
      ) : groupedTree.length === 0 ? (
        <div className="documents-empty" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          لا توجد مستندات بعد.
        </div>
      ) : (
        <div className="documents-tree" style={{ marginTop: 16 }}>
          {groupedTree.map((group) => {
            const isMemberOpen = expandedMembers.has(group.memberId);
            return (
              <div key={group.memberId} className="tree-member" style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 8,
                overflow: 'hidden'
              }}>
                {/* Member folder header */}
                <button
                  onClick={() => toggleMember(group.memberId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '12px 16px',
                    background: isMemberOpen ? '#eef2ff' : '#f9fafb',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111827'
                  }}
                >
                  {isMemberOpen ? <FaChevronDown /> : <FaChevronLeft />}
                  {isMemberOpen ? <FaFolderOpen style={{ color: '#6366f1' }} /> : <FaFolder style={{ color: '#6366f1' }} />}
                  <FaUser style={{ color: '#9ca3af', fontSize: 12 }} />
                  <span style={{ flex: 1 }}>{group.memberLabel}</span>
                  {group.membershipNumber && (
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                      {group.membershipNumber}
                    </span>
                  )}
                  <span style={{
                    background: '#6366f1',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 10
                  }}>
                    {group.totalFiles}
                  </span>
                </button>

                {/* Member's categories (subfolders) */}
                {isMemberOpen && (
                  <div style={{ padding: '8px 16px 16px' }}>
                    {Object.entries(group.categories).map(([cat, docs]) => {
                      const key = `${group.memberId}::${cat}`;
                      const isCatOpen = expandedCategories.has(key);
                      return (
                        <div key={key} className="tree-category" style={{
                          marginTop: 8,
                          marginRight: 12,
                          borderRight: '2px solid #e5e7eb',
                          paddingRight: 12
                        }}>
                          <button
                            onClick={() => toggleCategory(key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%',
                              padding: '6px 8px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'right',
                              fontSize: 14,
                              color: '#374151'
                            }}
                          >
                            {isCatOpen ? <FaChevronDown style={{ fontSize: 11 }} /> : <FaChevronLeft style={{ fontSize: 11 }} />}
                            {isCatOpen ? <FaFolderOpen style={{ color: '#f59e0b' }} /> : <FaFolder style={{ color: '#f59e0b' }} />}
                            <span style={{ flex: 1 }}>{DOCUMENT_CATEGORIES[cat] || cat}</span>
                            <span style={{
                              background: '#e5e7eb',
                              color: '#374151',
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 8
                            }}>
                              {docs.length}
                            </span>
                          </button>

                          {/* Files in the category */}
                          {isCatOpen && (
                            <div style={{ paddingRight: 20, marginTop: 4 }}>
                              {docs.map((doc) => (
                                <div
                                  key={doc.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '8px 6px',
                                    borderBottom: '1px dashed #f3f4f6'
                                  }}
                                >
                                  <span style={{ fontSize: 18 }}>{getFileIcon(doc.mime_type || doc.file_type)}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {doc.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                      {formatFileSize(doc.file_size)} · {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('ar-SA')}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                      className="action-btn view"
                                      onClick={() => window.open(doc.file_url || doc.signed_url, '_blank')}
                                      title="عرض"
                                      style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                                    >
                                      <FaEye />
                                    </button>
                                    <a
                                      href={doc.file_url || doc.signed_url}
                                      download={doc.file_name || doc.original_name}
                                      className="action-btn download"
                                      title="تحميل"
                                      style={{ background: '#f0fdf4', color: '#16a34a', border: 'none', padding: '6px 10px', borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                    >
                                      <FaDownload />
                                    </a>
                                    <button
                                      className="action-btn delete"
                                      onClick={() => handleDelete(doc.id)}
                                      title="حذف"
                                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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

export default memo(DocumentManager);