// Approval Queue Component - File 06 Integration
import React, { memo,  useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  IdentificationIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { approvalService } from '../../services/approval.service';
import { validateGCCPhone, formatPhoneNumber } from '../../utils/validators';
import { REGISTRATION_STATUS, STATUS_NAMES_AR } from '../../utils/constants';

import { logger } from '../../utils/logger';

const ApprovalQueue = () => {
  const [pendingMembers, setPendingMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMember, setExpandedMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsRes, statsRes] = await Promise.all([
        approvalService.getPendingApprovals(),
        approvalService.getApprovalStats()
      ]);
      setPendingMembers(approvalsRes.data || []);
      setStats(statsRes.data);
      setError('');
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
      logger.error('Load error:', { err });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId) => {
    try {
      setActionLoading(memberId);
      await approvalService.approveMember(memberId, approvalNotes);
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
      setApprovalNotes('');
      alert('تمت الموافقة على العضو بنجاح');
      loadData(); // Reload stats
    } catch (err) {
      alert(err.message || 'فشل في الموافقة على العضو');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (memberId) => {
    if (!rejectReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }
    try {
      setActionLoading(memberId);
      await approvalService.rejectMember(memberId, rejectReason);
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
      setRejectReason('');
      alert('تم رفض العضو');
      loadData(); // Reload stats
    } catch (err) {
      alert(err.message || 'فشل في رفض العضو');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedMembers.length === 0) {
      alert('يرجى اختيار أعضاء للموافقة');
      return;
    }
    try {
      setLoading(true);
      await approvalService.bulkApproveMem(selectedMembers, approvalNotes);
      setSelectedMembers([]);
      setApprovalNotes('');
      alert(`تمت الموافقة على ${selectedMembers.length} عضو`);
      loadData();
    } catch (err) {
      alert(err.message || 'فشل في الموافقة الجماعية');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedMembers.length === 0) {
      alert('يرجى اختيار أعضاء للرفض');
      return;
    }
    if (!rejectReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }
    try {
      setLoading(true);
      await approvalService.bulkRejectMembers(selectedMembers, rejectReason);
      setSelectedMembers([]);
      setRejectReason('');
      alert(`تم رفض ${selectedMembers.length} عضو`);
      loadData();
    } catch (err) {
      alert(err.message || 'فشل في الرفض الجماعي');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredMembers = pendingMembers.filter(member =>
    member.full_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone?.includes(searchQuery) ||
    member.national_id?.includes(searchQuery)
  );

  if (loading && pendingMembers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">قائمة انتظار الموافقات</h1>
        <p className="text-gray-600">مراجعة والموافقة على طلبات التسجيل الجديدة</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">قيد الانتظار</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending_count}</p>
              </div>
              <ClockIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">موافق عليه اليوم</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved_today}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">مرفوض اليوم</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected_today}</p>
              </div>
              <XCircleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">متوسط وقت الانتظار</p>
                <p className="text-2xl font-bold text-blue-700">{Math.round(stats.total_pending_time_avg)} يوم</p>
              </div>
              <ClockIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Bulk Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، رقم الهاتف، أو رقم الهوية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {selectedMembers.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                موافقة جماعية ({selectedMembers.length})
              </button>
              <button
                onClick={handleBulkReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                رفض جماعي ({selectedMembers.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Members List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد طلبات قيد الانتظار</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelection(member.id)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{member.full_name_ar}</h3>
                      {member.full_name_en && (
                        <p className="text-sm text-gray-500" dir="ltr">{member.full_name_en}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-4 w-4" />
                          {formatPhoneNumber(member.phone)}
                        </span>
                        {member.national_id && (
                          <span className="flex items-center gap-1">
                            <IdentificationIcon className="h-4 w-4" />
                            {member.national_id}
                          </span>
                        )}
                        {member.family_branches && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {member.family_branches.branch_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {expandedMember === member.id ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>

                {expandedMember === member.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">تاريخ التسجيل</label>
                        <p className="text-sm font-medium">{new Date(member.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">الحالة</label>
                        <p className="text-sm font-medium">{STATUS_NAMES_AR[member.registration_status]}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ملاحظات الموافقة (اختياري)
                        </label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows="2"
                          placeholder="أضف ملاحظات عن الموافقة..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          سبب الرفض (مطلوب للرفض)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          rows="2"
                          placeholder="أدخل سبب رفض الطلب..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(member.id)}
                          disabled={actionLoading === member.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          {actionLoading === member.id ? 'جاري الموافقة...' : 'الموافقة على العضو'}
                        </button>
                        <button
                          onClick={() => handleReject(member.id)}
                          disabled={actionLoading === member.id || !rejectReason.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircleIcon className="h-5 w-5" />
                          {actionLoading === member.id ? 'جاري الرفض...' : 'رفض العضو'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(ApprovalQueue);
