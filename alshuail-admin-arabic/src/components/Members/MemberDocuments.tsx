import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  DocumentIcon,
  DocumentTextIcon,
  IdentificationIcon,
  AcademicCapIcon,
  HeartIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { DocumentIcon as DocumentIconSolid } from '@heroicons/react/24/solid';
import { memberService } from '../../services/memberService';
import { logger } from '../../utils/logger';

import '../../styles/apple-design-system.css';

// Document category type
type DocumentCategory = 'identity' | 'passport' | 'birth_certificate' | 'marriage_certificate' | 'education' | 'other';

// Document interface
interface MemberDocument {
  id: string;
  member_id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  member?: {
    full_name_ar?: string;
    full_name?: string;
    membership_id?: string;
  };
}

// Member interface for search
interface Member {
  id: string;
  full_name_ar?: string;
  full_name?: string;
  membership_id?: string;
  phone?: string;
}

// Category configuration
const DOCUMENT_CATEGORIES: Record<DocumentCategory, { label: string; icon: React.ComponentType<any>; color: string }> = {
  identity: { label: 'بطاقة الهوية', icon: IdentificationIcon, color: 'bg-blue-500' },
  passport: { label: 'جواز السفر', icon: DocumentTextIcon, color: 'bg-green-500' },
  birth_certificate: { label: 'شهادة الميلاد', icon: DocumentIcon, color: 'bg-purple-500' },
  marriage_certificate: { label: 'عقد الزواج', icon: HeartIcon, color: 'bg-pink-500' },
  education: { label: 'شهادات تعليمية', icon: AcademicCapIcon, color: 'bg-amber-500' },
  other: { label: 'أخرى', icon: FolderIcon, color: 'bg-gray-500' }
};

const MemberDocuments: React.FC = () => {
  // State
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Member search
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Modal state
  const [previewDocument, setPreviewDocument] = useState<MemberDocument | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MemberDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async (page = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const filters: Record<string, string> = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedMemberId) filters.memberId = selectedMemberId;
      if (searchQuery) filters.search = searchQuery;

      const response = await memberService.getAllDocuments(filters, page, itemsPerPage);

      if (response.success) {
        const docs = Array.isArray(response.data) ? response.data : (response.documents || []);
        setDocuments(docs);
        setTotalCount(response.total || docs.length);
        setTotalPages(Math.ceil((response.total || docs.length) / itemsPerPage));
        setCurrentPage(page);
      } else {
        throw new Error(response.error || 'Failed to fetch documents');
      }
    } catch (err: any) {
      logger.error('Error fetching documents:', { error: err });
      setError(err.message || 'حدث خطأ أثناء جلب المستندات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedMemberId, searchQuery, itemsPerPage]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments(1);
  }, [fetchDocuments]);

  // Search members
  const searchMembers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    try {
      const response = await memberService.searchMembers(query);
      if (response.success) {
        const members = Array.isArray(response.data) ? response.data : (response.members || []);
        setMemberSearchResults(members.slice(0, 10));
      }
    } catch (err) {
      logger.error('Error searching members:', { error: err });
    }
  }, []);

  // Debounced member search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (memberSearchQuery) {
        searchMembers(memberSearchQuery);
        setShowMemberDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, searchMembers]);

  // Select member
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setSelectedMemberId(member.id);
    setMemberSearchQuery(member.full_name_ar || member.full_name || '');
    setShowMemberDropdown(false);
    setCurrentPage(1);
  };

  // Clear member filter
  const clearMemberFilter = () => {
    setSelectedMember(null);
    setSelectedMemberId('');
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  // Download document
  const handleDownload = async (doc: MemberDocument) => {
    try {
      const blob = await memberService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error downloading document:', { error: err });
      setError('حدث خطأ أثناء تحميل المستند');
    }
  };

  // Delete document
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      const response = await memberService.deleteDocument(deleteConfirm.id);
      if (response.success) {
        setDocuments(prev => prev.filter(d => d.id !== deleteConfirm.id));
        setDeleteConfirm(null);
        setTotalCount(prev => prev - 1);
      } else {
        throw new Error(response.error || 'Failed to delete document');
      }
    } catch (err: any) {
      logger.error('Error deleting document:', { error: err });
      setError(err.message || 'حدث خطأ أثناء حذف المستند');
    } finally {
      setDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get category info
  const getCategoryInfo = (category: DocumentCategory) => {
    return DOCUMENT_CATEGORIES[category] || DOCUMENT_CATEGORIES.other;
  };

  // Check if file is viewable
  const isViewable = (mimeType: string): boolean => {
    return mimeType?.startsWith('image/') || mimeType === 'application/pdf';
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="apple-flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl apple-flex-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            <DocumentIconSolid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="apple-title-1 text-gray-900">مستندات الأعضاء</h1>
            <p className="apple-callout text-gray-600">
              عرض وإدارة مستندات أعضاء الصندوق
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="apple-card p-4">
          <div className="apple-flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg apple-flex-center bg-blue-100">
              <DocumentIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="apple-caption-1 text-gray-600">إجمالي المستندات</p>
              <p className="apple-title-2 text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        {Object.entries(DOCUMENT_CATEGORIES).slice(0, 3).map(([key, cat]) => {
          const count = documents.filter(d => d.category === key).length;
          const Icon = cat.icon;
          return (
            <div key={key} className="apple-card p-4">
              <div className="apple-flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg apple-flex-center ${cat.color} bg-opacity-20`}>
                  <Icon className={`w-5 h-5 ${cat.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <p className="apple-caption-1 text-gray-600">{cat.label}</p>
                  <p className="apple-title-2 text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="apple-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالعنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="apple-input pr-10"
            />
          </div>

          {/* Member Search */}
          <div className="relative">
            <UserIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث عن عضو..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              onFocus={() => memberSearchResults.length > 0 && setShowMemberDropdown(true)}
              className="apple-input pr-10"
            />
            {selectedMember && (
              <button
                onClick={clearMemberFilter}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}

            {/* Member Dropdown */}
            {showMemberDropdown && memberSearchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                {memberSearchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="w-full px-4 py-3 text-right hover:bg-gray-50 apple-flex items-center gap-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 apple-flex-center">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="apple-callout text-gray-900">
                        {member.full_name_ar || member.full_name}
                      </p>
                      <p className="apple-caption-2 text-gray-500">
                        {member.membership_id}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <FunnelIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | '')}
              className="apple-input pr-10 appearance-none"
            >
              <option value="">جميع الفئات</option>
              {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchDocuments(currentPage, true)}
            disabled={refreshing}
            className="apple-button apple-button-secondary apple-flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="apple-flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="apple-callout text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="mr-auto">
            <XMarkIcon className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="apple-card p-8">
          <div className="apple-flex-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="apple-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl apple-flex-center mx-auto mb-4 bg-gray-100">
            <DocumentIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="apple-title-3 text-gray-900 mb-2">لا توجد مستندات</h3>
          <p className="apple-callout text-gray-600">
            {selectedMember ? `لا توجد مستندات لهذا العضو` : 'لم يتم رفع أي مستندات بعد'}
          </p>
        </div>
      ) : (
        <>
          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {documents.map((doc) => {
              const categoryInfo = getCategoryInfo(doc.category);
              const CategoryIcon = categoryInfo.icon;

              return (
                <div key={doc.id} className="apple-card p-4 hover:shadow-lg transition-shadow">
                  {/* Document Header */}
                  <div className="apple-flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg apple-flex-center ${categoryInfo.color} text-white`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="apple-callout text-gray-900 font-semibold truncate">
                        {doc.title}
                      </h4>
                      <p className="apple-caption-2 text-gray-500">
                        {categoryInfo.label}
                      </p>
                    </div>
                  </div>

                  {/* Member Info */}
                  {doc.member && (
                    <div className="apple-flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="apple-caption-1 text-gray-700 truncate">
                        {doc.member.full_name_ar || doc.member.full_name}
                      </span>
                      {doc.member.membership_id && (
                        <span className="apple-caption-2 text-gray-500 mr-auto">
                          #{doc.member.membership_id}
                        </span>
                      )}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="apple-flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="apple-flex items-center gap-1">
                      <CalendarDaysIcon className="w-4 h-4" />
                      {formatDate(doc.uploaded_at)}
                    </span>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>

                  {/* Actions */}
                  <div className="apple-flex gap-2">
                    {isViewable(doc.mime_type) && (
                      <button
                        onClick={() => setPreviewDocument(doc)}
                        className="apple-button apple-button-secondary flex-1 !py-2 apple-flex items-center justify-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        عرض
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="apple-button apple-button-secondary flex-1 !py-2 apple-flex items-center justify-center gap-1"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      تحميل
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(doc)}
                      className="apple-button !bg-red-50 !text-red-600 hover:!bg-red-100 !py-2 !px-3"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="apple-flex items-center justify-center gap-2">
              <button
                onClick={() => fetchDocuments(currentPage - 1)}
                disabled={currentPage === 1}
                className="apple-button apple-button-secondary !p-2 disabled:opacity-50"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <div className="apple-flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchDocuments(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchDocuments(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="apple-button apple-button-secondary !p-2 disabled:opacity-50"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 apple-flex-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="apple-flex-between items-center p-4 border-b border-gray-200">
              <div className="apple-flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg apple-flex-center ${getCategoryInfo(previewDocument.category).color} text-white`}>
                  {React.createElement(getCategoryInfo(previewDocument.category).icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="apple-title-3 text-gray-900">{previewDocument.title}</h3>
                  <p className="apple-caption-2 text-gray-500">
                    {getCategoryInfo(previewDocument.category).label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="apple-button apple-button-secondary !min-h-10 !px-3"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              {previewDocument.mime_type?.startsWith('image/') ? (
                <img
                  src={previewDocument.file_url}
                  alt={previewDocument.title}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              ) : previewDocument.mime_type === 'application/pdf' ? (
                <iframe
                  src={previewDocument.file_url}
                  className="w-full h-[70vh] rounded-lg border"
                  title={previewDocument.title}
                />
              ) : (
                <div className="text-center py-12">
                  <DocumentIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="apple-callout text-gray-600">لا يمكن عرض هذا الملف</p>
                  <button
                    onClick={() => handleDownload(previewDocument)}
                    className="apple-button apple-button-primary mt-4"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 ml-2" />
                    تحميل الملف
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="apple-flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => handleDownload(previewDocument)}
                className="apple-button apple-button-primary apple-flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                تحميل
              </button>
              <button
                onClick={() => setPreviewDocument(null)}
                className="apple-button apple-button-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 apple-flex-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl apple-animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full apple-flex-center mx-auto mb-4 bg-red-100">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="apple-title-2 text-gray-900 mb-2">حذف المستند</h3>
              <p className="apple-callout text-gray-600 mb-6">
                هل أنت متأكد من حذف "{deleteConfirm.title}"؟
                <br />
                <span className="text-red-500">لا يمكن التراجع عن هذا الإجراء.</span>
              </p>

              <div className="apple-flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="apple-button apple-button-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="apple-button !bg-red-500 !text-white hover:!bg-red-600 flex-1 apple-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-4 h-4" />
                      <span>حذف</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(MemberDocuments);
