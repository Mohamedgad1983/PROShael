import React, { memo,  useState, useEffect, useMemo, useCallback } from 'react';
// Optimized imports - only what's actually used
import {
  HandRaisedIcon,
  ScaleIcon,
  UsersIcon,
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { HijriDateDisplay } from '../Common/HijriDateDisplay';
import { HijriDateInput } from '../Common/HijriDateInput';
import { isOverdue, getDaysUntil } from '../../utils/hijriDateUtils';
import { logger } from '../../utils/logger';
import { API_BASE_URL } from '../../utils/apiConfig';

import '../../styles/ultra-premium-islamic-design.css';

// ========================================
// Helper Functions (Moved Outside Component for Performance)
// ========================================

const getStatusInfo = (status: string) => {
  const statuses: Record<string, any> = {
    active: { label: 'نشطة', color: '#007AFF', icon: CheckCircleIcon, bgColor: 'bg-blue-100' },
    completed: { label: 'مكتملة', color: '#30D158', icon: CheckCircleIcon, bgColor: 'bg-green-100' },
    urgent: { label: 'عاجلة', color: '#FF3B30', icon: ExclamationTriangleIcon, bgColor: 'bg-red-100' },
    pending: { label: 'معلقة', color: '#FF9500', icon: ClockIcon, bgColor: 'bg-orange-100' },
    transferred_to_expense: { label: 'منقولة للمصروفات', color: '#8E8E93', icon: CheckCircleIcon, bgColor: 'bg-gray-100' }
  };
  return statuses[status] || statuses.active;
};

const getPriorityInfo = (priority: string) => {
  const priorities: Record<string, any> = {
    high: { label: 'عالية', color: '#FF3B30' },
    medium: { label: 'متوسطة', color: '#FF9500' },
    low: { label: 'منخفضة', color: '#8E8E93' }
  };
  return priorities[priority] || priorities.medium;
};

const getCategoryInfo = (category: string) => {
  const categories: Record<string, any> = {
    accident: { label: 'حادث', icon: ShieldExclamationIcon, gradient: 'from-red-500 to-orange-500' },
    medical: { label: 'طبي', icon: HandRaisedIcon, gradient: 'from-blue-500 to-cyan-500' },
    dispute: { label: 'خلاف', icon: ScaleIcon, gradient: 'from-purple-500 to-pink-500' },
    other: { label: 'أخرى', icon: DocumentTextIcon, gradient: 'from-gray-500 to-gray-600' }
  };
  return categories[category] || categories.other;
};

interface Diya {
  id: number;
  caseNumber: string;
  title: string;
  description: string;
  totalAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  status: 'active' | 'completed' | 'urgent' | 'pending';
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  deadline: string;
  contributorsCount: number;
  beneficiary: string;
  createdBy: string;
  category: 'accident' | 'medical' | 'dispute' | 'other';
  documents: string[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface Payment {
  id: number;
  contributorName: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank' | 'online';
  receiptNumber?: string;
}

interface Contributor {
  member_id: string;
  member_name: string;
  membership_number: string;
  tribal_section: string;
  amount: number;
  contribution_date: string;
  payment_method: string;
}

const HijriDiyasManagement: React.FC = () => {
  const [diyas, setDiyas] = useState<Diya[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDiya, setSelectedDiya] = useState<Diya | null>(null);
  const [fromHijriDate, setFromHijriDate] = useState('');
  const [fromGregorianDate, setFromGregorianDate] = useState('');
  const [toHijriDate, setToHijriDate] = useState('');
  const [toGregorianDate, setToGregorianDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsPage, setContributorsPage] = useState(1);
  const [contributorsTotalPages, setContributorsTotalPages] = useState(1);
  const [contributorsTotal, setContributorsTotal] = useState(0);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [contributorsPerPage, setContributorsPerPage] = useState(20);
  const [contributorSearchTerm, setContributorSearchTerm] = useState('');

  // Fetch real Diyas data from database
  const fetchDiyas = async () => {
    setLoading(true);
    try {
      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/diyas`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch diyas');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Transform activities table data to match component interface
        const transformedDiyas = result.data.map((diya: any) => ({
          id: diya.id,
          caseNumber: diya.case_number || `DY-${diya.id.slice(0, 8)}`,
          title: diya.title_ar || diya.title_en || 'دية',
          description: diya.description_ar || diya.description_en || '',
          totalAmount: Number(diya.target_amount) || 0,
          collectedAmount: Number(diya.current_amount) || 0,
          remainingAmount: (Number(diya.target_amount) || 0) - (Number(diya.current_amount) || 0),
          status: diya.status === 'completed' ? 'completed' : diya.status === 'active' ? 'active' : 'pending',
          priority: diya.urgency_level >= 4 ? 'high' : diya.urgency_level >= 2 ? 'medium' : 'low',
          startDate: diya.collection_start_date || diya.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          deadline: diya.collection_deadline || diya.collection_end_date || diya.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          contributorsCount: diya.contributor_count || diya.contribution_count || diya.financial_contributions?.length || 0,
          beneficiary: diya.beneficiary_name_ar || diya.beneficiary_name_en || 'غير محدد',
          createdBy: 'الإدارة',
          category: 'other',
          documents: [],
          payments: (diya.financial_contributions || []).slice(0, 10).map((contrib: any) => ({
            id: contrib.id,
            contributorName: contrib.contributor_name || 'عضو',
            amount: Number(contrib.contribution_amount) || 0,
            date: contrib.contribution_date || contrib.created_at,
            paymentMethod: contrib.payment_method || 'cash',
            receiptNumber: contrib.payment_reference
          })),
          createdAt: diya.created_at,
          updatedAt: diya.updated_at,
          notes: diya.internal_notes || diya.public_notes_ar || ''
        }));

        setDiyas(transformedDiyas);
        logger.debug(`✅ Loaded ${transformedDiyas.length} real Diyas from database with ${transformedDiyas.reduce((sum: number, d: Diya) => sum + d.contributorsCount, 0)} total contributors`);
      }
    } catch (error) {
      logger.error('Error fetching diyas:', { error });
      // Keep empty array on error
      setDiyas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiyas();
  }, []);

  // Fetch contributors for a specific diya with server-side pagination
  const fetchContributors = useCallback(async (diyaId: number | string, page: number = 1, limit: number = contributorsPerPage) => {
    try {
      setContributorsLoading(true);
      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/diya/${diyaId}/contributors?page=${page}&limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setContributors(result.data);
        setContributorsPage(page);
        setContributorsTotalPages(result.pagination?.totalPages || 1);
        setContributorsTotal(result.pagination?.total || result.data.length);

        // Only open modal on first fetch
        if (page === 1) {
          setShowContributorsModal(true);
        }
      }
    } catch (error) {
      logger.error('Error fetching contributors:', { error });
    } finally {
      setContributorsLoading(false);
    }
  }, [contributorsPerPage]);

  // Handle viewing contributors (memoized)
  const [transferringId, setTransferringId] = useState<number | null>(null);

  const handleTransferToExpense = useCallback(async (diya: Diya) => {
    if (!window.confirm(`هل أنت متأكد من نقل الدية "${diya.title}" بمبلغ ${diya.totalAmount?.toLocaleString('en-US')} ريال إلى المصروفات؟\n\nسيتم خصم المبلغ من رصيد الصندوق.`)) {
      return;
    }
    setTransferringId(diya.id);
    try {
      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/diyas/${diya.id}/transfer-to-expense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes: 'تم النقل من واجهة إدارة الديات' })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        // Refresh diyas list
        fetchDiyas();
      } else {
        alert(`❌ ${data.error || 'فشل في نقل الدية'}`);
      }
    } catch (error) {
      logger.error('Error transferring diya:', { error });
      alert('❌ حدث خطأ أثناء نقل الدية');
    } finally {
      setTransferringId(null);
    }
  }, []);

  const handleBulkTransfer = useCallback(async () => {
    const activeIds = diyas.filter(d => (d.status as string) !== 'transferred_to_expense' && d.status !== 'completed').map(d => d.id);
    if (activeIds.length === 0) {
      alert('لا توجد ديات قابلة للنقل');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من نقل جميع الديات الداخلية (${activeIds.length} دية) إلى المصروفات؟`)) {
      return;
    }
    try {
      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/diyas/bulk-transfer-to-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ diya_ids: activeIds, notes: 'نقل جماعي من واجهة الإدارة' })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchDiyas();
      } else {
        alert(`❌ ${data.error || 'فشل في النقل'}`);
      }
    } catch (error) {
      logger.error('Error bulk transferring diyas:', { error });
      alert('❌ حدث خطأ أثناء النقل الجماعي');
    }
  }, [diyas]);

  const handleViewContributors = useCallback((diya: Diya) => {
    setSelectedDiya(diya);
    fetchContributors(diya.id, 1);
  }, [fetchContributors]);

  // Handle page change in contributors modal
  const handleContributorsPageChange = useCallback((newPage: number) => {
    if (selectedDiya) {
      fetchContributors(selectedDiya.id, newPage, contributorsPerPage);
    }
  }, [selectedDiya, contributorsPerPage, fetchContributors]);

  // Fetch ALL contributors for export
  const fetchAllContributorsForExport = async (diyaId: number | string) => {
    try {
      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/diya/${diyaId}/contributors/all`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      logger.error('Error fetching all contributors:', { error });
      return [];
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!selectedDiya) return;

    const allContribs = await fetchAllContributorsForExport(selectedDiya.id);

    const doc = new jsPDF();

    // Add header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Shuail Al-Anzi Fund', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(selectedDiya.title, 105, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Total Contributors: ${allContribs.length} | Amount: ${selectedDiya.collectedAmount.toLocaleString('en-US')} SAR`, 105, 40, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 105, 48, { align: 'center' });

    // Add table
    (doc as any).autoTable({
      startY: 55,
      head: [['ID', 'Name', 'Section', 'Amount', 'Date']],
      body: allContribs.map((c: Contributor) => [
        c.membership_number,
        c.member_name,
        c.tribal_section || '-',
        c.amount.toLocaleString('en-US'),
        new Date(c.contribution_date).toLocaleDateString('en-GB')
      ]),
      styles: { fontSize: 8, font: 'Helvetica' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }
    });

    doc.save(`contributors-${selectedDiya.title}.pdf`);
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    if (!selectedDiya) return;

    const allContribs = await fetchAllContributorsForExport(selectedDiya.id);

    const data = [
      ['صندوق شعيل العنزي'],
      [`قائمة مساهمي ${selectedDiya.title}`],
      [`إجمالي المساهمين: ${allContribs.length} | المبلغ: ${selectedDiya.collectedAmount.toLocaleString('en-US')} ريال`],
      [`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`],
      [],
      ['المسلسل', 'الاسم', 'الفخذ', 'المبلغ', 'التاريخ'],
      ...allContribs.map((c: Contributor) => [
        c.membership_number,
        c.member_name,
        c.tribal_section || '-',
        c.amount,
        new Date(c.contribution_date).toLocaleDateString('ar-SA')
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المساهمون');
    XLSX.writeFile(wb, `مساهمو-${selectedDiya.title}.xlsx`);
  };

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newLimit: number) => {
    setContributorsPerPage(newLimit);
    if (selectedDiya) {
      fetchContributors(selectedDiya.id, 1, newLimit);
    }
  }, [selectedDiya, fetchContributors]);

  // Filter contributors by search term
  const filteredContributors = useMemo(() => {
    if (!contributorSearchTerm) return contributors;
    const term = contributorSearchTerm.toLowerCase();
    return contributors.filter(c =>
      c.member_name.toLowerCase().includes(term) ||
      c.membership_number.includes(term)
    );
  }, [contributors, contributorSearchTerm]);

  // Add Diya Modal
  const AddDiyaModal: React.FC = () => {
    const [diyaData, setDiyaData] = useState({
      title: '',
      description: '',
      totalAmount: 0,
      beneficiary: '',
      category: 'accident',
      priority: 'medium',
      startDate: '',
      deadline: '',
      notes: '',
      // Hijri date fields
      startDay: '',
      startMonth: '',
      startYear: '1446',
      deadlineDay: '',
      deadlineMonth: '',
      deadlineYear: '1446'
    });

    // Hijri months
    const hijriMonths = [
      { value: '01', label: 'محرم' },
      { value: '02', label: 'صفر' },
      { value: '03', label: 'ربيع الأول' },
      { value: '04', label: 'ربيع الآخر' },
      { value: '05', label: 'جمادى الأولى' },
      { value: '06', label: 'جمادى الآخرة' },
      { value: '07', label: 'رجب' },
      { value: '08', label: 'شعبان' },
      { value: '09', label: 'رمضان' },
      { value: '10', label: 'شوال' },
      { value: '11', label: 'ذو القعدة' },
      { value: '12', label: 'ذو الحجة' }
    ];

    // Generate days (1-30)
    const days = Array.from({ length: 30 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: String(i + 1)
    }));

    // Generate years (1445-1450)
    const years = Array.from({ length: 6 }, (_, i) => ({
      value: String(1445 + i),
      label: String(1445 + i)
    }));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)}>
        <div className="absolute inset-0 m-1 bg-white rounded-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header - Full Screen */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">إضافة حالة دية جديدة</h2>
            </div>
            <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-red-100">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </button>
          </div>

          {/* Form - Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <form>
              <div className="grid grid-cols-12 gap-3">
              {/* Row 1: Title + Category + Priority + Amount */}
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>عنوان الحالة *</label>
                <input type="text" value={diyaData.title} onChange={(e) => setDiyaData({ ...diyaData, title: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="دية حادث سير" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الفئة *</label>
                <select value={diyaData.category} onChange={(e) => setDiyaData({ ...diyaData, category: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300">
                  <option value="accident">حادث</option>
                  <option value="medical">طبي</option>
                  <option value="dispute">خلاف</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الأولوية *</label>
                <select value={diyaData.priority} onChange={(e) => setDiyaData({ ...diyaData, priority: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300">
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>المبلغ *</label>
                <input type="number" value={diyaData.totalAmount} onChange={(e) => setDiyaData({ ...diyaData, totalAmount: parseInt(e.target.value) })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" min="0" required />
              </div>

              {/* Row 2: Beneficiary + Start Date + Deadline Date */}
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>المستفيد *</label>
                <input type="text" value={diyaData.beneficiary} onChange={(e) => setDiyaData({ ...diyaData, beneficiary: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="اسم العائلة" required />
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>تاريخ البداية (هجري) *</label>
                <div className="grid grid-cols-3 gap-1">
                  <select value={diyaData.startDay} onChange={(e) => setDiyaData({ ...diyaData, startDay: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">يوم</option>
                    {days.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                  <select value={diyaData.startMonth} onChange={(e) => setDiyaData({ ...diyaData, startMonth: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">شهر</option>
                    {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={diyaData.startYear} onChange={(e) => setDiyaData({ ...diyaData, startYear: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">سنة</option>
                    {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الموعد النهائي (هجري) *</label>
                <div className="grid grid-cols-3 gap-1">
                  <select value={diyaData.deadlineDay} onChange={(e) => setDiyaData({ ...diyaData, deadlineDay: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">يوم</option>
                    {days.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                  <select value={diyaData.deadlineMonth} onChange={(e) => setDiyaData({ ...diyaData, deadlineMonth: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">شهر</option>
                    {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={diyaData.deadlineYear} onChange={(e) => setDiyaData({ ...diyaData, deadlineYear: e.target.value })} style={{ padding: '4px', fontSize: '13px', height: '32px' }} className="rounded-lg border border-gray-300" required>
                    <option value="">سنة</option>
                    {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Description + Notes */}
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>الوصف *</label>
                <input type="text" value={diyaData.description} onChange={(e) => setDiyaData({ ...diyaData, description: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="تفاصيل الحالة" required />
              </div>
              <div className="col-span-6">
                <label className="block text-xs text-gray-700" style={{ marginBottom: '2px' }}>ملاحظات</label>
                <input type="text" value={diyaData.notes} onChange={(e) => setDiyaData({ ...diyaData, notes: e.target.value })} style={{ padding: '4px 8px', fontSize: '13px', height: '32px' }} className="w-full rounded-lg border border-gray-300" placeholder="ملاحظات" />
              </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 text-sm btn-gradient-premium" onClick={(e) => { e.preventDefault(); logger.debug('Diya Data:', { diyaData }); setShowAddModal(false); }}>
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Hijri date filtering logic (using Gregorian conversion for comparison)
  const filterDiyasByHijriDate = (diyasToFilter: Diya[]) => {
    if (!fromGregorianDate && !toGregorianDate) return diyasToFilter;

    return diyasToFilter.filter(diya => {
      if (!diya.startDate && !diya.createdAt) return false;

      // Compare with Gregorian dates (database format)
      const itemDateStr = (diya.startDate || diya.createdAt).split('T')[0];

      // Check if within range
      if (fromGregorianDate && itemDateStr < fromGregorianDate) return false;
      if (toGregorianDate && itemDateStr > toGregorianDate) return false;
      return true;
    });
  };

  // Clear date filters
  const clearDateFilters = () => {
    setFromHijriDate('');
    setFromGregorianDate('');
    setToHijriDate('');
    setToGregorianDate('');
  };

  // Apply filtering (memoized)
  const filteredDiyas = useMemo(() => filterDiyasByHijriDate(diyas), [diyas, fromGregorianDate, toGregorianDate]);

  // Calculate statistics (memoized to prevent recalculation on every render)
  const statistics = useMemo(() => ({
    totalDiyas: filteredDiyas.length,
    activeDiyas: filteredDiyas.filter(d => d.status === 'active' || d.status === 'urgent').length,
    totalAmountNeeded: filteredDiyas.reduce((sum, d) => sum + d.totalAmount, 0),
    totalCollected: filteredDiyas.reduce((sum, d) => sum + d.collectedAmount, 0),
    totalRemaining: filteredDiyas.reduce((sum, d) => sum + d.remainingAmount, 0)
  }), [filteredDiyas]);

  // Diya Card Component (Memoized for Performance)
  const DiyaCard = React.memo<{ diya: Diya }>(({ diya }) => {
    const statusInfo = getStatusInfo(diya.status);
    const priorityInfo = getPriorityInfo(diya.priority);
    const categoryInfo = getCategoryInfo(diya.category);
    const CategoryIcon = categoryInfo.icon;
    const StatusIcon = statusInfo.icon;

    const progressPercentage = (diya.collectedAmount / diya.totalAmount) * 100;
    const daysLeft = getDaysUntil(diya.deadline);
    const isUrgent = diya.status === 'urgent' || daysLeft < 7;

    return (
      <div className={`glass-card-premium ${isUrgent ? 'border-red-300' : ''}`} style={{ padding: '24px', marginBottom: '16px' }}>
        {/* Urgent Badge */}
        {isUrgent && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
              عاجل
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-r ${categoryInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <CategoryIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{diya.title}</h3>
              <p className="text-sm text-gray-600">رقم الحالة: {diya.caseNumber}</p>
              <p className="text-xs text-gray-500 mt-1">{diya.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor}`}
                  style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <span className="text-xs font-medium" style={{ color: priorityInfo.color }}>
              أولوية {priorityInfo.label}
            </span>
          </div>
        </div>

        {/* Dates with Hijri */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">تاريخ البداية:</span>
              <HijriDateDisplay
                date={diya.startDate}
                format="medium"
                showIcon={false}
                showBoth={true}
                style={{ padding: '2px 4px', fontSize: '12px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">الموعد النهائي:</span>
              <HijriDateDisplay
                date={diya.deadline}
                format="medium"
                showIcon={false}
                showBoth={true}
                highlightToday={isOverdue(diya.deadline)}
                style={{
                  padding: '2px 4px',
                  fontSize: '12px',
                  borderColor: isOverdue(diya.deadline) ? 'rgba(255, 59, 48, 0.3)' : undefined
                }}
              />
              {daysLeft > 0 ? (
                <span className="text-xs font-medium text-green-600">({daysLeft} يوم متبقي)</span>
              ) : (
                <span className="text-xs font-medium text-red-600">(متأخر {Math.abs(daysLeft)} يوم)</span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">التقدم المالي</span>
            <span className="text-sm font-bold" style={{ color: progressPercentage >= 100 ? '#30D158' : '#007AFF' }}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{
                width: `${Math.min(progressPercentage, 100)}%`,
                background: progressPercentage >= 100
                  ? 'linear-gradient(135deg, #30D158, #34C759)'
                  : 'linear-gradient(135deg, #007AFF, #5856D6)'
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              تم جمع: <span className="font-bold text-green-600">{diya.collectedAmount.toLocaleString('en-US')} ريال</span>
            </span>
            <span className="text-gray-600">
              المتبقي: <span className="font-bold text-orange-600">{diya.remainingAmount.toLocaleString('en-US')} ريال</span>
            </span>
          </div>
        </div>

        {/* Contributors and Beneficiary */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                المساهمون: <span className="font-medium">{diya.contributorsCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                المستفيد: <span className="font-medium">{diya.beneficiary}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {diya.payments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">آخر المساهمات</h4>
            <div className="space-y-2">
              {diya.payments.slice(0, 3).map(payment => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{payment.contributorName}</span>
                    <HijriDateDisplay
                      date={payment.date}
                      format="relative"
                      showIcon={false}
                      showBoth={false}
                      style={{ fontSize: '11px', color: '#6B7280' }}
                    />
                  </div>
                  <span className="font-bold text-green-600">{payment.amount.toLocaleString('en-US')} ريال</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              آخر تحديث: <HijriDateDisplay date={diya.updatedAt} format="relative" showIcon={false} showBoth={false} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewContributors(diya)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="عرض قائمة المساهمين"
            >
              <EyeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
            </button>
            {(diya.status as string) !== 'transferred_to_expense' && (
              <button
                onClick={() => handleTransferToExpense(diya)}
                disabled={transferringId === diya.id}
                className="text-sm px-3 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
                title="نقل إلى المصروفات (دية داخلية)"
              >
                {transferringId === diya.id ? 'جاري النقل...' : '→ نقل للمصروفات'}
              </button>
            )}
            {(diya.status as string) === 'transferred_to_expense' && (
              <span className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700">
                ✅ تم النقل
              </span>
            )}
            <button className="btn-gradient-premium text-sm px-4 py-2">
              <CurrencyDollarIcon className="w-4 h-4 inline ml-1" />
              المساهمة
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Statistics Cards (Memoized)
  const StatCard = React.memo<{
    title: string;
    value: string | number;
    icon: any;
    gradient: string;
    subtitle?: string;
    trend?: string
  }>(({ title, value, icon: Icon, gradient, subtitle, trend }) => (
    <div className="glass-card-premium stat-badge-premium">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg icon-wrapper-gradient"
          style={{ background: `linear-gradient(135deg, ${gradient})` }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.includes('+') ? 'text-green-600' : trend.includes('-') ? 'text-red-600' : 'text-gray-600'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-700">{subtitle}</p>}
      </div>
    </div>
  ));

  // Skeleton Loading Component
  const DiyasSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {/* Statistics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
        ))}
      </div>
      {/* Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-200 h-96 rounded-xl"></div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <DiyasSkeleton />
      </div>
    );
  }

  return (
    <div className="p-3" dir="rtl">
      {/* Compact Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">إدارة الديات</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkTransfer}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors border border-orange-200"
              title="نقل جميع الديات الداخلية إلى المصروفات"
            >
              → نقل الكل للمصروفات
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gradient-premium flex items-center gap-1.5 text-sm px-3 py-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              إضافة
            </button>
          </div>
        </div>

        {/* Hijri Date Filter */}
        <div className="mb-6">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md transition-all duration-200"
          >
            <span className="text-2xl">📅</span>
            <span className="font-medium text-gray-700">تصفية بالتاريخ الهجري</span>
            <span className={`mr-auto transform transition-transform duration-200 ${showDateFilter ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showDateFilter && (
            <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Date - Hijri Input */}
                <HijriDateInput
                  value={fromHijriDate}
                  onChange={(hijri, gregorian) => {
                    setFromHijriDate(hijri);
                    setFromGregorianDate(gregorian);
                  }}
                  label="من تاريخ (هجري)"
                  minYear={1440}
                  maxYear={1450}
                />

                {/* To Date - Hijri Input */}
                <HijriDateInput
                  value={toHijriDate}
                  onChange={(hijri, gregorian) => {
                    setToHijriDate(hijri);
                    setToGregorianDate(gregorian);
                  }}
                  label="إلى تاريخ (هجري)"
                  minYear={1440}
                  maxYear={1450}
                />
              </div>

              {/* Filter Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={clearDateFilters}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all duration-200"
                >
                  مسح الفلاتر
                </button>
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  تطبيق
                </button>
              </div>

              {/* Active Filters Display */}
              {(fromHijriDate || toHijriDate) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="font-semibold text-gray-700">الفلاتر النشطة (تاريخ هجري):</span>
                    {fromHijriDate && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        من: {fromHijriDate} هـ
                      </span>
                    )}
                    {toHijriDate && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                        إلى: {toHijriDate} هـ
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard
          title="إجمالي الحالات"
          value={statistics.totalDiyas}
          icon={ScaleIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="جميع الحالات المسجلة"
        />
        <StatCard
          title="الحالات النشطة"
          value={statistics.activeDiyas}
          icon={HandRaisedIcon}
          gradient="#FF3B30, #FF2D92"
          subtitle="تحتاج إلى دعم"
          trend={statistics.activeDiyas > 0 ? `${statistics.activeDiyas} نشطة` : ''}
        />
        <StatCard
          title="المبلغ المطلوب"
          value={`${statistics.totalAmountNeeded.toLocaleString('en-US')} ريال`}
          icon={BanknotesIcon}
          gradient="#5856D6, #AF52DE"
          subtitle="إجمالي الديات"
        />
        <StatCard
          title="المبلغ المحصل"
          value={`${statistics.totalCollected.toLocaleString('en-US')} ريال`}
          icon={CheckCircleIcon}
          gradient="#30D158, #34C759"
          subtitle={`${((statistics.totalCollected / statistics.totalAmountNeeded) * 100).toFixed(1)}% من الهدف`}
          trend="+25%"
        />
        <StatCard
          title="المبلغ المتبقي"
          value={`${statistics.totalRemaining.toLocaleString('en-US')} ريال`}
          icon={CurrencyDollarIcon}
          gradient="#007AFF, #5AC8FA"
          subtitle="يحتاج إلى جمع"
        />
      </div>

      {/* Compact Search and Filters */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث في الحالات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium w-full pr-10"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشطة</option>
          <option value="urgent">عاجلة</option>
          <option value="completed">مكتملة</option>
          <option value="pending">معلقة</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الأولويات</option>
          <option value="high">عالية</option>
          <option value="medium">متوسطة</option>
          <option value="low">منخفضة</option>
        </select>
      </div>

      {/* Diyas List */}
      <div className="space-y-4">
        {filteredDiyas
          .filter(diya => {
            const matchesSearch = diya.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 diya.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 diya.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = !filterStatus || diya.status === filterStatus;
            const matchesPriority = !filterPriority || diya.priority === filterPriority;
            return matchesSearch && matchesStatus && matchesPriority;
          })
          .map(diya => (
            <DiyaCard key={diya.id} diya={diya} />
          ))}
      </div>

      {/* Add Diya Modal */}
      {showAddModal && <AddDiyaModal />}

      {/* FULL SCREEN Modal - NO CENTERING, NO FOOTER, PAGINATION IN TOOLBAR */}
      {showContributorsModal && selectedDiya && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
          onClick={() => setShowContributorsModal(false)}
        >
          <div
            className="absolute inset-0 m-1 bg-white rounded-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Professional Header with Logo */}
            <div className="px-3 py-2 border-b flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">قائمة المساهمين - {selectedDiya.title}</h2>
                    <p className="text-xs text-gray-600">صندوق شعيل العنزي</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContributorsModal(false)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            {/* Professional Toolbar - Search, Stats, Controls, Pagination */}
            <div className="px-3 py-2 border-b bg-white">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Search */}
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو الرقم..."
                    value={contributorSearchTerm}
                    onChange={(e) => setContributorSearchTerm(e.target.value)}
                    className="w-full px-3 py-1.5 pr-8 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <MagnifyingGlassIcon className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                {/* Center: Statistics */}
                <div className="flex gap-2 text-xs">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded font-bold whitespace-nowrap">الإجمالي: {contributorsTotal}</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded font-bold whitespace-nowrap">المبلغ: {selectedDiya.collectedAmount.toLocaleString('en-US')} ر.س</span>
                  <span className="bg-purple-600 text-white px-2 py-1 rounded font-bold whitespace-nowrap">المتوسط: {contributorsTotal > 0 ? (selectedDiya.collectedAmount / contributorsTotal).toFixed(0) : 0} ر.س</span>
                </div>

                {/* Right: Controls + Pagination */}
                <div className="flex items-center gap-2">
                  <select
                    value={contributorsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                  >
                    <option value={20}>عرض 20</option>
                    <option value={50}>عرض 50</option>
                    <option value={100}>عرض 100</option>
                  </select>

                  {/* Inline Pagination */}
                  {contributorsTotalPages > 1 && !contributorSearchTerm && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleContributorsPageChange(contributorsPage - 1)}
                        disabled={contributorsPage === 1}
                        className="w-6 h-6 flex items-center justify-center text-xs bg-white hover:bg-gray-100 disabled:opacity-30 rounded border"
                      >
                        ‹
                      </button>
                      {Array.from({ length: contributorsTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === contributorsTotalPages || Math.abs(p - contributorsPage) <= 1)
                        .map((pageNum, idx, arr) => (
                          <React.Fragment key={pageNum}>
                            {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span className="text-gray-400 text-xs">...</span>}
                            <button
                              onClick={() => handleContributorsPageChange(pageNum)}
                              className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${
                                pageNum === contributorsPage
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white hover:bg-gray-100 border'
                              }`}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        ))}
                      <button
                        onClick={() => handleContributorsPageChange(contributorsPage + 1)}
                        disabled={contributorsPage >= contributorsTotalPages}
                        className="w-6 h-6 flex items-center justify-center text-xs bg-white hover:bg-gray-100 disabled:opacity-30 rounded border"
                      >
                        ›
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadPDF}
                    className="px-2 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-1"
                  >
                    <ArrowDownTrayIcon className="w-3 h-3" />
                    PDF
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    className="px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium flex items-center gap-1"
                  >
                    <ArrowDownTrayIcon className="w-3 h-3" />
                    Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Table - Uses ALL Remaining Space */}
            <div className="flex-1 overflow-y-auto px-2">
              {contributorsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">جاري التحميل...</p>
                  </div>
                </div>
              ) : filteredContributors.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Sticky Table Header */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white grid grid-cols-5 gap-2 px-3 py-2 text-xs font-bold sticky top-0 z-10">
                    <div className="text-right">المسلسل</div>
                    <div className="text-right">الاسم</div>
                    <div className="text-right">الفخذ</div>
                    <div className="text-right">المبلغ</div>
                    <div className="text-right">التاريخ</div>
                  </div>

                  {/* Table Body - Uses Remaining Space */}
                  <div className="flex-1 bg-white">
                    {filteredContributors.map((contributor, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-gray-100 hover:bg-blue-50 transition-colors items-center"
                      >
                        <div className="text-right text-xs font-medium text-gray-700">{contributor.membership_number}</div>
                        <div className="text-right text-sm font-semibold text-gray-900">{contributor.member_name}</div>
                        <div className="text-right text-xs text-gray-600">{contributor.tribal_section || '-'}</div>
                        <div className="text-right text-sm font-bold text-green-700">{contributor.amount.toLocaleString('en-US')}</div>
                        <div className="text-right text-xs text-gray-500">
                          {new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : contributorSearchTerm ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">لا توجد نتائج للبحث "{contributorSearchTerm}"</p>
                    <button
                      onClick={() => setContributorSearchTerm('')}
                      className="mt-3 px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      مسح البحث
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <DocumentTextIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p>لا توجد مساهمات حالياً</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {diyas.length === 0 && (
        <div className="text-center py-12">
          <HandRaisedIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حالات</h3>
          <p className="text-sm text-gray-600">ابدأ بإضافة أول حالة دية</p>
        </div>
      )}
    </div>
  );
};

export default memo(HijriDiyasManagement);