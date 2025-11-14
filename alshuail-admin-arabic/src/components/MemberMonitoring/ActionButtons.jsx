import React, { memo,  useState } from 'react';
import {
  BellIcon,
  PauseIcon,
  ChatBubbleBottomCenterTextIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const ActionButtons = ({ member, userRole, onSuspend, onNotify }) => {
  const [showNotifyMenu, setShowNotifyMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check if user has permission for actions
  const hasPermission = userRole === 'super_admin' || userRole === 'finance_manager';
  const isCompliant = member.balance >= 3000;

  // Handle suspend with confirmation
  const handleSuspendClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmSuspend = () => {
    onSuspend(member.id);
    setShowConfirmDialog(false);
  };

  // Handle notification methods
  const handleNotification = (method) => {
    onNotify(member.id, method);
    setShowNotifyMenu(false);
  };

  // If member is compliant, show "---"
  if (isCompliant) {
    return (
      <div className="action-buttons no-action">
        <span className="compliant-status">---</span>
      </div>
    );
  }

  // If user doesn't have permission, show disabled buttons
  if (!hasPermission) {
    return (
      <div className="action-buttons disabled">
        <button
          className="action-btn suspend-btn disabled"
          disabled
          title="صلاحية مطلوبة"
        >
          <PauseIcon className="btn-icon" />
          <span>إيقاف</span>
        </button>
        <button
          className="action-btn notify-btn disabled"
          disabled
          title="صلاحية مطلوبة"
        >
          <BellIcon className="btn-icon" />
          <span>إشعار</span>
        </button>
      </div>
    );
  }

  // Full action buttons for authorized users and non-compliant members
  return (
    <>
      <div className="action-buttons">
        {/* Suspend Button */}
        {!member.isSuspended ? (
          <button
            className="action-btn suspend-btn"
            onClick={handleSuspendClick}
            title="إيقاف العضو"
          >
            <PauseIcon className="btn-icon" />
            <span>إيقاف</span>
          </button>
        ) : (
          <span className="suspended-badge">موقوف</span>
        )}

        {/* Notification Dropdown */}
        <div className="notify-dropdown-container">
          <button
            className="action-btn notify-btn"
            onClick={() => setShowNotifyMenu(!showNotifyMenu)}
          >
            <BellIcon className="btn-icon" />
            <span>إشعار</span>
            <ChevronDownIcon className="dropdown-icon" />
          </button>

          {showNotifyMenu && (
            <div className="notify-menu">
              <button
                className="notify-option app"
                onClick={() => handleNotification('app')}
              >
                <DevicePhoneMobileIcon className="option-icon" />
                <span>التطبيق</span>
              </button>
              <button
                className="notify-option whatsapp"
                onClick={() => handleNotification('whatsapp')}
              >
                <ChatBubbleBottomCenterTextIcon className="option-icon" />
                <span>واتساب</span>
              </button>
              <button
                className="notify-option email"
                onClick={() => handleNotification('email')}
              >
                <EnvelopeIcon className="option-icon" />
                <span>البريد الإلكتروني</span>
              </button>
              <button
                className="notify-option sms"
                onClick={() => handleNotification('sms')}
              >
                <DevicePhoneMobileIcon className="option-icon" />
                <span>رسالة نصية</span>
              </button>
              <div className="menu-divider"></div>
              <button
                className="notify-option all"
                onClick={() => handleNotification('all')}
              >
                <BellIcon className="option-icon" />
                <span>جميع القنوات</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <PauseIcon className="dialog-icon warning" />
              <h3>تأكيد إيقاف العضو</h3>
            </div>
            <div className="dialog-body">
              <p>هل أنت متأكد من إيقاف العضو؟</p>
              <div className="member-info">
                <p><strong>الاسم:</strong> {member.name}</p>
                <p><strong>الرصيد:</strong> {member.balance.toLocaleString('ar-SA')} ر.س</p>
                <p><strong>النقص:</strong> {(3000 - member.balance).toLocaleString('ar-SA')} ر.س</p>
              </div>
              <p className="warning-text">
                سيتم إيقاف جميع الخدمات حتى يتم تسديد المبلغ المطلوب
              </p>
            </div>
            <div className="dialog-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmDialog(false)}
              >
                إلغاء
              </button>
              <button
                className="btn-confirm warning"
                onClick={confirmSuspend}
              >
                تأكيد الإيقاف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(ActionButtons);