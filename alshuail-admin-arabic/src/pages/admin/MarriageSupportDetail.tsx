/**
 * MarriageSupportDetail — modal-style detail for one marriage-support request.
 *
 * Renders KPIs, applicant + spouse cards, calculation breakdown, signatures
 * timeline, status history, and a role-aware action panel.
 */

import React, { useEffect, useState } from 'react';
import {
  marriageSupportService,
  MarriageRequest,
  STATUS_LABELS_AR,
  STATUS_COLORS,
  SIGNER_ROLE_LABELS_AR,
  SignerRole,
  fmtAmount,
  isCommitteeRole,
  isChairmanRole,
} from '../../services/marriageSupportService';

interface Props {
  requestId: string;
  onClose: () => void;
  onChange: () => void;
}

function getCurrentUser(): { id?: string; role?: string; full_name_ar?: string } {
  try {
    const raw = localStorage.getItem('user_data') || localStorage.getItem('user');
    if (!raw) return {};
    const u = JSON.parse(raw);
    return u?.user || u || {};
  } catch {
    return {};
  }
}

const formatDate = (s?: string | null) => {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s));
  } catch {
    return s.slice(0, 16);
  }
};

const MarriageSupportDetail: React.FC<Props> = ({ requestId, onClose, onChange }) => {
  const [request, setRequest] = useState<MarriageRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const user = getCurrentUser();
  const userRole = user?.role;
  const userId = user?.id;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await marriageSupportService.getOne(requestId);
      setRequest(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل جلب التفاصيل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const wrapAction = async (label: string, fn: () => Promise<unknown>) => {
    if (acting) return;
    setActing(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
      setInfo(`${label} ✓`);
      await fetchData();
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `فشل: ${label}`);
    } finally {
      setActing(false);
    }
  };

  const onStartReview = () => wrapAction('بدء المراجعة', () => marriageSupportService.startReview(requestId));
  const onGeneratePdf = () => wrapAction('إعداد إقرار الدين', () => marriageSupportService.generatePdf(requestId));
  const onSignCommittee = () => wrapAction('توقيع رئيس اللجنة', () => marriageSupportService.signCommittee(requestId));
  const onChairmanApprove = () => wrapAction('اعتماد رئيس الصندوق', () =>
    marriageSupportService.chairmanApprove(requestId, prompt('ملاحظة (اختيارية):') || undefined)
  );

  const onLinkInitiative = () => {
    const initId = prompt('معرف المبادرة (UUID):');
    if (!initId) return;
    wrapAction('ربط المبادرة', () => marriageSupportService.linkInitiative(requestId, initId));
  };

  const onEnterData = () => {
    const cs = prompt('مجموع المساهمات (ر.س):');
    if (!cs) return;
    const ovrRaw = prompt('عدد العنانيات السابقة (اتركه فارغاً للحساب التلقائي):');
    const asbRaw = prompt('رصيد الدعم الإضافي (ر.س، افتراضي 0):') || '0';
    const savRaw = prompt('قيمة العناية الخاصة (ر.س، افتراضي 0):') || '0';
    const w1 = prompt('UUID الشاهد الأول (اختياري):') || '';
    const w1n = w1 ? prompt('اسم الشاهد الأول:') || '' : '';
    const w2 = prompt('UUID الشاهد الثاني (اختياري):') || '';
    const w2n = w2 ? prompt('اسم الشاهد الثاني:') || '' : '';
    wrapAction('إدخال بيانات الحساب', () =>
      marriageSupportService.enterData(requestId, {
        contributions_sum: Number(cs),
        previous_ananiyat_count_override: ovrRaw ? Number(ovrRaw) : null,
        additional_support_balance: Number(asbRaw),
        special_ananiya_value: Number(savRaw),
        witness_1_id: w1 || null, witness_1_name: w1n || null,
        witness_2_id: w2 || null, witness_2_name: w2n || null,
      })
    );
  };

  const onReject = () => {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    wrapAction('رفض الطلب', () => marriageSupportService.reject(requestId, reason));
  };

  const onDisburse = () => {
    const amtRaw = prompt('مبلغ الصرف الفعلي (ر.س):', String(request?.final_amount || ''));
    if (!amtRaw) return;
    const amt = Number(amtRaw);
    if (!Number.isFinite(amt) || amt <= 0) { setError('المبلغ غير صالح'); return; }
    wrapAction('تسجيل الصرف', () => marriageSupportService.recordDisbursement(requestId, amt, prompt('ملاحظة (اختيارية):') || undefined));
  };

  const onSignWitness = (role: 'witness_1' | 'witness_2') =>
    wrapAction(`توقيع ${SIGNER_ROLE_LABELS_AR[role]}`, () => marriageSupportService.signWitness(requestId, role));

  // ─── action panel decisions ──────────────────────────────────────────────
  const canCommittee = isCommitteeRole(userRole);
  const canChairman = isChairmanRole(userRole);
  const isWitness1 = request && userId && String(request.witness_1_id) === String(userId);
  const isWitness2 = request && userId && String(request.witness_2_id) === String(userId);

  const renderActions = () => {
    if (!request) return null;
    const buttons: React.ReactNode[] = [];
    const status = request.status;

    if (canCommittee) {
      if (status === 'submitted') {
        buttons.push(<button key="sr" onClick={onStartReview} disabled={acting} style={btnPrimary}>بدء المراجعة</button>);
      }
      if (status === 'under_committee_review' || status === 'data_entered') {
        buttons.push(<button key="li" onClick={onLinkInitiative} disabled={acting} style={btnSecondary}>ربط مبادرة</button>);
      }
      if (status === 'under_committee_review') {
        buttons.push(<button key="ed" onClick={onEnterData} disabled={acting} style={btnPrimary}>إدخال البيانات وحساب المبلغ</button>);
      }
      if (status === 'data_entered') {
        buttons.push(<button key="gp" onClick={onGeneratePdf} disabled={acting} style={btnPrimary}>إعداد إقرار الدين وفتح التوقيع</button>);
      }
      if (status === 'awaiting_signatures') {
        // Committee chair signs only after both witnesses (4th signer).
        const sigs = request.signatures || [];
        const haveW1 = sigs.some((s) => s.signer_role === 'witness_1');
        const haveW2 = sigs.some((s) => s.signer_role === 'witness_2');
        const haveBeneficiary = sigs.some((s) => s.signer_role === 'beneficiary');
        if (haveBeneficiary && haveW1 && haveW2) {
          buttons.push(<button key="sc" onClick={onSignCommittee} disabled={acting} style={btnPrimary}>توقيع رئيس اللجنة (الأخير)</button>);
        }
      }
      if (['submitted', 'under_committee_review', 'data_entered', 'awaiting_signatures'].includes(status)) {
        buttons.push(<button key="rj" onClick={onReject} disabled={acting} style={btnDanger}>رفض</button>);
      }
    }

    if (canChairman) {
      if (status === 'signatures_complete') {
        buttons.push(<button key="ca" onClick={onChairmanApprove} disabled={acting} style={btnPrimary}>اعتماد رئيس الصندوق</button>);
      }
      if (status === 'approved_by_chairman') {
        buttons.push(<button key="dis" onClick={onDisburse} disabled={acting} style={btnPrimary}>تسجيل الصرف</button>);
      }
    }

    if (status === 'awaiting_signatures') {
      if (isWitness1) buttons.push(<button key="w1" onClick={() => onSignWitness('witness_1')} disabled={acting} style={btnPrimary}>توقيعي كشاهد أول</button>);
      if (isWitness2) buttons.push(<button key="w2" onClick={() => onSignWitness('witness_2')} disabled={acting} style={btnPrimary}>توقيعي كشاهد ثاني</button>);
    }

    if (buttons.length === 0) {
      return <div style={{ color: '#64748b', fontSize: 13 }}>لا توجد إجراءات متاحة لك في هذه المرحلة</div>;
    }
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{buttons}</div>;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            تفاصيل الطلب {request ? <span style={{ direction: 'ltr', display: 'inline-block' }}>{request.sequence_number}</span> : ''}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {loading && <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل…</div>}
        {error && <div style={errBox}>{error}</div>}
        {info && <div style={infoBox}>{info}</div>}

        {request && (
          <>
            {/* status pill */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ background: STATUS_COLORS[request.status], color: '#fff', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                {STATUS_LABELS_AR[request.status]}
              </span>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <KPI label="مجموع المساهمات" value={fmtAmount(request.contributions_sum)} />
              <KPI label="بعد الخصم" value={fmtAmount(request.after_discount)} />
              <KPI label="الرصيد التنافسي" value={fmtAmount(request.competitive_balance)} />
              <KPI label="المبلغ النهائي" value={fmtAmount(request.final_amount)} highlight />
            </div>

            {/* Applicant + spouse */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card title="بيانات المتقدم">
                <Row k="الاسم">{request.applicant_name || '—'}</Row>
                <Row k="رقم الهوية">{request.national_id || '—'}</Row>
                <Row k="تاريخ الميلاد">{formatDate(request.date_of_birth)}</Row>
              </Card>
              <Card title="بيانات الزواج">
                <Row k="اسم الزوجة">{request.spouse_name_ar || '—'}</Row>
                <Row k="هوية الزوجة">{request.spouse_national_id || '—'}</Row>
                <Row k="تاريخ الزواج">{formatDate(request.marriage_date)}</Row>
              </Card>
            </div>

            {/* Witnesses */}
            <Card title="الشهود">
              <Row k="الشاهد الأول">{request.witness_1_name || '— غير محدد —'}</Row>
              <Row k="الشاهد الثاني">{request.witness_2_name || '— غير محدد —'}</Row>
            </Card>

            {/* Calc inputs */}
            {request.calculated_at && (
              <Card title="بيانات الحساب">
                <Row k="عدد العنانيات (تلقائي)">{request.previous_ananiyat_count_auto ?? '—'}</Row>
                <Row k="عدد العنانيات (override)">{request.previous_ananiyat_count_override ?? '—'}</Row>
                <Row k="رصيد الدعم الإضافي">{fmtAmount(request.additional_support_balance)}</Row>
                <Row k="قيمة العناية الخاصة">{fmtAmount(request.special_ananiya_value)}</Row>
                <Row k="المجموع الأولي">{fmtAmount(request.initial_total)}</Row>
                <Row k="نسبة الخصم المستخدمة">{request.snapshot_competition_discount_rate ? `${(Number(request.snapshot_competition_discount_rate) * 100).toFixed(1)}%` : '—'}</Row>
                <Row k="الحد الأدنى المستخدم">{fmtAmount(request.snapshot_marriage_support_minimum)}</Row>
                <Row k="تاريخ الحساب">{formatDate(request.calculated_at)}</Row>
              </Card>
            )}

            {/* Signatures */}
            <Card title="التوقيعات">
              {(request.signatures || []).length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>لا توجد توقيعات بعد</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(request.signatures || []).map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{SIGNER_ROLE_LABELS_AR[s.signer_role as SignerRole]}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{s.signer_name || s.signer_member_id}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{formatDate(s.signed_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* History */}
            <Card title="سجل الحالات">
              {(request.history || []).length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>لا يوجد سجل</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(request.history || []).map((h) => (
                    <div key={h.id} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#1e293b' }}>
                      <span style={{ color: '#64748b', minWidth: 140 }}>{formatDate(h.changed_at)}</span>
                      <span style={{ color: '#94a3b8' }}>{h.from_status || '—'} → <strong>{h.to_status}</strong></span>
                      {h.note && <span style={{ color: '#475569' }}>· {h.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card title="الإجراءات">{renderActions()}</Card>
          </>
        )}
      </div>
    </div>
  );
};

const KPI: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{
    background: highlight ? '#ecfdf5' : '#f8fafc',
    border: highlight ? '1px solid #10b981' : '1px solid #e5e7eb',
    borderRadius: 10, padding: 12,
  }}>
    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? '#065f46' : '#1e293b' }}>{value}</div>
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
    <span style={{ color: '#64748b', fontSize: 13 }}>{k}</span>
    <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 600 }}>{children}</span>
  </div>
);

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
  display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  paddingTop: 40, paddingBottom: 40, zIndex: 1000, overflowY: 'auto',
  direction: 'rtl',
};
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 20,
  width: 'min(900px, 95vw)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
  fontFamily: 'inherit',
};
const errBox: React.CSSProperties = { background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13 };
const infoBox: React.CSSProperties = { background: '#dcfce7', color: '#166534', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: '#4338ca', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const btnSecondary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#1e293b', border: '1px solid #d1d5db', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const btnDanger: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 };

export default MarriageSupportDetail;
