/**
 * MarriageSupportDetail — modal-style detail for one marriage-support request.
 *
 * Renders KPIs, applicant + spouse cards, calculation breakdown, signatures
 * timeline, status history, and a role-aware action panel.
 */

import React,{ useEffect,useState } from 'react';
import {
fmtAmount,InitiativeOption,isChairmanRole,isCommitteeRole,MarriageRequest,marriageSupportService,MemberOption,SignerRole,SIGNER_ROLE_LABELS_AR,STATUS_COLORS,STATUS_LABELS_AR
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
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showInitiative, setShowInitiative] = useState(false);
  const [initiatives, setInitiatives] = useState<InitiativeOption[]>([]);
  const [selectedInitiativeId, setSelectedInitiativeId] = useState('');
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [contributionsSum, setContributionsSum] = useState('');
  const [previousCount, setPreviousCount] = useState('');
  const [additionalBalance, setAdditionalBalance] = useState('');
  const [specialValue, setSpecialValue] = useState('');
  const [witness1Id, setWitness1Id] = useState('');
  const [witness2Id, setWitness2Id] = useState('');
  const [showChairmanApproval, setShowChairmanApproval] = useState(false);
  const [chairmanNote, setChairmanNote] = useState('');
  const [showDisbursement, setShowDisbursement] = useState(false);
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [disbursementNote, setDisbursementNote] = useState('');

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

  const wrapAction = async (label: string, fn: () => Promise<unknown>): Promise<boolean> => {
    if (acting) return false;
    setActing(true);
    setError(null);
    setInfo(null);
    try {
      const result = await fn() as MarriageRequest | undefined;
      const delivery = result?.notification_delivery;
      const deliveryText = delivery?.deliveredVia === 'push'
        ? ' وتم إشعار العضو داخل التطبيق وعبر التنبيه الفوري'
        : delivery?.deliveredVia === 'whatsapp'
          ? ' وتم إشعار العضو داخل التطبيق وواتساب'
          : delivery?.inAppStored
            ? ' وتم حفظ الإشعار داخل حساب العضو'
            : '';
      setInfo(`${label} بنجاح${deliveryText}`);
      await fetchData();
      onChange();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `فشل: ${label}`);
      return false;
    } finally {
      setActing(false);
    }
  };

  const onStartReview = () => wrapAction('بدء المراجعة', () => marriageSupportService.startReview(requestId));
  const onGeneratePdf = () => wrapAction('إعداد إقرار الدين', () => marriageSupportService.generatePdf(requestId));
  const onSignCommittee = () => wrapAction('توقيع رئيس اللجنة', () => marriageSupportService.signCommittee(requestId));
  const onChairmanApprove = async () => {
    const ok = await wrapAction('اعتماد رئيس الصندوق', () =>
      marriageSupportService.chairmanApprove(requestId, chairmanNote.trim() || undefined)
    );
    if (ok) { setShowChairmanApproval(false); setChairmanNote(''); }
  };

  const openInitiativePicker = async () => {
    setShowInitiative(true);
    setError(null);
    if (initiatives.length > 0) return;
    try {
      setInitiatives(await marriageSupportService.listInitiatives());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل المبادرات');
    }
  };

  const onLinkInitiative = async () => {
    if (!selectedInitiativeId) { setError('اختر المبادرة من القائمة'); return; }
    const ok = await wrapAction('ربط المبادرة', () => marriageSupportService.linkInitiative(requestId, selectedInitiativeId));
    if (ok) setShowInitiative(false);
  };

  const openDataEntry = async () => {
    setShowDataEntry(true);
    setError(null);
    if (members.length > 0) return;
    try {
      setMembers(await marriageSupportService.listMembers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل قائمة الأعضاء');
    }
  };

  const memberName = (id: string) => {
    const member = members.find((item) => item.id === id);
    return member?.full_name_ar || member?.full_name || '';
  };

  const onEnterData = async () => {
    const contributions = contributionsSum === '' ? 0 : Number(contributionsSum);
    if (!Number.isFinite(contributions) || contributions < 0) {
      setError('مبلغ المبادرة يجب أن يكون صفراً أو مبلغاً موجباً');
      return;
    }
    const ok = await wrapAction('إدخال بيانات الحساب', () =>
      marriageSupportService.enterData(requestId, {
        contributions_sum: contributions,
        previous_ananiyat_count_override: previousCount ? Number(previousCount) : null,
        additional_support_balance: Number(additionalBalance || 0),
        special_ananiya_value: Number(specialValue || 0),
        witness_1_id: witness1Id || null, witness_1_name: memberName(witness1Id) || null,
        witness_2_id: witness2Id || null, witness_2_name: memberName(witness2Id) || null,
      })
    );
    if (ok) setShowDataEntry(false);
  };

  const onReject = async () => {
    const reason = rejectReason.trim();
    if (reason.length < 5) { setError('اكتب سبباً واضحاً للرفض لا يقل عن 5 أحرف'); return; }
    const ok = await wrapAction('رفض الطلب', () => marriageSupportService.reject(requestId, reason));
    if (ok) { setShowReject(false); setRejectReason(''); }
  };

  const onDisburse = async () => {
    const amt = Number(disbursementAmount || request?.final_amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) { setError('المبلغ غير صالح'); return; }
    const ok = await wrapAction('تسجيل الصرف', () => marriageSupportService.recordDisbursement(requestId, amt, disbursementNote.trim() || undefined));
    if (ok) { setShowDisbursement(false); setDisbursementAmount(''); setDisbursementNote(''); }
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
        buttons.push(<button key="li" onClick={openInitiativePicker} disabled={acting} style={btnSecondary}>ربط مبادرة (اختياري)</button>);
      }
      if (status === 'under_committee_review') {
        buttons.push(<button key="ed" onClick={openDataEntry} disabled={acting} style={btnPrimary}>إدخال البيانات وحساب المبلغ</button>);
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
        buttons.push(<button key="rj" onClick={() => setShowReject(true)} disabled={acting} style={btnDanger}>رفض مع ذكر السبب</button>);
      }
    }

    if (canChairman) {
      if (status === 'signatures_complete') {
        buttons.push(<button key="ca" onClick={() => setShowChairmanApproval(true)} disabled={acting} style={btnPrimary}>اعتماد رئيس الصندوق</button>);
      }
      if (status === 'approved_by_chairman') {
        buttons.push(<button key="dis" onClick={() => { setDisbursementAmount(String(request.final_amount || '')); setShowDisbursement(true); }} disabled={acting} style={btnPrimary}>تسجيل الصرف</button>);
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

            {request.status === 'rejected' && request.rejection_reason && (
              <div style={{ ...errBox, border: '1px solid #fecaca', padding: 14 }}>
                <strong>سبب الرفض:</strong> {request.rejection_reason}
              </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <KPI label="مجموع المساهمات" value={fmtAmount(request.contributions_sum)} />
              <KPI label="بعد الخصم" value={fmtAmount(request.after_discount)} />
              <KPI label="الرصيد التنافسي" value={fmtAmount(request.competitive_balance)} />
              <KPI label="المبلغ النهائي" value={fmtAmount(request.final_amount)} highlight />
            </div>

            {/* Applicant + spouse */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
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
                      <span style={{ color: '#94a3b8' }}>
                        من {h.from_status ? (STATUS_LABELS_AR[h.from_status as keyof typeof STATUS_LABELS_AR] || h.from_status) : 'إنشاء الطلب'}
                        {' إلى '}
                        <strong>{STATUS_LABELS_AR[h.to_status as keyof typeof STATUS_LABELS_AR] || h.to_status}</strong>
                      </span>
                      {h.note && <span style={{ color: '#475569' }}>· {h.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card title="الإجراءات">
              <div style={stageGuide}>
                <strong>المرحلة الحالية:</strong> {STATUS_LABELS_AR[request.status]}
                <span style={{ color: '#64748b' }}> — كل قرار يُحفظ في السجل ويُرسل للعضو تلقائياً.</span>
              </div>
              {renderActions()}

              {showInitiative && (
                <InlinePanel title="اختيار المبادرة" hint="لا تحتاج إلى كتابة UUID. ربط المبادرة اختياري بالكامل.">
                  <select value={selectedInitiativeId} onChange={(e) => setSelectedInitiativeId(e.target.value)} style={fieldInput}>
                    <option value="">اختر مبادرة…</option>
                    {initiatives.map((initiative) => (
                      <option key={initiative.id} value={initiative.id}>
                        {initiative.title_ar || initiative.title_en || 'مبادرة بدون اسم'} — {fmtAmount(initiative.current_amount)}
                      </option>
                    ))}
                  </select>
                  <PanelActions
                    acting={acting}
                    confirmLabel="تأكيد الربط"
                    onConfirm={onLinkInitiative}
                    onCancel={() => { setShowInitiative(false); setSelectedInitiativeId(''); }}
                  />
                </InlinePanel>
              )}

              {showDataEntry && (
                <InlinePanel title="بيانات الحساب والشهود" hint="مبلغ المبادرة اختياري؛ اتركه فارغاً إذا لم توجد مبادرة.">
                  <div style={formGrid}>
                    <Field label="مبلغ المبادرة (اختياري)">
                      <input type="number" min="0" value={contributionsSum} onChange={(e) => setContributionsSum(e.target.value)} placeholder="0" style={fieldInput} />
                    </Field>
                    <Field label="عدد العنانيات السابقة (اختياري)">
                      <input type="number" min="0" value={previousCount} onChange={(e) => setPreviousCount(e.target.value)} placeholder="حساب تلقائي" style={fieldInput} />
                    </Field>
                    <Field label="رصيد الدعم الإضافي">
                      <input type="number" min="0" value={additionalBalance} onChange={(e) => setAdditionalBalance(e.target.value)} placeholder="0" style={fieldInput} />
                    </Field>
                    <Field label="قيمة العناية الخاصة">
                      <input type="number" min="0" value={specialValue} onChange={(e) => setSpecialValue(e.target.value)} placeholder="0" style={fieldInput} />
                    </Field>
                    <Field label="الشاهد الأول (اختياري)">
                      <select value={witness1Id} onChange={(e) => setWitness1Id(e.target.value)} style={fieldInput}>
                        <option value="">اختر من الأعضاء…</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name_ar || member.full_name || member.membership_number}</option>)}
                      </select>
                    </Field>
                    <Field label="الشاهد الثاني (اختياري)">
                      <select value={witness2Id} onChange={(e) => setWitness2Id(e.target.value)} style={fieldInput}>
                        <option value="">اختر من الأعضاء…</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name_ar || member.full_name || member.membership_number}</option>)}
                      </select>
                    </Field>
                  </div>
                  <PanelActions acting={acting} confirmLabel="حساب المبلغ وحفظ البيانات" onConfirm={onEnterData} onCancel={() => setShowDataEntry(false)} />
                </InlinePanel>
              )}

              {showReject && (
                <InlinePanel title="رفض الطلب" hint="السبب إلزامي وسيظهر للعضو في الإشعار وفي تفاصيل الطلب.">
                  <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبباً واضحاً ومحدداً…" style={{ ...fieldInput, height: 'auto', paddingTop: 10, resize: 'vertical' }} />
                  <PanelActions acting={acting} danger confirmLabel="تأكيد الرفض وإشعار العضو" onConfirm={onReject} onCancel={() => { setShowReject(false); setRejectReason(''); }} />
                </InlinePanel>
              )}

              {showChairmanApproval && (
                <InlinePanel title="اعتماد رئيس الصندوق" hint="الملاحظة اختيارية. سيتم إشعار العضو فور الاعتماد.">
                  <textarea rows={2} value={chairmanNote} onChange={(e) => setChairmanNote(e.target.value)} placeholder="ملاحظة اختيارية…" style={{ ...fieldInput, height: 'auto', paddingTop: 10 }} />
                  <PanelActions acting={acting} confirmLabel="تأكيد الاعتماد وإشعار العضو" onConfirm={onChairmanApprove} onCancel={() => setShowChairmanApproval(false)} />
                </InlinePanel>
              )}

              {showDisbursement && (
                <InlinePanel title="تسجيل الصرف" hint="سيُقفل الطلب كطلب مكتمل ويُنشأ قيد المصروف تلقائياً.">
                  <div style={formGrid}>
                    <Field label="المبلغ المصروف فعلياً">
                      <input type="number" min="1" value={disbursementAmount} onChange={(e) => setDisbursementAmount(e.target.value)} style={fieldInput} />
                    </Field>
                    <Field label="ملاحظة الصرف (اختيارية)">
                      <input value={disbursementNote} onChange={(e) => setDisbursementNote(e.target.value)} style={fieldInput} />
                    </Field>
                  </div>
                  <PanelActions acting={acting} confirmLabel="تأكيد الصرف وإشعار العضو" onConfirm={onDisburse} onCancel={() => setShowDisbursement(false)} />
                </InlinePanel>
              )}
            </Card>
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

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>
    {label}
    {children}
  </label>
);

const InlinePanel: React.FC<{ title: string; hint: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div style={inlinePanel}>
    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</div>
    <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px' }}>{hint}</div>
    {children}
  </div>
);

const PanelActions: React.FC<{
  acting: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}> = ({ acting, confirmLabel, onConfirm, onCancel, danger }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
    <button onClick={onConfirm} disabled={acting} style={danger ? btnDanger : btnPrimary}>
      {acting ? 'جارٍ التنفيذ…' : confirmLabel}
    </button>
    <button onClick={onCancel} disabled={acting} style={btnSecondary}>إلغاء</button>
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
const inlinePanel: React.CSSProperties = { marginTop: 14, padding: 14, border: '1px solid #dbe3ee', background: '#f8fafc', borderRadius: 12 };
const fieldInput: React.CSSProperties = { width: '100%', minHeight: 40, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', background: '#fff', fontFamily: 'inherit', fontSize: 13 };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 };
const stageGuide: React.CSSProperties = { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 };

export default MarriageSupportDetail;
