import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import './MemberMonitoringDashboard.css';

const MemberMonitoringDashboard = () => {
  // State Management
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchMemberId, setSearchMemberId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedTribalSection, setSelectedTribalSection] = useState('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspendConfirmStep, setSuspendConfirmStep] = useState(1);

  // API Configuration
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Tribal Sections (الفخذ)
  const tribalSections = [
    { value: 'all', label: 'جميع الفخوذ' },
    { value: 'رشود', label: 'رشود' },
    { value: 'الدغيش', label: 'الدغيش' },
    { value: 'رشيد', label: 'رشيد' },
    { value: 'العيد', label: 'العيد' },
    { value: 'الرشيد', label: 'الرشيد' },
    { value: 'الشبيعان', label: 'الشبيعان' },
    { value: 'المسعود', label: 'المسعود' },
    { value: 'عقاب', label: 'عقاب' }
  ];

  // Fetch Members Data
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/member-monitoring`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members data');
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      console.log('✅ First 3 members with balances:', data.members?.slice(0, 3).map(m => ({ name: m.name, balance: m.balance })));
      setMembers(data.members || []);
      setFilteredMembers(data.members || []);
    } catch (err) {
      console.error('❌ Error fetching members:', err);
      console.log('⚠️ Falling back to mock data');
      setError('حدث خطأ في تحميل بيانات الأعضاء');
      // Use mock data for development
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  // Load Mock Data for Development
  const loadMockData = () => {
    const mockMembers = generateMockMembers();
    setMembers(mockMembers);
    setFilteredMembers(mockMembers);
  };

  // Generate Mock Members
  const generateMockMembers = () => {
    const names = [
      'أحمد محمد الشعيل', 'فاطمة عبدالله الشعيل', 'محمد سالم الشعيل',
      'نورا خالد الشعيل', 'عبدالرحمن أحمد الشعيل', 'مريم عبدالعزيز الشعيل'
    ];

    const mockData = [];
    for (let i = 1; i <= 288; i++) {
      const balance = Math.random() * 5000;
      mockData.push({
        id: `member-${i}`,
        memberId: `SH-${String(10000 + i)}`,
        name: names[i % names.length],
        phone: `050${String(1000000 + i).padStart(7, '0')}`,
        balance: Math.round(balance),
        tribalSection: tribalSections[1 + (i % 8)].value,
        status: balance >= 3000 ? 'sufficient' : 'insufficient',
        isSuspended: false
      });
    }
    return mockData;
  };

  // Apply Filters with Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = [...members];

      // Filter by Member ID
      if (searchMemberId) {
        filtered = filtered.filter(m =>
          m.memberId.toLowerCase().includes(searchMemberId.toLowerCase())
        );
      }

      // Filter by Name
      if (searchName) {
        filtered = filtered.filter(m =>
          m.name.includes(searchName)
        );
      }

      // Filter by Phone
      if (searchPhone) {
        filtered = filtered.filter(m =>
          m.phone.includes(searchPhone)
        );
      }

      // Filter by Tribal Section
      if (selectedTribalSection !== 'all') {
        filtered = filtered.filter(m =>
          m.tribalSection === selectedTribalSection
        );
      }

      setFilteredMembers(filtered);
      setCurrentPage(1); // Reset to first page on filter change
    }, 300);

    return () => clearTimeout(timer);
  }, [searchMemberId, searchName, searchPhone, selectedTribalSection, members]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // Handle Suspend Action
  const handleSuspend = async (member) => {
    setSelectedMember(member);
    setShowSuspendModal(true);
    setSuspendConfirmStep(1);
  };

  const confirmSuspend = async () => {
    if (suspendConfirmStep === 1) {
      setSuspendConfirmStep(2);
      return;
    }

    try {
      // API call to suspend member
      const response = await fetch(`${API_URL}/api/member-monitoring/${selectedMember.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: 'رصيد أقل من الحد الأدنى المطلوب',
          adminId: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        // Update local state
        const updatedMembers = members.map(m =>
          m.id === selectedMember.id ? { ...m, isSuspended: true } : m
        );
        setMembers(updatedMembers);
        alert('تم إيقاف العضو بنجاح');
      }
    } catch (err) {
      console.error('Error suspending member:', err);
      alert('حدث خطأ في إيقاف العضو');
    } finally {
      setShowSuspendModal(false);
      setSuspendConfirmStep(1);
    }
  };

  // Get current user role
  const getUserRole = () => {
    const role = localStorage.getItem('userRole') || 'admin';
    return role;
  };

  // Check if user can perform actions
  const canPerformActions = () => {
    const role = getUserRole();
    return role === 'super_admin' || role === 'finance_manager';
  };

  // Render Action Buttons based on permissions and balance
  const renderActionButtons = (member) => {
    const hasPermission = canPerformActions();
    const needsAction = member.balance < 3000;

    // No actions for compliant members - show "---"
    if (member.balance >= 3000) {
      return <span className="no-action">---</span>;
    }

    // Show disabled buttons for users without permission
    if (!hasPermission) {
      return (
        <div className="action-buttons">
          <button className="action-btn suspend disabled" disabled title="صلاحية مطلوبة">
            <span className="btn-icon">🚫</span> إيقاف
          </button>
          <button className="action-btn notify disabled" disabled title="صلاحية مطلوبة">
            📱 إشعار
          </button>
        </div>
      );
    }

    // Full action buttons for authorized users
    return (
      <div className="action-buttons">
        {!member.isSuspended && (
          <button
            className="action-btn suspend"
            onClick={() => handleSuspend(member)}
            title="إيقاف العضو"
          >
            <span className="btn-icon">🚫</span> إيقاف
          </button>
        )}
        {member.isSuspended && (
          <span className="suspended-badge">موقوف</span>
        )}
        <NotificationDropdown member={member} onSend={sendNotificationToMember} />
      </div>
    );
  };

  // Notification Dropdown Component
  const NotificationDropdown = ({ member, onSend }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className="notification-wrapper">
        <button
          className="action-btn notify-dropdown"
          onClick={() => setShowMenu(!showMenu)}
        >
          📱 <span>إشعار</span> ▼
        </button>

        {showMenu && (
          <div className="notification-options">
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'app');
                setShowMenu(false);
              }}
            >
              📱 App Notification
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'whatsapp');
                setShowMenu(false);
              }}
            >
              💬 WhatsApp
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'email');
                setShowMenu(false);
              }}
            >
              📧 Email
            </div>
            <div
              className="notification-option"
              onClick={() => {
                onSend(member, 'all');
                setShowMenu(false);
              }}
            >
              💾 All Channels
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle Notify Action
  const handleNotify = async (member) => {
    setSelectedMember(member);
    setShowNotifyModal(true);
  };

  // Send notification through specific channel
  const sendNotificationToMember = async (member, channel) => {
    const message = member.balance < 3000
      ? `عزيزي ${member.name}، رصيدك الحالي ${member.balance} ريال. المطلوب 3000 ريال كحد أدنى. يرجى تسديد المبلغ المتبقي ${3000 - member.balance} ريال.`
      : `عزيزي ${member.name}، شكراً لالتزامك. رصيدك الحالي ${member.balance} ريال.`;

    try {
      const response = await fetch(`${API_URL}/api/members/${member.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          channel: channel,
          message: message,
          type: member.balance < 3000 ? 'payment_reminder' : 'general',
          adminId: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        alert(`تم إرسال الإشعار عبر ${channel === 'all' ? 'جميع القنوات' : channel}`);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('حدث خطأ في إرسال الإشعار');
    }
  };

  const sendNotification = async (type) => {
    try {
      // API call to send notification
      const response = await fetch(`${API_URL}/api/member-monitoring/${selectedMember.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: type,
          message: type === 'payment'
            ? `عزيزي ${selectedMember.name}، رصيدك الحالي ${selectedMember.balance} ريال وهو أقل من الحد الأدنى المطلوب (3000 ريال). يرجى تسديد المبلغ المتبقي.`
            : `عزيزي ${selectedMember.name}، هذا إشعار من إدارة صندوق آل الشعيل.`
        })
      });

      if (response.ok) {
        alert('تم إرسال الإشعار بنجاح');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('حدث خطأ في إرسال الإشعار');
    } finally {
      setShowNotifyModal(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="member-monitoring-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">لوحة متابعة الأعضاء</h1>
        <p className="dashboard-subtitle">متابعة حالة الأعضاء والأرصدة المالية</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon total">
            <CheckCircleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>إجمالي الأعضاء</h3>
            <p className="stat-value">{filteredMembers.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sufficient">
            <CheckCircleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>أرصدة كافية</h3>
            <p className="stat-value">
              {filteredMembers.filter(m => m.status === 'sufficient').length}
            </p>
            <span className="stat-percentage">
              {((filteredMembers.filter(m => m.status === 'sufficient').length / filteredMembers.length) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon insufficient">
            <ExclamationTriangleIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>أرصدة غير كافية</h3>
            <p className="stat-value">
              {filteredMembers.filter(m => m.status === 'insufficient').length}
            </p>
            <span className="stat-percentage warning">
              {((filteredMembers.filter(m => m.status === 'insufficient').length / filteredMembers.length) * 100 || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-container">
        <div className="filter-group">
          <label>رقم العضوية</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="البحث برقم العضوية"
              value={searchMemberId}
              onChange={(e) => setSearchMemberId(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-group">
          <label>الاسم</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="البحث بالاسم"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-group">
          <label>رقم التليفون</label>
          <div className="input-wrapper">
            <MagnifyingGlassIcon className="input-icon" />
            <input
              type="text"
              placeholder="البحث برقم التليفون"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-group">
          <label>الفخذ</label>
          <div className="input-wrapper">
            <FunnelIcon className="input-icon" />
            <select
              value={selectedTribalSection}
              onChange={(e) => setSelectedTribalSection(e.target.value)}
              className="filter-select"
            >
              {tribalSections.map(section => (
                <option key={section.value} value={section.value}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <>
            <table className="members-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>رقم العضوية</th>
                  <th style={{ width: '25%' }}>الاسم</th>
                  <th style={{ width: '15%' }}>رقم التليفون</th>
                  <th style={{ width: '15%' }}>الرصيد</th>
                  <th style={{ width: '15%' }}>الفخذ</th>
                  <th style={{ width: '18%' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map(member => (
                  <tr key={member.id} className={member.isSuspended ? 'suspended' : ''}>
                    <td className="member-id">{member.memberId}</td>
                    <td className="member-name">{member.name}</td>
                    <td className="member-phone">{member.phone}</td>
                    <td className="member-balance">
                      <span className={`balance ${member.status}`}>
                        {member.balance >= 3000 ? '🟢' : '🔴'} {member.balance.toLocaleString()} ر.س
                      </span>
                      {member.status === 'insufficient' && (
                        <span className="balance-warning">
                          (نقص: {(3000 - member.balance).toLocaleString()} ر.س)
                        </span>
                      )}
                    </td>
                    <td className="member-tribal">{member.tribalSection}</td>
                    <td className="member-actions">
                      {renderActionButtons(member)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination-container">
              <div className="page-size-selector">
                <label>عرض:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <span>عضو لكل صفحة</span>
              </div>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRightIcon className="page-icon" />
                  السابق
                </button>

                <div className="page-numbers">
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
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                  <ChevronLeftIcon className="page-icon" />
                </button>
              </div>

              <div className="page-info">
                صفحة {currentPage} من {totalPages} | إجمالي: {filteredMembers.length} عضو
              </div>
            </div>
          </>
        )}
      </div>

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && (
        <div className="modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <ExclamationTriangleIcon className="modal-icon" />
              <h2>تأكيد إيقاف العضو</h2>
            </div>

            <div className="modal-body">
              {suspendConfirmStep === 1 ? (
                <>
                  <p className="warning-text">
                    هل أنت متأكد من إيقاف العضو التالي؟
                  </p>
                  <div className="member-info">
                    <p><strong>الاسم:</strong> {selectedMember?.name}</p>
                    <p><strong>رقم العضوية:</strong> {selectedMember?.memberId}</p>
                    <p><strong>الرصيد الحالي:</strong> {selectedMember?.balance} ر.س</p>
                    <p><strong>النقص:</strong> {3000 - selectedMember?.balance} ر.س</p>
                  </div>
                  <p className="warning-note">
                    سيتم إيقاف جميع خدمات العضو حتى يتم تسديد المبلغ المطلوب
                  </p>
                </>
              ) : (
                <>
                  <p className="confirm-text">
                    تأكيد نهائي - هذا الإجراء لا يمكن التراجع عنه بسهولة
                  </p>
                  <p className="final-warning">
                    اكتب "تأكيد الإيقاف" للمتابعة
                  </p>
                  <input
                    type="text"
                    className="confirm-input"
                    placeholder="تأكيد الإيقاف"
                    onChange={(e) => {
                      if (e.target.value === 'تأكيد الإيقاف') {
                        e.target.classList.add('valid');
                      } else {
                        e.target.classList.remove('valid');
                      }
                    }}
                  />
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendConfirmStep(1);
                }}
              >
                إلغاء
              </button>
              <button
                className="btn-confirm warning"
                onClick={confirmSuspend}
                disabled={suspendConfirmStep === 2 && !document.querySelector('.confirm-input.valid')}
              >
                {suspendConfirmStep === 1 ? 'متابعة' : 'تأكيد الإيقاف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header info">
              <BellIcon className="modal-icon" />
              <h2>إرسال إشعار</h2>
            </div>

            <div className="modal-body">
              <p>اختر نوع الإشعار المراد إرساله للعضو:</p>
              <div className="member-info">
                <p><strong>الاسم:</strong> {selectedMember?.name}</p>
                <p><strong>رقم الهاتف:</strong> {selectedMember?.phone}</p>
              </div>

              <div className="notification-options">
                <button
                  className="notification-type payment"
                  onClick={() => sendNotification('payment')}
                >
                  <BellIcon className="option-icon" />
                  <span>تذكير بالدفع</span>
                  <p className="option-desc">
                    إرسال رسالة تذكير بضرورة تسديد المبلغ المتبقي
                  </p>
                </button>

                <button
                  className="notification-type general"
                  onClick={() => sendNotification('general')}
                >
                  <BellIcon className="option-icon" />
                  <span>إشعار عام</span>
                  <p className="option-desc">
                    إرسال رسالة إشعار عامة من إدارة الصندوق
                  </p>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowNotifyModal(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberMonitoringDashboard;