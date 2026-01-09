/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - MEMBER SECURITY SECTION
 * =====================================================
 * Security management component for Admin Panel
 * Shows password & Face ID status (Super Admin only)
 * Date: December 20, 2024
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FaLock,
    FaUnlock,
    FaFingerprint,
    FaTrash,
    FaHistory,
    FaShieldAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTimesCircle,
    FaClock
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.alshailfund.com';

/**
 * Member Security Section Component
 * Only visible to Super Admin users
 */
const MemberSecuritySection = ({ memberId, memberName, currentUserRole }) => {
    // State
    const [securityInfo, setSecurityInfo] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
    const [showDeleteFaceIdModal, setShowDeleteFaceIdModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Check if current user is Super Admin
    const isSuperAdmin = currentUserRole === 'super_admin';

    // Fetch security info on mount (hook must be called unconditionally)
    useEffect(() => {
        if (isSuperAdmin) {
            fetchSecurityInfo();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memberId, isSuperAdmin]);

    // Don't render if not Super Admin (AFTER all hooks)
    if (!isSuperAdmin) {
        return null;
    }

    /**
     * Fetch member security information
     */
    const fetchSecurityInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get(
                `${API_BASE}/api/auth/password/admin/member/${memberId}/security`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setSecurityInfo(response.data.security);
                setRecentLogs(response.data.recentLogs || []);
            }
        } catch (error) {
            console.error('Error fetching security info:', error);
            toast.error('فشل في جلب معلومات الأمان');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Delete member password
     */
    const handleDeletePassword = async () => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.delete(
                `${API_BASE}/api/auth/password/admin/member/${memberId}/password`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setShowDeletePasswordModal(false);
                fetchSecurityInfo(); // Refresh data
            }
        } catch (error) {
            console.error('Error deleting password:', error);
            toast.error(error.response?.data?.message || 'فشل في حذف كلمة المرور');
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * Delete member Face ID
     */
    const handleDeleteFaceId = async () => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.delete(
                `${API_BASE}/api/auth/password/admin/member/${memberId}/face-id`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setShowDeleteFaceIdModal(false);
                fetchSecurityInfo(); // Refresh data
            }
        } catch (error) {
            console.error('Error deleting Face ID:', error);
            toast.error(error.response?.data?.message || 'فشل في حذف Face ID');
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * Format date for display
     */
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Get action type label in Arabic
     */
    const getActionLabel = (actionType) => {
        const labels = {
            'password_created': 'إنشاء كلمة مرور',
            'password_changed': 'تغيير كلمة المرور',
            'password_reset_requested': 'طلب استعادة كلمة المرور',
            'password_deleted_by_admin': 'حذف كلمة المرور (بواسطة المشرف)',
            'face_id_enabled': 'تفعيل Face ID',
            'face_id_disabled': 'إلغاء Face ID',
            'face_id_deleted_by_admin': 'حذف Face ID (بواسطة المشرف)',
            'login_success': 'تسجيل دخول ناجح',
            'login_failed': 'محاولة دخول فاشلة',
            'account_locked': 'قفل الحساب',
            'account_unlocked': 'فك قفل الحساب',
            'otp_requested': 'طلب رمز تحقق'
        };
        return labels[actionType] || actionType;
    };

    // Loading state
    if (loading) {
        return (
            <div className="security-section-loading">
                <div className="loading-spinner"></div>
                <span>جاري تحميل معلومات الأمان...</span>
                <style>{`
                    .security-section-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        min-height: 200px;
                        color: #a0aec0;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        border-radius: 16px;
                        padding: 24px;
                        margin-top: 24px;
                        border: 1px solid rgba(102, 126, 234, 0.3);
                    }
                    .loading-spinner {
                        width: 24px;
                        height: 24px;
                        border: 3px solid rgba(102, 126, 234, 0.3);
                        border-top-color: #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="security-section">
            {/* Header */}
            <div className="security-header">
                <div className="header-title">
                    <FaShieldAlt className="icon" />
                    <h3>إعدادات الأمان</h3>
                </div>
                <span className="super-admin-badge">
                    <FaLock /> Super Admin فقط
                </span>
            </div>

            {/* Security Cards */}
            <div className="security-cards">
                {/* Password Card */}
                <div className={`security-card ${securityInfo?.password?.enabled ? 'enabled' : 'disabled'}`}>
                    <div className="card-icon">
                        {securityInfo?.password?.enabled ? (
                            <FaLock className="icon-enabled" />
                        ) : (
                            <FaUnlock className="icon-disabled" />
                        )}
                    </div>
                    <div className="card-content">
                        <h4>كلمة المرور</h4>
                        <div className="status-row">
                            <span className="label">الحالة:</span>
                            <span className={`status ${securityInfo?.password?.enabled ? 'active' : 'inactive'}`}>
                                {securityInfo?.password?.enabled ? (
                                    <><FaCheckCircle /> مفعّلة</>
                                ) : (
                                    <><FaTimesCircle /> غير مفعّلة</>
                                )}
                            </span>
                        </div>
                        {securityInfo?.password?.lastUpdated && (
                            <div className="status-row">
                                <span className="label">آخر تغيير:</span>
                                <span className="value">
                                    <FaClock /> {formatDate(securityInfo.password.lastUpdated)}
                                </span>
                            </div>
                        )}
                    </div>
                    {securityInfo?.password?.enabled && (
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeletePasswordModal(true)}
                            title="حذف كلمة المرور"
                        >
                            <FaTrash /> حذف
                        </button>
                    )}
                </div>

                {/* Face ID Card */}
                <div className={`security-card ${securityInfo?.faceId?.enabled ? 'enabled' : 'disabled'}`}>
                    <div className="card-icon">
                        <FaFingerprint className={securityInfo?.faceId?.enabled ? 'icon-enabled' : 'icon-disabled'} />
                    </div>
                    <div className="card-content">
                        <h4>Face ID / البصمة</h4>
                        <div className="status-row">
                            <span className="label">الحالة:</span>
                            <span className={`status ${securityInfo?.faceId?.enabled ? 'active' : 'inactive'}`}>
                                {securityInfo?.faceId?.enabled ? (
                                    <><FaCheckCircle /> مفعّل</>
                                ) : (
                                    <><FaTimesCircle /> غير مفعّل</>
                                )}
                            </span>
                        </div>
                        {securityInfo?.faceId?.enabledAt && (
                            <div className="status-row">
                                <span className="label">تاريخ التفعيل:</span>
                                <span className="value">
                                    <FaClock /> {formatDate(securityInfo.faceId.enabledAt)}
                                </span>
                            </div>
                        )}
                    </div>
                    {securityInfo?.faceId?.enabled && (
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeleteFaceIdModal(true)}
                            title="حذف Face ID"
                        >
                            <FaTrash /> حذف
                        </button>
                    )}
                </div>
            </div>

            {/* Account Status */}
            {securityInfo?.account && (
                <div className="account-status">
                    <h4><FaHistory /> حالة الحساب</h4>
                    <div className="status-grid">
                        <div className="status-item">
                            <span className="label">آخر تسجيل دخول:</span>
                            <span className="value">{formatDate(securityInfo.account.lastLogin)}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">طريقة الدخول:</span>
                            <span className="value">
                                {securityInfo.account.lastLoginMethod === 'password' && 'كلمة المرور'}
                                {securityInfo.account.lastLoginMethod === 'otp' && 'رمز التحقق OTP'}
                                {securityInfo.account.lastLoginMethod === 'face_id' && 'Face ID'}
                                {!securityInfo.account.lastLoginMethod && '—'}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="label">محاولات فاشلة:</span>
                            <span className={`value ${securityInfo.account.failedAttempts > 0 ? 'warning' : ''}`}>
                                {securityInfo.account.failedAttempts || 0}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="label">الحساب مقفل:</span>
                            <span className={`value ${securityInfo.account.lockedUntil ? 'danger' : 'success'}`}>
                                {securityInfo.account.lockedUntil ? (
                                    <>نعم - حتى {formatDate(securityInfo.account.lockedUntil)}</>
                                ) : (
                                    'لا'
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Security Logs */}
            {recentLogs.length > 0 && (
                <div className="security-logs">
                    <h4><FaHistory /> سجل العمليات الأخيرة</h4>
                    <div className="logs-list">
                        {recentLogs.map((log, index) => (
                            <div key={index} className="log-item">
                                <div className="log-action">{getActionLabel(log.action_type)}</div>
                                <div className="log-details">
                                    {log.performed_by_name && (
                                        <span className="performer">بواسطة: {log.performed_by_name}</span>
                                    )}
                                    <span className="time">{formatDate(log.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Password Modal */}
            {showDeletePasswordModal && (
                <div className="modal-overlay" onClick={() => setShowDeletePasswordModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <FaExclamationTriangle />
                            <h3>تأكيد حذف كلمة المرور</h3>
                        </div>
                        <div className="modal-body">
                            <p>هل أنت متأكد من حذف كلمة المرور للعضو:</p>
                            <p className="member-name">{memberName}؟</p>
                            <div className="warning-note">
                                <FaExclamationTriangle />
                                <span>سيحتاج العضو لإنشاء كلمة مرور جديدة عند تسجيل الدخول القادم عبر OTP</span>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowDeletePasswordModal(false)}
                                disabled={actionLoading}
                            >
                                إلغاء
                            </button>
                            <button
                                className="btn-delete"
                                onClick={handleDeletePassword}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'جاري الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Face ID Modal */}
            {showDeleteFaceIdModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteFaceIdModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <FaExclamationTriangle />
                            <h3>تأكيد حذف Face ID</h3>
                        </div>
                        <div className="modal-body">
                            <p>هل أنت متأكد من حذف Face ID للعضو:</p>
                            <p className="member-name">{memberName}؟</p>
                            <div className="warning-note">
                                <FaExclamationTriangle />
                                <span>سيحتاج العضو لإعادة تفعيل Face ID من إعدادات التطبيق</span>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowDeleteFaceIdModal(false)}
                                disabled={actionLoading}
                            >
                                إلغاء
                            </button>
                            <button
                                className="btn-delete"
                                onClick={handleDeleteFaceId}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'جاري الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles */}
            <style>{`
                .security-section {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    padding: 24px;
                    margin-top: 24px;
                    border: 1px solid rgba(102, 126, 234, 0.3);
                }

                .security-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                }

                .header-title .icon {
                    color: #667eea;
                    font-size: 24px;
                }

                .header-title h3 {
                    margin: 0;
                    font-size: 18px;
                }

                .super-admin-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(102, 126, 234, 0.2);
                    color: #667eea;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                }

                .security-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .security-card {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative;
                }

                .security-card.enabled {
                    border-color: rgba(72, 187, 120, 0.3);
                }

                .security-card.disabled {
                    border-color: rgba(245, 101, 101, 0.3);
                }

                .card-icon {
                    font-size: 32px;
                }

                .icon-enabled {
                    color: #48bb78;
                }

                .icon-disabled {
                    color: #f56565;
                }

                .card-content {
                    flex: 1;
                }

                .card-content h4 {
                    margin: 0 0 12px 0;
                    color: white;
                    font-size: 16px;
                }

                .status-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .status-row .label {
                    color: #a0aec0;
                }

                .status-row .status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .status.active {
                    color: #48bb78;
                }

                .status.inactive {
                    color: #f56565;
                }

                .status-row .value {
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .delete-btn {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    background: rgba(245, 101, 101, 0.2);
                    color: #f56565;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    transition: all 0.3s;
                }

                .delete-btn:hover {
                    background: rgba(245, 101, 101, 0.4);
                }

                .account-status {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .account-status h4 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: white;
                    margin: 0 0 16px 0;
                    font-size: 16px;
                }

                .status-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                }

                .status-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .status-item .label {
                    color: #a0aec0;
                    font-size: 12px;
                }

                .status-item .value {
                    color: #e2e8f0;
                    font-size: 14px;
                }

                .status-item .value.warning {
                    color: #ecc94b;
                }

                .status-item .value.danger {
                    color: #f56565;
                }

                .status-item .value.success {
                    color: #48bb78;
                }

                .security-logs {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px;
                }

                .security-logs h4 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: white;
                    margin: 0 0 16px 0;
                    font-size: 16px;
                }

                .logs-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .log-item {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 12px;
                    border-radius: 8px;
                    border-right: 3px solid #667eea;
                }

                .log-action {
                    color: #e2e8f0;
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .log-details {
                    display: flex;
                    gap: 16px;
                    font-size: 12px;
                    color: #a0aec0;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: #1a1a2e;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 400px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-header.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                }

                .modal-body {
                    padding: 20px;
                    color: #e2e8f0;
                }

                .modal-body p {
                    margin: 0 0 8px 0;
                }

                .member-name {
                    font-weight: bold;
                    color: white;
                    font-size: 18px;
                }

                .warning-note {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    background: rgba(245, 158, 11, 0.1);
                    padding: 12px;
                    border-radius: 8px;
                    margin-top: 16px;
                    color: #f59e0b;
                    font-size: 14px;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    padding: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .btn-cancel {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: transparent;
                    color: #a0aec0;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .btn-cancel:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .btn-delete {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: #f56565;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .btn-delete:hover {
                    background: #e53e3e;
                }

                .btn-delete:disabled,
                .btn-cancel:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* RTL Support */
                [dir="rtl"] .delete-btn {
                    left: auto;
                    right: 12px;
                }

                [dir="rtl"] .log-item {
                    border-right: none;
                    border-left: 3px solid #667eea;
                }
            `}</style>
        </div>
    );
};

export default MemberSecuritySection;
