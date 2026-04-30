/**
 * LoanRequestDetail — modal-style detail view shown over the list page.
 *
 * Displays:
 *   • header summary (sequence #, status, amount, fee)
 *   • applicant card (snapshotted personal/financial data)
 *   • documents list (with download)
 *   • status timeline
 *   • role-aware action panel:
 *       Fund staff:   start review → approve / reject → forward → disburse
 *       Brouj:        upload Najiz acknowledgment, confirm fee receipt
 *
 * The component is intentionally self-contained — no Redux/Context — so it
 * stays easy to drop into other admin pages later.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  loanService,
  LoanRequest,
  LoanStatus,
  STATUS_LABELS_AR,
  STATUS_COLORS,
  DOCUMENT_LABELS_AR,
  isFundRole,
  isBroujRole,
} from '../../services/loanService';

interface Props {
  loanId: string;
  onClose: () => void;
  onChange: () => void;
}

const formatSAR = (v: string | number | undefined | null) => {
  if (v === undefined || v === null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س';
};

const formatDateTime = (s: string | undefined | null) => {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s));
  } catch {
    return s.slice(0, 16);
  }
};

/** Build a download URL the static-uploads pipeline can serve. */
const fileUrl = (path?: string) => {
  if (!path) return '#';
  // Backend serves uploads at /api/uploads/<path>. The path stored already
  // includes the BUCKET_NAME segment (e.g. member-documents/...).
  if (path.startsWith('http')) return path;
  return `https://api.alshailfund.com/api/uploads/${path.replace(/^\/+/, '')}`;
};

const LoanRequestDetail: React.FC<Props> = ({ loanId, onClose, onChange }) => {
  const [loan, setLoan] = useState<LoanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [showDisburseBox, setShowDisburseBox] = useState(false);

  // Brouj-specific file inputs (for upload Najiz + fee receipt).
  const najizInputRef = useRef<HTMLInputElement | null>(null);
  const feeInputRef = useRef<HTMLInputElement | null>(null);

  const role = useMemo<string>(() => {
    try {
      const data = localStorage.getItem('user_data') || localStorage.getItem('user');
      if (data) {
        const u = JSON.parse(data);
        return u?.role || u?.user?.role || '';
      }
    } catch {
      // ignore
    }
    return '';
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await loanService.getOne(loanId);
      setLoan(r);
      // Keep the parent list in sync after each successful refresh.
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل جلب الطلب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  // ─── action runners ─────────────────────────────────────────────────────────

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setActionInFlight(label);
    try {
      await fn();
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'فشل تنفيذ الإجراء';
      alert(msg);
    } finally {
      setActionInFlight(null);
    }
  };

  // Visible action buttons depend on (role, current status). This single
  // function returns the panel JSX; status transitions live in loanService.
  const renderActions = () => {
    if (!loan) return null;
    const status = loan.status;
    const fund = isFundRole(role);
    const brouj = isBroujRole(role);

    const buttons: React.ReactNode[] = [];

    if (fund) {
      if (status === 'submitted') {
        buttons.push(
          <ActionButton key="start" tone="primary" loading={actionInFlight === 'start'}
            onClick={() => runAction('start', () => loanService.startReview(loanId))}>
            بدء المراجعة
          </ActionButton>
        );
      }
      if (status === 'submitted' || status === 'under_fund_review') {
        buttons.push(
          <ActionButton key="approve" tone="success" loading={actionInFlight === 'approve'}
            onClick={() => runAction('approve', () => loanService.approve(loanId))}>
            موافقة المرحلة الأولى
          </ActionButton>
        );
      }
      if (status === 'approved_by_fund') {
        buttons.push(
          <ActionButton key="forward" tone="primary" loading={actionInFlight === 'forward'}
            onClick={() => runAction('forward', () => loanService.forwardToBrouj(loanId))}>
            تحويل لمؤسسة بروز الريادة
          </ActionButton>
        );
      }
      if (status === 'ready_for_disbursement') {
        buttons.push(
          <ActionButton key="disburse" tone="success" loading={actionInFlight === 'disburse'}
            onClick={() => setShowDisburseBox(true)}>
            تسجيل الصرف
          </ActionButton>
        );
      }
      // Reject is allowed at any non-terminal state.
      if (!['completed', 'rejected', 'cancelled'].includes(status)) {
        buttons.push(
          <ActionButton key="reject" tone="danger" loading={actionInFlight === 'reject'}
            onClick={() => setShowRejectBox(true)}>
            رفض الطلب
          </ActionButton>
        );
      }
    }

    if (brouj) {
      if (status === 'forwarded_to_brouj' || status === 'brouj_processing') {
        buttons.push(
          <ActionButton key="najiz" tone="primary" loading={actionInFlight === 'najiz'}
            onClick={() => najizInputRef.current?.click()}>
            رفع إقرار ناجز
          </ActionButton>
        );
      }
      if (status === 'najiz_uploaded') {
        buttons.push(
          <ActionButton key="fee" tone="success" loading={actionInFlight === 'fee'}
            onClick={() => feeInputRef.current?.click()}>
            تأكيد تحصيل الرسوم
          </ActionButton>
        );
      }
    }

    if (buttons.length === 0) {
      return (
        <p style={{ color: '#64748b', fontSize: 13 }}>
          لا توجد إجراءات متاحة في هذه الحالة.
        </p>
      );
    }
    return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{buttons}</div>;
  };

  // ─── rendering ──────────────────────────────────────────────────────────────

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeader}>
          <button onClick={onClose} style={closeButton}>✕</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            {loan?.sequence_number ? `طلب ${loan.sequence_number}` : 'تفاصيل الطلب'}
          </h2>
        </div>

        <div style={modalBody}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>جاري التحميل…</div>}
          {error && <div style={errorBox}>{error}</div>}

          {loan && (
            <>
              {/* Top: status + key amounts */}
              <div style={topCardStyle}>
                <span
                  style={{
                    background: STATUS_COLORS[loan.status],
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {STATUS_LABELS_AR[loan.status]}
                </span>
                <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={kpiLabel}>الرسوم الإدارية</div>
                    <div style={kpiValue}>{formatSAR(loan.admin_fee_amount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={kpiLabel}>مبلغ السلفة</div>
                    <div style={{ ...kpiValue, fontSize: 22, color: '#4338ca' }}>{formatSAR(loan.loan_amount)}</div>
                  </div>
                </div>
              </div>

              {/* Rejection reason banner */}
              {loan.status === 'rejected' && loan.rejection_reason && (
                <div style={{ ...errorBox, marginBottom: 16 }}>
                  <strong>سبب الرفض: </strong>{loan.rejection_reason}
                </div>
              )}

              {/* Personal & financial details */}
              <div style={cardStyle}>
                <h3 style={cardTitle}>بيانات الطلب</h3>
                <div style={detailGrid}>
                  <DetailField label="الاسم" value={loan.applicant_name} />
                  <DetailField label="رقم الجوال" value={loan.member_phone} dir="ltr" />
                  <DetailField label="رقم الهوية" value={loan.national_id} dir="ltr" />
                  <DetailField label="تاريخ الميلاد" value={(loan.date_of_birth || '').slice(0, 10)} dir="ltr" />
                  <DetailField label="نوع الوظيفة" value={loan.employment_type === 'government' ? 'موظف حكومي' : loan.employment_type} />
                  <DetailField label="الراتب الشهري" value={formatSAR(loan.monthly_salary)} />
                  <DetailField label="الالتزامات الشهرية" value={formatSAR(loan.monthly_obligations)} />
                  <DetailField label="نسبة الالتزام" value={`${Math.round((Number(loan.monthly_obligations) / Math.max(Number(loan.monthly_salary), 1)) * 100)}%`} />
                  <DetailField label="تاريخ التقديم" value={formatDateTime(loan.created_at)} />
                  <DetailField label="آخر تحديث" value={formatDateTime(loan.updated_at)} />
                </div>
                {loan.fund_review_note && (
                  <div style={{ marginTop: 12, padding: 10, background: '#f0f9ff', borderRadius: 8 }}>
                    <strong>ملاحظة المراجعة: </strong>{loan.fund_review_note}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div style={cardStyle}>
                <h3 style={cardTitle}>المرفقات</h3>
                {(!loan.documents || loan.documents.length === 0) ? (
                  <p style={{ color: '#64748b' }}>لا توجد مرفقات</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {loan.documents.map((d) => (
                      <a
                        key={d.id}
                        href={fileUrl(d.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={docCardStyle}
                      >
                        <div style={{ fontSize: 22 }}>📄</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                            {DOCUMENT_LABELS_AR[d.document_type] || d.document_type}
                          </div>
                          {d.original_name && (
                            <div style={{ fontSize: 11, color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                              {d.original_name}
                            </div>
                          )}
                          {d.uploaded_at && (
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              {formatDateTime(d.uploaded_at)}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#4338ca', fontWeight: 600 }}>تنزيل</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div style={cardStyle}>
                <h3 style={cardTitle}>سجل الحالة</h3>
                {(!loan.history || loan.history.length === 0) ? (
                  <p style={{ color: '#64748b' }}>لا يوجد سجل بعد</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loan.history.map((h) => (
                      <div key={h.id} style={timelineRowStyle}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: STATUS_COLORS[(h.to_status as LoanStatus)] || '#9CA3AF',
                            marginTop: 6,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {STATUS_LABELS_AR[h.to_status as LoanStatus] || h.to_status}
                          </div>
                          {h.note && <div style={{ fontSize: 12, color: '#475569' }}>{h.note}</div>}
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {formatDateTime(h.changed_at)}
                            {h.changed_by_name_ar ? ` • ${h.changed_by_name_ar}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions panel */}
              <div style={{ ...cardStyle, background: '#f8fafc' }}>
                <h3 style={cardTitle}>الإجراءات</h3>
                {renderActions()}

                {showRejectBox && (
                  <div style={inlineBoxStyle}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>سبب الرفض</div>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="اكتب السبب بوضوح للعضو…"
                      style={textareaStyle}
                      rows={3}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <ActionButton
                        tone="danger"
                        loading={actionInFlight === 'reject'}
                        onClick={async () => {
                          if (!rejectReason.trim()) {
                            alert('يرجى كتابة سبب الرفض');
                            return;
                          }
                          await runAction('reject', () => loanService.reject(loanId, rejectReason.trim()));
                          setShowRejectBox(false);
                          setRejectReason('');
                        }}
                      >
                        تأكيد الرفض
                      </ActionButton>
                      <button onClick={() => { setShowRejectBox(false); setRejectReason(''); }} style={cancelButtonStyle}>
                        تراجع
                      </button>
                    </div>
                  </div>
                )}

                {showDisburseBox && (
                  <div style={inlineBoxStyle}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>المبلغ المصروف فعلياً (ر.س)</div>
                    <input
                      type="number"
                      value={disburseAmount}
                      onChange={(e) => setDisburseAmount(e.target.value)}
                      placeholder={String(loan.loan_amount || '')}
                      style={{ ...textareaStyle, height: 40 }}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <ActionButton
                        tone="success"
                        loading={actionInFlight === 'disburse'}
                        onClick={async () => {
                          const amount = Number(disburseAmount || loan.loan_amount);
                          if (!Number.isFinite(amount) || amount <= 0) {
                            alert('المبلغ غير صالح');
                            return;
                          }
                          await runAction('disburse', () => loanService.recordDisbursement(loanId, amount));
                          setShowDisburseBox(false);
                          setDisburseAmount('');
                        }}
                      >
                        تأكيد الصرف
                      </ActionButton>
                      <button onClick={() => { setShowDisburseBox(false); setDisburseAmount(''); }} style={cancelButtonStyle}>
                        تراجع
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden file inputs for Brouj uploads */}
                <input
                  ref={najizInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await runAction('najiz', () => loanService.broujUploadNajiz(loanId, file));
                    e.target.value = '';
                  }}
                />
                <input
                  ref={feeInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await runAction('fee', () => loanService.broujConfirmFee(loanId, file));
                    e.target.value = '';
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── small subcomponents ──────────────────────────────────────────────────────

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  tone: 'primary' | 'success' | 'danger';
  loading?: boolean;
}> = ({ children, onClick, tone, loading }) => {
  const colors = {
    primary: { bg: '#4338ca', hover: '#3730a3' },
    success: { bg: '#059669', hover: '#047857' },
    danger:  { bg: '#dc2626', hover: '#b91c1c' },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '10px 18px',
        borderRadius: 8,
        background: loading ? '#94a3b8' : colors.bg,
        color: '#fff',
        border: 'none',
        fontWeight: 600,
        fontSize: 14,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = colors.hover; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = colors.bg; }}
    >
      {loading ? 'جارٍ التنفيذ…' : children}
    </button>
  );
};

const DetailField: React.FC<{ label: string; value?: React.ReactNode; dir?: 'ltr' | 'rtl' }> = ({ label, value, dir }) => (
  <div>
    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', direction: dir || 'rtl' }}>
      {value === undefined || value === null || value === '' ? '—' : value}
    </div>
  </div>
);

// ─── styles ──────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.5)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '40px 16px',
  overflowY: 'auto',
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  width: '100%',
  maxWidth: 980,
  borderRadius: 14,
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  overflow: 'hidden',
  direction: 'rtl',
};

const modalHeader: React.CSSProperties = {
  padding: '18px 20px',
  background: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeButton: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 22,
  cursor: 'pointer',
  color: '#64748b',
};

const modalBody: React.CSSProperties = {
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 15,
  fontWeight: 700,
  color: '#1e293b',
};

const topCardStyle: React.CSSProperties = {
  ...cardStyle,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const kpiLabel: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
};

const kpiValue: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: '#1e293b',
};

const detailGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
};

const docCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  textDecoration: 'none',
  color: 'inherit',
};

const timelineRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '8px 10px',
  background: '#fff',
  borderRadius: 8,
};

const errorBox: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: 12,
  borderRadius: 8,
  fontSize: 14,
};

const inlineBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  resize: 'vertical',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  background: '#fff',
  border: '1px solid #d1d5db',
  fontWeight: 600,
  cursor: 'pointer',
};

export default LoanRequestDetail;
