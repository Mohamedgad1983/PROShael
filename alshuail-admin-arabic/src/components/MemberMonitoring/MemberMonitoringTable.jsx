import React, { memo, useCallback } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const MemberMonitoringTable = memo(({
  members,
  loading,
  sortField,
  sortDirection,
  onSort,
  onViewMemberDetails,
  onContactMember
}) => {
  const handleSort = useCallback((field) => {
    onSort(field);
  }, [onSort]);

  const getStatusIcon = (status) => {
    if (status === 'compliant') {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    } else if (status === 'critical') {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
    }
    return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="empty-state">
        <p>لا توجد بيانات للعرض</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="monitoring-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('memberId')}>
              رقم العضوية
              {sortField === 'memberId' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('fullName')}>
              اسم العضو
              {sortField === 'fullName' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('phone')}>
              رقم الجوال
              {sortField === 'phone' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('tribalSection')}>
              الشعبة
              {sortField === 'tribalSection' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('currentBalance')}>
              الرصيد الحالي
              {sortField === 'currentBalance' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('requiredPayment')}>
              المطلوب
              {sortField === 'requiredPayment' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th onClick={() => handleSort('lastPaymentDate')}>
              آخر دفعة
              {sortField === 'lastPaymentDate' && (
                <span className={`sort-arrow ${sortDirection}`}>
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className={`member-row ${member.statusClass}`}>
              <td>{member.memberId}</td>
              <td className="member-name">{member.fullName}</td>
              <td>{member.phone}</td>
              <td>{member.tribalSection}</td>
              <td className={`balance ${member.currentBalance < 0 ? 'negative' : 'positive'}`}>
                {formatAmount(member.currentBalance)}
              </td>
              <td className="required-payment" style={{ color: member.requiredPayment > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                {formatAmount(member.requiredPayment)}
              </td>
              <td>{member.lastPaymentDate || 'لا توجد'}</td>
              <td className="status-cell">
                {getStatusIcon(member.status)}
                <span className={`status-badge ${member.status}`}>
                  {member.statusText}
                </span>
              </td>
              <td className="actions-cell">
                <button
                  className="action-button view"
                  onClick={() => onViewMemberDetails(member)}
                  title="عرض التفاصيل"
                >
                  عرض
                </button>
                <button
                  className="action-button contact"
                  onClick={() => onContactMember(member)}
                  title="التواصل"
                >
                  تواصل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

MemberMonitoringTable.displayName = 'MemberMonitoringTable';

export default MemberMonitoringTable;