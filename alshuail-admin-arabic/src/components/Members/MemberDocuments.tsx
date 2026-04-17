import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  DocumentIcon,
  DocumentTextIcon,
  IdentificationIcon,
  AcademicCapIcon,
  HeartIcon,
  FolderIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  BanknotesIcon,
  HomeModernIcon
} from '@heroicons/react/24/outline';
import { DocumentIcon as DocumentIconSolid } from '@heroicons/react/24/solid';
import { memberService } from '../../services/memberService';
import { logger } from '../../utils/logger';

// Document category type (keeps the legacy 'identity' key for back-compat
// even though the backend uses 'national_id' now).
type DocumentCategory =
  | 'receipts'
  | 'national_id'
  | 'identity'
  | 'passport'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'property_deed'
  | 'death_certificate'
  | 'driver_license'
  | 'education'
  | 'medical'
  | 'other';

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

// Category configuration — order here determines display order inside each
// member folder. Receipts first since they're the most common operational doc.
const DOCUMENT_CATEGORIES: Record<DocumentCategory, { label: string; icon: React.ComponentType<any>; tint: string; accent: string }> = {
  receipts:             { label: 'إيصالات الدفع',     icon: BanknotesIcon,      tint: '#EEF2FF', accent: '#6366F1' },
  national_id:          { label: 'الهوية الوطنية',     icon: IdentificationIcon, tint: '#E0F2FE', accent: '#0284C7' },
  identity:             { label: 'بطاقة الهوية',       icon: IdentificationIcon, tint: '#E0F2FE', accent: '#0284C7' },
  passport:             { label: 'جواز السفر',         icon: DocumentTextIcon,   tint: '#DCFCE7', accent: '#16A34A' },
  birth_certificate:    { label: 'شهادة الميلاد',      icon: DocumentIcon,       tint: '#F3E8FF', accent: '#9333EA' },
  marriage_certificate: { label: 'عقد الزواج',         icon: HeartIcon,          tint: '#FCE7F3', accent: '#DB2777' },
  property_deed:        { label: 'صك الملكية',         icon: HomeModernIcon,     tint: '#FEF3C7', accent: '#D97706' },
  death_certificate:    { label: 'شهادة الوفاة',       icon: DocumentIcon,       tint: '#E5E7EB', accent: '#4B5563' },
  driver_license:       { label: 'رخصة القيادة',       icon: IdentificationIcon, tint: '#DBEAFE', accent: '#2563EB' },
  education:            { label: 'الشهادات التعليمية', icon: AcademicCapIcon,    tint: '#FEF3C7', accent: '#D97706' },
  medical:              { label: 'التقارير الطبية',   icon: HeartIcon,          tint: '#FEE2E2', accent: '#DC2626' },
  other:                { label: 'أخرى',               icon: FolderIcon,         tint: '#F3F4F6', accent: '#6B7280' }
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

  // Tree view state — which member folders and (member,category) subfolders
  // are expanded. Collapsed by default because there can be hundreds of members.
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(() => new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());

  const toggleMember = useCallback((memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Group documents into a tree: member → category → files
  const groupedTree = useMemo(() => {
    type Group = {
      memberId: string;
      memberLabel: string;
      membershipId?: string;
      categories: Record<string, MemberDocument[]>;
      totalFiles: number;
    };
    const groups: Record<string, Group> = {};
    for (const doc of documents) {
      const mid = doc.member_id || '__unassigned__';
      const label = doc.member?.full_name_ar || doc.member?.full_name || 'بدون عضو';
      if (!groups[mid]) {
        groups[mid] = {
          memberId: mid,
          memberLabel: label,
          membershipId: doc.member?.membership_id,
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
    return Object.values(groups).sort((a, b) =>
      a.memberLabel.localeCompare(b.memberLabel, 'ar')
    );
  }, [documents]);

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

  // Light-mode inline styles — bypasses any dark-mode leak from the
  // apple-design-system CSS so this page always renders clean & bright.
  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F5F5F7', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Arabic", sans-serif' };
  const card: React.CSSProperties = { background: '#FFFFFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const input: React.CSSProperties = { width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#FFFFFF', color: '#1C1C1E', fontSize: 14, outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={wrap} dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 16px rgba(99,102,241,0.35)' }}>
          <DocumentIconSolid style={{ width: 26, height: 26 }} />
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', margin: 0, letterSpacing: '-0.02em' }}>مستندات الأعضاء</h1>
          <p style={{ fontSize: 15, color: '#6B6B70', margin: '4px 0 0' }}>تنظيم شجري — عضو ← فئة ← ملفات</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'إجمالي المستندات', value: totalCount, tint: '#EEF2FF', accent: '#6366F1', icon: DocumentIcon },
          { label: 'إيصالات الدفع', value: documents.filter(d => d.category === 'receipts').length, tint: DOCUMENT_CATEGORIES.receipts.tint, accent: DOCUMENT_CATEGORIES.receipts.accent, icon: BanknotesIcon },
          { label: 'الهوية الوطنية', value: documents.filter(d => d.category === 'national_id' || d.category === 'identity').length, tint: DOCUMENT_CATEGORIES.national_id.tint, accent: DOCUMENT_CATEGORIES.national_id.accent, icon: IdentificationIcon },
          { label: 'أعضاء لديهم مستندات', value: groupedTree.length, tint: '#F0FDF4', accent: '#16A34A', icon: UserCircleIcon },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.tint, color: s.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#6B6B70' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.01em' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: 12, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlassIcon style={{ width: 18, height: 18, color: '#9CA3AF', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="بحث بالعنوان..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={input} />
        </div>
        <div style={{ position: 'relative' }}>
          <UserIcon style={{ width: 18, height: 18, color: '#9CA3AF', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="بحث عن عضو..." value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} onFocus={() => memberSearchResults.length > 0 && setShowMemberDropdown(true)} style={input} />
          {selectedMember && (
            <button onClick={clearMemberFilter} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </button>
          )}
          {showMemberDropdown && memberSearchResults.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 20, width: '100%', marginTop: 4, background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB', maxHeight: 240, overflowY: 'auto' }}>
              {memberSearchResults.map((m) => (
                <button key={m.id} onClick={() => handleSelectMember(m)} style={{ width: '100%', padding: '10px 14px', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon style={{ width: 14, height: 14, color: '#6B7280' }} /></div>
                  <div>
                    <div style={{ fontSize: 13, color: '#1C1C1E' }}>{m.full_name_ar || m.full_name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{m.membership_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <FunnelIcon style={{ width: 18, height: 18, color: '#9CA3AF', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | '')} style={{ ...input, appearance: 'none' }}>
            <option value="">جميع الفئات</option>
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => (<option key={key} value={key}>{cat.label}</option>))}
          </select>
        </div>
        <button onClick={() => fetchDocuments(currentPage, true)} disabled={refreshing} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7', color: '#1C1C1E', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
          <ArrowPathIcon style={{ width: 18, height: 18, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          تحديث
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ ...card, padding: 14, marginBottom: 16, background: '#FEF2F2', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#DC2626', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#B91C1C', margin: 0, flex: 1 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#F87171' }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}

      {/* Tree: Member → Category → Files */}
      {loading ? (
        <div style={{ ...card, padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : groupedTree.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <DocumentIcon style={{ width: 32, height: 32, color: '#9CA3AF' }} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 4px' }}>لا توجد مستندات</h3>
          <p style={{ fontSize: 14, color: '#6B6B70', margin: 0 }}>
            {selectedMember ? 'لا توجد مستندات لهذا العضو' : 'لم يتم رفع أي مستندات بعد'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupedTree.map((group) => {
            const isOpen = expandedMembers.has(group.memberId);
            return (
              <div key={group.memberId} style={{ ...card, overflow: 'hidden' }}>
                {/* Member folder row */}
                <button
                  onClick={() => toggleMember(group.memberId)}
                  style={{ width: '100%', padding: '14px 18px', background: isOpen ? '#F5F3FF' : '#FFFFFF', border: 'none', borderBottom: isOpen ? '1px solid #EDE9FE' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right', fontFamily: 'inherit', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 24, display: 'flex', justifyContent: 'center', color: '#6B6B70' }}>
                    {isOpen ? <ChevronDownIcon style={{ width: 16, height: 16 }} /> : <ChevronLeftIcon style={{ width: 16, height: 16 }} />}
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isOpen ? <FolderOpenIcon style={{ width: 20, height: 20 }} /> : <FolderIcon style={{ width: 20, height: 20 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{group.memberLabel}</div>
                    {group.membershipId && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{group.membershipId}</div>}
                  </div>
                  <div style={{ background: '#6366F1', color: '#FFFFFF', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 10, minWidth: 28, textAlign: 'center' }}>
                    {group.totalFiles}
                  </div>
                </button>

                {/* Categories (subfolders) */}
                {isOpen && (
                  <div style={{ padding: '10px 18px 18px', background: '#FAFAFA' }}>
                    {Object.entries(group.categories)
                      .sort((a, b) => Object.keys(DOCUMENT_CATEGORIES).indexOf(a[0]) - Object.keys(DOCUMENT_CATEGORIES).indexOf(b[0]))
                      .map(([cat, docs]) => {
                        const key = `${group.memberId}::${cat}`;
                        const catOpen = expandedCategories.has(key);
                        const info = getCategoryInfo(cat as DocumentCategory);
                        const CatIcon = info.icon;
                        return (
                          <div key={key} style={{ marginTop: 8, background: '#FFFFFF', borderRadius: 12, border: '1px solid #F0F0F3', overflow: 'hidden' }}>
                            <button
                              onClick={() => toggleCategory(key)}
                              style={{ width: '100%', padding: '10px 14px', background: catOpen ? info.tint : '#FFFFFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right', fontFamily: 'inherit' }}
                            >
                              <div style={{ width: 20, color: '#6B6B70', display: 'flex', justifyContent: 'center' }}>
                                {catOpen ? <ChevronDownIcon style={{ width: 14, height: 14 }} /> : <ChevronLeftIcon style={{ width: 14, height: 14 }} />}
                              </div>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: info.tint, color: info.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CatIcon style={{ width: 18, height: 18 }} />
                              </div>
                              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>{info.label}</div>
                              <div style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8 }}>{docs.length}</div>
                            </button>

                            {/* Files */}
                            {catOpen && (
                              <div style={{ padding: '6px 14px 12px' }}>
                                {docs.map((doc) => (
                                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: info.tint, color: info.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <DocumentIcon style={{ width: 16, height: 16 }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                        {formatDate(doc.uploaded_at)} · {formatFileSize(doc.file_size)}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      {isViewable(doc.mime_type) && (
                                        <button onClick={() => setPreviewDocument(doc)} title="عرض" style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <EyeIcon style={{ width: 16, height: 16 }} />
                                        </button>
                                      )}
                                      <button onClick={() => handleDownload(doc)} title="تحميل" style={{ width: 34, height: 34, borderRadius: 8, background: '#F0FDF4', color: '#16A34A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                                      </button>
                                      <button onClick={() => setDeleteConfirm(doc)} title="حذف" style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TrashIcon style={{ width: 16, height: 16 }} />
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

      {/* Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 apple-flex-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="apple-flex-between items-center p-4 border-b border-gray-200">
              <div className="apple-flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg apple-flex-center"
                  style={{
                    background: getCategoryInfo(previewDocument.category).tint,
                    color: getCategoryInfo(previewDocument.category).accent
                  }}
                >
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
