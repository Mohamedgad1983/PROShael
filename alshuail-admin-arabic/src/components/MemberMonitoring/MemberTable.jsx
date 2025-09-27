import React, { useState } from 'react';
import ActionButtons from './ActionButtons';
import {
  UserIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const MemberTable = ({ members, userRole, onSuspend, onNotify }) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort members
  const sortedMembers = [...members].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle numeric sorting for balance
    if (sortField === 'balance') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Format balance display
  const formatBalance = (balance) => {
    const isCompliant = balance >= 3000;
    const formattedBalance = balance.toLocaleString('ar-SA');

    return (
      <div className="balance-display">
        <span className={`balance-badge ${isCompliant ? 'balance-sufficient' : 'balance-insufficient'}`}>
          {formattedBalance} ر.س
        </span>
        {!isCompliant && (
          <span className="balance-deficit">
            نقص: {(3000 - balance).toLocaleString('ar-SA')} ر.س
          </span>
        )}
      </div>
    );
  };

  // Check if table is empty
  if (members.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>لا توجد نتائج</h3>
        <p>لم يتم العثور على أعضاء مطابقين للفلاتر المحددة</p>
      </div>
    );
  }

  return (
    <div className="member-table-container">
      <table className="member-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSort('id')}
              className="sortable"
            >
              <div className="th-content">
                <UserIcon className="th-icon" />
                <span>رقم العضوية</span>
                {sortField === 'id' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleSort('name')}
              className="sortable"
            >
              <div className="th-content">
                <UserIcon className="th-icon" />
                <span>الاسم</span>
                {sortField === 'name' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
            </th>
            <th>
              <div className="th-content">
                <PhoneIcon className="th-icon" />
                <span>رقم التليفون</span>
              </div>
            </th>
            <th
              onClick={() => handleSort('balance')}
              className="sortable balance-header"
            >
              <div className="th-content">
                <CurrencyDollarIcon className="th-icon" />
                <span>الرصيد</span>
                {sortField === 'balance' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
            </th>
            <th
              onClick={() => handleSort('tribalSection')}
              className="sortable"
            >
              <div className="th-content">
                <UsersIcon className="th-icon" />
                <span>الفخذ</span>
                {sortField === 'tribalSection' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
            </th>
            <th className="actions-header">
              <div className="th-content">
                <span>الإجراءات</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member, index) => (
            <tr
              key={member.id}
              className={`member-row ${index % 2 === 0 ? 'even' : 'odd'} ${member.balance < 3000 ? 'non-compliant' : 'compliant'}`}
            >
              <td className="member-id">
                <span className="id-badge">{member.id}</span>
              </td>
              <td className="member-name">
                <div className="name-container">
                  <div className="member-avatar">
                    {member.name.charAt(0)}
                  </div>
                  <span className="name-text">{member.name}</span>
                </div>
              </td>
              <td className="member-phone">
                <a href={`tel:${member.phone}`} className="phone-link">
                  {member.phone}
                </a>
              </td>
              <td className="member-balance">
                {formatBalance(member.balance)}
              </td>
              <td className="member-tribal">
                <span className="tribal-badge">
                  {member.tribalSection}
                </span>
              </td>
              <td className="member-actions">
                <ActionButtons
                  member={member}
                  userRole={userRole}
                  onSuspend={onSuspend}
                  onNotify={onNotify}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Table Summary */}
      <div className="table-summary">
        <div className="summary-item">
          <span className="summary-label">إجمالي الأعضاء:</span>
          <span className="summary-value">{members.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">ملتزمون:</span>
          <span className="summary-value success">
            {members.filter(m => m.balance >= 3000).length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">غير ملتزمين:</span>
          <span className="summary-value warning">
            {members.filter(m => m.balance < 3000).length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">إجمالي الأرصدة:</span>
          <span className="summary-value">
            {members.reduce((sum, m) => sum + m.balance, 0).toLocaleString('ar-SA')} ر.س
          </span>
        </div>
      </div>
    </div>
  );
};

export default MemberTable;