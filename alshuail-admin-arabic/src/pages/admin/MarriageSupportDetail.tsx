/**
 * MarriageSupportDetail — modal-style detail for one marriage-support request.
 *
 * Renders KPIs, applicant + spouse cards, calculation breakdown, signatures
 * timeline, status history, and a role-aware action panel.
 */

import {
  BellAlertIcon,
  CalculatorIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  LockClosedIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React,{ useEffect,useState } from 'react';
import {
fmtAmount,isChairmanRole,isCommitteeRole,MarriageInitiativeOption,MarriageMemberOption,MarriageRequest,marriageSupportService,SIGNATURE_ORDER,SignerRole,SIGNER_ROLE_LABELS_AR,STATUS_COLORS,STATUS_LABELS_AR
} from '../../services/marriageSupportService';
import RepaymentPlanCard from '../../components/Financing/RepaymentPlanCard';
import { APPROVED_FINANCING_TIERS,isApprovedFinancingPrincipal,nextMonthClampedDate } from '../../utils/financingPolicy';

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

const REJECTABLE_STATUSES = new Set([
  'submitted',
  'under_committee_review',
  'data_entered',
  'awaiting_signatures',
  'signatures_complete',
  'approved_by_chairman',
]);

const normalizeReason = (value: string) => value.trim().replace(/\s+/g, ' ');

const isMeaningfulReason = (value: string) => {
  const meaningfulCharacters = value.match(/[A-Za-z0-9\u0600-\u06FF]/g) || [];
  return meaningfulCharacters.length >= 3;
};

type ActionDialog = 'link-initiative' | 'enter-data' | 'chairman-approval' | null;

interface EnterDataFormState {
  contributionsSum: string;
  previousAnaniyatCountOverride: string;
  additionalSupportBalance: string;
  specialAnaniyaValue: string;
}

type EnterDataField = keyof EnterDataFormState;
type EnterDataErrorField = EnterDataField | 'witness1' | 'witness2';
type EnterDataErrors = Partial<Record<EnterDataErrorField, string>>;

const emptyEnterDataForm = (): EnterDataFormState => ({
  contributionsSum: '',
  previousAnaniyatCountOverride: '',
  additionalSupportBalance: '',
  specialAnaniyaValue: '',
});

const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  active: 'نشطة',
  completed: 'مكتملة',
  archived: 'مؤرشفة',
  cancelled: 'ملغاة',
};

const getInitiativeTitle = (initiative: MarriageInitiativeOption) =>
  initiative.title_ar || initiative.title_en || 'مبادرة دون عنوان';

const validateNonNegativeNumber = (
  value: string,
  label: string,
  options: { required?: boolean; integer?: boolean } = {}
): string | null => {
  const normalized = value.trim();
  if (!normalized) return options.required ? `${label} مطلوب.` : null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return `أدخل ${label} كرقم موجب أو صفر.`;
  if (options.integer && !Number.isInteger(parsed)) return `${label} يجب أن يكون عدداً صحيحاً.`;
  return null;
};

const getSignedRoles = (request: MarriageRequest) =>
  new Set((request.signatures || []).map((signature) => signature.signer_role));

const getNextSignerRole = (request: MarriageRequest): SignerRole | null => {
  if (request.signature_summary?.next_signer_role !== undefined) {
    return request.signature_summary.next_signer_role;
  }
  if (request.next_signer_role !== undefined) {
    return request.next_signer_role;
  }

  const signedRoles = getSignedRoles(request);
  return SIGNATURE_ORDER.find((role) => !signedRoles.has(role)) || null;
};

const getSignerName = (request: MarriageRequest, role: SignerRole): string => {
  const recordedSignature = (request.signatures || []).find((signature) => signature.signer_role === role);
  if (recordedSignature?.signer_name) return recordedSignature.signer_name;

  if (role === getNextSignerRole(request) && request.signature_summary?.next_signer_name) {
    return request.signature_summary.next_signer_name;
  }

  switch (role) {
    case 'beneficiary':
      return request.applicant_name || 'المستفيد';
    case 'witness_1':
      return request.witness_1_name || 'لم يُحدد الاسم';
    case 'witness_2':
      return request.witness_2_name || 'لم يُحدد الاسم';
    case 'committee_chair':
      return 'رئيس لجنة دعم الزواج';
    default:
      return '—';
  }
};

const MarriageSupportDetail: React.FC<Props> = ({ requestId, onClose, onChange }) => {
  const [request, setRequest] = useState<MarriageRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showDisbursement, setShowDisbursement] = useState(false);
  const [disbursementAmount, setDisbursementAmount] = useState('10000');
  const [installmentCount, setInstallmentCount] = useState('10');
  const [firstDueDate, setFirstDueDate] = useState(nextMonthClampedDate);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [initiativeOptions, setInitiativeOptions] = useState<MarriageInitiativeOption[]>([]);
  const [selectedInitiativeId, setSelectedInitiativeId] = useState('');
  const [initiativeSearch, setInitiativeSearch] = useState('');
  const [initiativesLoading, setInitiativesLoading] = useState(false);
  const [initiativesLoadError, setInitiativesLoadError] = useState<string | null>(null);
  const [initiativeSelectionError, setInitiativeSelectionError] = useState<string | null>(null);
  const [enterDataForm, setEnterDataForm] = useState<EnterDataFormState>(emptyEnterDataForm);
  const [enterDataErrors, setEnterDataErrors] = useState<EnterDataErrors>({});
  const [selectedWitness1, setSelectedWitness1] = useState<MarriageMemberOption | null>(null);
  const [selectedWitness2, setSelectedWitness2] = useState<MarriageMemberOption | null>(null);
  const [witness1Search, setWitness1Search] = useState('');
  const [witness2Search, setWitness2Search] = useState('');
  const [witness1Results, setWitness1Results] = useState<MarriageMemberOption[]>([]);
  const [witness2Results, setWitness2Results] = useState<MarriageMemberOption[]>([]);
  const [witness1Searching, setWitness1Searching] = useState(false);
  const [witness2Searching, setWitness2Searching] = useState(false);
  const [witness1SearchError, setWitness1SearchError] = useState<string | null>(null);
  const [witness2SearchError, setWitness2SearchError] = useState<string | null>(null);
  const [chairmanNote, setChairmanNote] = useState('');
  const [chairmanNoteError, setChairmanNoteError] = useState<string | null>(null);
  const actionDialogTrigger = React.useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    setShowRejectModal(false);
    setRejectionReason('');
    setRejectionError(null);
    setActionDialog(null);
    setInitiativeOptions([]);
    setSelectedInitiativeId('');
    setInitiativeSearch('');
    setInitiativesLoadError(null);
    setInitiativeSelectionError(null);
    setEnterDataForm(emptyEnterDataForm());
    setEnterDataErrors({});
    setSelectedWitness1(null);
    setSelectedWitness2(null);
    setWitness1Search('');
    setWitness2Search('');
    setWitness1Results([]);
    setWitness2Results([]);
    setWitness1SearchError(null);
    setWitness2SearchError(null);
    setChairmanNote('');
    setChairmanNoteError(null);
  }, [requestId]);

  useEffect(() => {
    if (!showRejectModal) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !acting) {
        setShowRejectModal(false);
        setRejectionError(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [acting, showRejectModal]);

  useEffect(() => {
    if (!actionDialog) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !acting) {
        setActionDialog(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [actionDialog, acting]);

  useEffect(() => {
    const query = witness1Search.trim();
    if (actionDialog !== 'enter-data' || selectedWitness1 || query.length < 2) {
      setWitness1Results([]);
      setWitness1Searching(false);
      setWitness1SearchError(null);
      return undefined;
    }

    let active = true;
    setWitness1Searching(true);
    const timer = window.setTimeout(async () => {
      setWitness1SearchError(null);
      try {
        const candidates = await marriageSupportService.searchWitnessCandidates(query);
        if (active) {
          setWitness1Results(candidates.filter((candidate) =>
            String(candidate.id) !== String(request?.member_id) &&
            String(candidate.id) !== String(selectedWitness2?.id)
          ));
        }
      } catch (searchError: unknown) {
        if (active) {
          setWitness1Results([]);
          setWitness1SearchError(searchError instanceof Error ? searchError.message : 'تعذر البحث عن الأعضاء.');
        }
      } finally {
        if (active) setWitness1Searching(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [actionDialog, request?.member_id, selectedWitness1, selectedWitness2?.id, witness1Search]);

  useEffect(() => {
    const query = witness2Search.trim();
    if (actionDialog !== 'enter-data' || selectedWitness2 || query.length < 2) {
      setWitness2Results([]);
      setWitness2Searching(false);
      setWitness2SearchError(null);
      return undefined;
    }

    let active = true;
    setWitness2Searching(true);
    const timer = window.setTimeout(async () => {
      setWitness2SearchError(null);
      try {
        const candidates = await marriageSupportService.searchWitnessCandidates(query);
        if (active) {
          setWitness2Results(candidates.filter((candidate) =>
            String(candidate.id) !== String(request?.member_id) &&
            String(candidate.id) !== String(selectedWitness1?.id)
          ));
        }
      } catch (searchError: unknown) {
        if (active) {
          setWitness2Results([]);
          setWitness2SearchError(searchError instanceof Error ? searchError.message : 'تعذر البحث عن الأعضاء.');
        }
      } finally {
        if (active) setWitness2Searching(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [actionDialog, request?.member_id, selectedWitness1?.id, selectedWitness2, witness2Search]);

  const wrapAction = async (label: string, fn: () => Promise<unknown>): Promise<boolean> => {
    if (acting) return false;
    setActing(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
      setInfo(`${label} ✓`);
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

  const closeActionDialog = () => {
    if (acting) return;
    setActionDialog(null);
    window.setTimeout(() => {
      if (actionDialogTrigger.current?.isConnected) actionDialogTrigger.current.focus();
    }, 0);
  };

  const loadInitiativeOptions = async () => {
    setInitiativesLoading(true);
    setInitiativesLoadError(null);
    try {
      const options = await marriageSupportService.listInitiativeOptions();
      setInitiativeOptions(options);
    } catch (loadError: unknown) {
      setInitiativeOptions([]);
      setInitiativesLoadError(loadError instanceof Error ? loadError.message : 'تعذر تحميل قائمة المبادرات.');
    } finally {
      setInitiativesLoading(false);
    }
  };

  const openLinkInitiativeDialog = () => {
    actionDialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedInitiativeId(request?.linked_initiative_id || '');
    setInitiativeSearch('');
    setInitiativeSelectionError(null);
    setActionDialog('link-initiative');
    void loadInitiativeOptions();
  };

  const onLinkInitiative = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedInitiative = initiativeOptions.find((initiative) => initiative.id === selectedInitiativeId);
    if (!selectedInitiative) {
      setInitiativeSelectionError('اختر مبادرة من القائمة قبل المتابعة.');
      return;
    }

    setInitiativeSelectionError(null);
    const succeeded = await wrapAction('ربط المبادرة', () =>
      marriageSupportService.linkInitiative(requestId, selectedInitiative.id)
    );
    if (succeeded) closeActionDialog();
  };

  const openEnterDataDialog = () => {
    actionDialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEnterDataForm({
      contributionsSum: request?.contributions_sum == null ? '' : String(request.contributions_sum),
      previousAnaniyatCountOverride: request?.previous_ananiyat_count_override == null
        ? ''
        : String(request.previous_ananiyat_count_override),
      additionalSupportBalance: request?.additional_support_balance == null
        ? ''
        : String(request.additional_support_balance),
      specialAnaniyaValue: request?.special_ananiya_value == null
        ? ''
        : String(request.special_ananiya_value),
    });
    setSelectedWitness1(request?.witness_1_id ? {
      id: request.witness_1_id,
      full_name: request.witness_1_name || 'الشاهد الأول',
    } : null);
    setSelectedWitness2(request?.witness_2_id ? {
      id: request.witness_2_id,
      full_name: request.witness_2_name || 'الشاهد الثاني',
    } : null);
    setWitness1Search('');
    setWitness2Search('');
    setWitness1Results([]);
    setWitness2Results([]);
    setWitness1SearchError(null);
    setWitness2SearchError(null);
    setEnterDataErrors({});
    setActionDialog('enter-data');
  };

  const updateEnterDataField = (field: EnterDataField, value: string) => {
    setEnterDataForm((current) => ({ ...current, [field]: value }));
    setEnterDataErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const onEnterData = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: EnterDataErrors = {};
    const contributionsError = validateNonNegativeNumber(
      enterDataForm.contributionsSum,
      'مجموع المساهمات',
      { required: true }
    );
    const previousCountError = validateNonNegativeNumber(
      enterDataForm.previousAnaniyatCountOverride,
      'عدد العنانيات السابقة',
      { integer: true }
    );
    const additionalBalanceError = validateNonNegativeNumber(
      enterDataForm.additionalSupportBalance,
      'رصيد الدعم الإضافي'
    );
    const specialValueError = validateNonNegativeNumber(
      enterDataForm.specialAnaniyaValue,
      'قيمة العناية الخاصة'
    );

    if (contributionsError) nextErrors.contributionsSum = contributionsError;
    if (previousCountError) nextErrors.previousAnaniyatCountOverride = previousCountError;
    if (additionalBalanceError) nextErrors.additionalSupportBalance = additionalBalanceError;
    if (specialValueError) nextErrors.specialAnaniyaValue = specialValueError;

    const witness1Id = selectedWitness1?.id || '';
    const witness2Id = selectedWitness2?.id || '';
    const witness1Name = normalizeReason(selectedWitness1?.full_name || '');
    const witness2Name = normalizeReason(selectedWitness2?.full_name || '');

    if (!selectedWitness1 || !witness1Name) nextErrors.witness1 = 'اختر الشاهد الأول من نتائج البحث.';
    if (!selectedWitness2 || !witness2Name) nextErrors.witness2 = 'اختر الشاهد الثاني من نتائج البحث.';
    if (witness1Id && String(witness1Id) === String(request?.member_id)) {
      nextErrors.witness1 = 'لا يمكن اختيار المستفيد نفسه شاهداً على الطلب.';
    }
    if (witness2Id && String(witness2Id) === String(request?.member_id)) {
      nextErrors.witness2 = 'لا يمكن اختيار المستفيد نفسه شاهداً على الطلب.';
    }
    if (witness1Id && witness2Id && String(witness1Id) === String(witness2Id)) {
      nextErrors.witness2 = 'اختر عضوين مختلفين للشهادة على الطلب.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setEnterDataErrors(nextErrors);
      return;
    }

    setEnterDataErrors({});
    const previousCount = enterDataForm.previousAnaniyatCountOverride.trim();
    const succeeded = await wrapAction('إدخال بيانات الحساب', () =>
      marriageSupportService.enterData(requestId, {
        contributions_sum: Number(enterDataForm.contributionsSum),
        previous_ananiyat_count_override: previousCount ? Number(previousCount) : null,
        additional_support_balance: enterDataForm.additionalSupportBalance.trim()
          ? Number(enterDataForm.additionalSupportBalance)
          : 0,
        special_ananiya_value: enterDataForm.specialAnaniyaValue.trim()
          ? Number(enterDataForm.specialAnaniyaValue)
          : 0,
        witness_1_id: witness1Id,
        witness_1_name: witness1Name,
        witness_2_id: witness2Id,
        witness_2_name: witness2Name,
      })
    );
    if (succeeded) closeActionDialog();
  };

  const openChairmanApprovalDialog = () => {
    actionDialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChairmanNote(request?.chairman_note || '');
    setChairmanNoteError(null);
    setActionDialog('chairman-approval');
  };

  const onChairmanApprove = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedNote = normalizeReason(chairmanNote);
    if (normalizedNote.length > 500) {
      setChairmanNoteError('يجب ألا تتجاوز الملاحظة 500 حرف.');
      return;
    }

    setChairmanNoteError(null);
    const succeeded = await wrapAction('اعتماد رئيس الصندوق', () =>
      marriageSupportService.chairmanApprove(requestId, normalizedNote || undefined)
    );
    if (succeeded) closeActionDialog();
  };

  const openRejectModal = () => {
    setRejectionReason('');
    setRejectionError(null);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    if (acting) return;
    setShowRejectModal(false);
    setRejectionError(null);
  };

  const onReject = async () => {
    const normalizedReason = normalizeReason(rejectionReason);
    if (!isMeaningfulReason(normalizedReason)) {
      setRejectionError('اكتب سبباً واضحاً من ثلاثة أحرف أو أرقام مفيدة على الأقل.');
      return;
    }

    setRejectionError(null);
    const succeeded = await wrapAction('تم رفض الطلب', () =>
      marriageSupportService.reject(requestId, normalizedReason)
    );
    if (succeeded) {
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const onDisburse = async () => {
    const amt = Number(disbursementAmount);
    const months = Number(installmentCount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('المبلغ غير صالح'); return; }
    if (!isApprovedFinancingPrincipal(amt)) { setError('اختر باقة صرف معتمدة'); return; }
    if (!Number.isInteger(months) || months < 1 || months > 12 || !firstDueDate) {
      setError('يرجى تحديد عدد الأقساط وتاريخ أول قسط');
      return;
    }
    const succeeded = await wrapAction('تسجيل الصرف وتفعيل الأقساط', () =>
      marriageSupportService.recordDisbursement(requestId, amt, months, firstDueDate)
    );
    if (succeeded) setShowDisbursement(false);
  };

  const onSignWitness = (role: 'witness_1' | 'witness_2') =>
    wrapAction(`توقيع ${SIGNER_ROLE_LABELS_AR[role]}`, () => marriageSupportService.signWitness(requestId, role));

  // ─── action panel decisions ──────────────────────────────────────────────
  const canCommittee = isCommitteeRole(userRole);
  const canChairman = isChairmanRole(userRole);
  const isWitness1 = request && userId && String(request.witness_1_id) === String(userId);
  const isWitness2 = request && userId && String(request.witness_2_id) === String(userId);
  const nextSignerRole = request ? getNextSignerRole(request) : null;
  const assignedCommitteeChairName = request?.committee_chair_id && userId &&
    String(request.committee_chair_id) === String(userId)
    ? user.full_name_ar
    : undefined;
  const nextSignerName = request && nextSignerRole
    ? (nextSignerRole === 'committee_chair' && assignedCommitteeChairName) || getSignerName(request, nextSignerRole)
    : null;

  const canCurrentUserSignAs = (role: SignerRole) => {
    if (!request || request.status !== 'awaiting_signatures' || nextSignerRole !== role) return false;

    if (request.can_current_user_sign !== undefined) {
      return request.can_current_user_sign && request.participant_role === role;
    }

    if (role === 'witness_1') return Boolean(isWitness1);
    if (role === 'witness_2') return Boolean(isWitness2);
    if (role === 'committee_chair') {
      if (!canCommittee) return false;
      return !request.committee_chair_id || String(request.committee_chair_id) === String(userId);
    }
    return false;
  };

  const onRemindNextSigner = async () => {
    const recipient = nextSignerName && nextSignerName !== 'لم يُحدد الاسم'
      ? ` إلى ${nextSignerName}`
      : '';
    setReminding(true);
    try {
      return await wrapAction(`تم إرسال التذكير${recipient}`, () =>
        marriageSupportService.remindNextSigner(requestId)
      );
    } finally {
      setReminding(false);
    }
  };

  const renderActions = () => {
    if (!request) return null;
    const buttons: React.ReactNode[] = [];
    const status = request.status;

    if (canCommittee) {
      if (status === 'submitted') {
        buttons.push(<button key="sr" onClick={onStartReview} disabled={acting} style={btnPrimary}>بدء المراجعة</button>);
      }
      if (status === 'under_committee_review' || status === 'data_entered') {
        buttons.push(<button key="li" onClick={openLinkInitiativeDialog} disabled={acting} style={btnSecondary}>ربط مبادرة</button>);
      }
      if (status === 'under_committee_review') {
        buttons.push(<button key="ed" onClick={openEnterDataDialog} disabled={acting} style={btnPrimary}>إدخال البيانات وحساب المبلغ</button>);
      }
      if (status === 'data_entered') {
        buttons.push(<button key="gp" onClick={onGeneratePdf} disabled={acting} style={btnPrimary}>إعداد إقرار الدين وفتح التوقيع</button>);
      }
      if (canCurrentUserSignAs('committee_chair')) {
        buttons.push(
          <button key="sc" onClick={onSignCommittee} disabled={acting} style={btnPrimary}>
            توقيعك بصفتك رئيس اللجنة (الأخير)
          </button>
        );
      }
      if (REJECTABLE_STATUSES.has(status)) {
        buttons.push(<button key="rj" onClick={openRejectModal} disabled={acting} style={btnDanger}>رفض الطلب</button>);
      }
    }

    if (canChairman) {
      if (status === 'signatures_complete') {
        buttons.push(<button key="ca" onClick={openChairmanApprovalDialog} disabled={acting} style={btnPrimary}>اعتماد رئيس الصندوق</button>);
      }
      if (status === 'approved_by_chairman') {
        buttons.push(<button key="dis" onClick={() => setShowDisbursement(true)} disabled={acting} style={btnPrimary}>إعداد الصرف والأقساط</button>);
      }
    }

    if (status === 'awaiting_signatures') {
      if (canCurrentUserSignAs('witness_1')) {
        buttons.push(<button key="w1" onClick={() => onSignWitness('witness_1')} disabled={acting} style={btnPrimary}>توقيعك كشاهد أول</button>);
      }
      if (canCurrentUserSignAs('witness_2')) {
        buttons.push(<button key="w2" onClick={() => onSignWitness('witness_2')} disabled={acting} style={btnPrimary}>توقيعك كشاهد ثانٍ</button>);
      }
    }

    if (buttons.length === 0) {
      return <div style={{ color: '#64748b', fontSize: 13 }}>لا توجد إجراءات متاحة لك في هذه المرحلة</div>;
    }
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{buttons}</div>;
  };

  const normalizedInitiativeSearch = initiativeSearch.trim().toLocaleLowerCase('ar');
  const visibleInitiatives = initiativeOptions.filter((initiative) =>
    !normalizedInitiativeSearch || getInitiativeTitle(initiative).toLocaleLowerCase('ar').includes(normalizedInitiativeSearch)
  );
  const selectedInitiative = initiativeOptions.find((initiative) => initiative.id === selectedInitiativeId) || null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{marriageSupportStyles}</style>
      <div
        className="marriage-support-modal"
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="marriage-support-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 id="marriage-support-detail-title" style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            تفاصيل الطلب {request ? <span style={{ direction: 'ltr', display: 'inline-block' }}>{request.sequence_number}</span> : ''}
          </h2>
          <button onClick={onClose} className="marriage-icon-button" aria-label="إغلاق تفاصيل الطلب">
            <XMarkIcon aria-hidden="true" />
          </button>
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

            {(request.status === 'rejected' || request.rejection_reason) && (
              <div className="marriage-rejection-banner" role="note" aria-label="سبب رفض الطلب">
                <div className="marriage-rejection-icon"><ExclamationTriangleIcon aria-hidden="true" /></div>
                <div>
                  <div className="marriage-rejection-title">سبب رفض الطلب</div>
                  <div className="marriage-rejection-text">
                    {request.rejection_reason || 'لم يُسجل سبب الرفض.'}
                  </div>
                  {request.rejected_at && (
                    <div className="marriage-rejection-date">سُجل في {formatDate(request.rejected_at)}</div>
                  )}
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="marriage-kpi-grid">
              <KPI label="مجموع المساهمات" value={fmtAmount(request.contributions_sum)} />
              <KPI label="بعد الخصم" value={fmtAmount(request.after_discount)} />
              <KPI label="الرصيد التنافسي" value={fmtAmount(request.competitive_balance)} />
              <KPI label="المبلغ النهائي" value={fmtAmount(request.final_amount)} highlight />
            </div>

            {/* Applicant + spouse */}
            <div className="marriage-party-grid">
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

            {request.repayment_plan && <RepaymentPlanCard plan={request.repayment_plan} />}

            {/* Signatures */}
            <SignatureWorkflow
              request={request}
              acting={acting}
              reminding={reminding}
              canRemind={canCommittee}
              committeeChairName={assignedCommitteeChairName}
              onRemind={onRemindNextSigner}
            />

            {/* History */}
            <Card title="سجل الحالات">
              {(request.history || []).length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>لا يوجد سجل</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(request.history || []).map((h) => (
                    <div key={h.id} className="marriage-history-row">
                      <span style={{ color: '#64748b', minWidth: 140 }}>{formatDate(h.changed_at)}</span>
                      <span style={{ color: '#94a3b8' }}>{h.from_status || '—'} → <strong>{h.to_status}</strong></span>
                      {h.note && <span style={{ color: '#475569' }}>· {h.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card title="الإجراءات">
              {renderActions()}
              {showDisbursement && (
                <div style={{ marginTop: 14, padding: 14, border: '1px solid #d8e7dc', background: '#f7fcf8', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: '#123d2d', marginBottom: 10 }}>إعداد باقة دعم الزواج وجدول السداد</div>
                  <div className="marriage-disbursement-grid">
                    <label style={fieldLabel}>
                      مبلغ الصرف
                      <select value={disbursementAmount} onChange={(e) => setDisbursementAmount(e.target.value)} style={fieldInput}>
                        {APPROVED_FINANCING_TIERS.map((tier) => (
                          <option key={tier.principal} value={tier.principal}>
                            {tier.principal.toLocaleString('en-US')} ر.س + {tier.fee.toLocaleString('en-US')} رسوم
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={fieldLabel}>
                      عدد الأشهر (حتى سنة)
                      <select value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} style={fieldInput}>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                          <option key={count} value={count}>{count} {count === 10 ? '— الافتراضي' : ''}</option>
                        ))}
                      </select>
                    </label>
                    <label style={fieldLabel}>
                      أول تاريخ استحقاق
                      <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} style={fieldInput} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={onDisburse} disabled={acting} style={btnPrimary}>تأكيد الصرف وتفعيل الأقساط</button>
                    <button onClick={() => setShowDisbursement(false)} disabled={acting} style={btnSecondary}>إلغاء</button>
                  </div>
                </div>
              )}
            </Card>

            {actionDialog === 'link-initiative' && (
              <ActionModal
                title="ربط مبادرة بالطلب"
                description="ابحث باسم المبادرة ثم اخترها لاحتساب مساهماتها ضمن دعم الزواج."
                titleId="marriage-link-initiative-title"
                icon={<LinkIcon aria-hidden="true" />}
                acting={acting}
                onClose={closeActionDialog}
              >
                <form onSubmit={onLinkInitiative} noValidate>
                  <fieldset className="marriage-action-fieldset" disabled={acting}>
                    <FormField
                      id="marriage-initiative-search"
                      label="البحث باسم المبادرة"
                      hint="اكتب جزءاً من اسم المبادرة لتصفية القائمة."
                    >
                      <input
                        id="marriage-initiative-search"
                        className="marriage-action-input"
                        value={initiativeSearch}
                        onChange={(event) => setInitiativeSearch(event.target.value)}
                        autoFocus
                        autoComplete="off"
                        aria-describedby="marriage-initiative-search-hint"
                        placeholder="مثال: دعم زواج محمد"
                      />
                    </FormField>

                    {initiativesLoading ? (
                      <div className="marriage-picker-state" role="status">جارٍ تحميل المبادرات…</div>
                    ) : initiativesLoadError ? (
                      <div className="marriage-picker-state is-error" role="alert">
                        <span>{initiativesLoadError}</span>
                        <button type="button" onClick={() => void loadInitiativeOptions()} style={btnSecondary}>
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : initiativeOptions.length === 0 ? (
                      <div className="marriage-picker-state">لا توجد مبادرات متاحة للربط حالياً.</div>
                    ) : visibleInitiatives.length === 0 ? (
                      <div className="marriage-picker-state">لا توجد مبادرة تطابق عبارة البحث.</div>
                    ) : (
                      <FormField
                        id="marriage-initiative-select"
                        label="اختر المبادرة"
                        required
                        error={initiativeSelectionError || undefined}
                      >
                        <select
                          id="marriage-initiative-select"
                          className={`marriage-action-input marriage-action-select${initiativeSelectionError ? ' has-error' : ''}`}
                          value={selectedInitiativeId}
                          onChange={(event) => {
                            setSelectedInitiativeId(event.target.value);
                            if (initiativeSelectionError) setInitiativeSelectionError(null);
                          }}
                          aria-required="true"
                          aria-invalid={Boolean(initiativeSelectionError)}
                          aria-describedby={initiativeSelectionError ? 'marriage-initiative-select-error' : undefined}
                        >
                          <option value="">اختر مبادرة…</option>
                          {visibleInitiatives.map((initiative) => (
                            <option key={initiative.id} value={initiative.id}>
                              {getInitiativeTitle(initiative)} — {INITIATIVE_STATUS_LABELS[initiative.status] || initiative.status} — {fmtAmount(initiative.current_amount)}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    )}

                    {selectedInitiative && (
                      <div className="marriage-selected-initiative" aria-live="polite">
                        <div>
                          <span>المبادرة المختارة</span>
                          <strong>{getInitiativeTitle(selectedInitiative)}</strong>
                        </div>
                        <div className="marriage-initiative-metrics">
                          <span>{INITIATIVE_STATUS_LABELS[selectedInitiative.status] || selectedInitiative.status}</span>
                          <span>المحصّل: {fmtAmount(selectedInitiative.current_amount)}</span>
                          <span>المستهدف: {fmtAmount(selectedInitiative.target_amount)}</span>
                        </div>
                      </div>
                    )}

                    {initiativeSelectionError && visibleInitiatives.length === 0 && (
                      <div className="marriage-field-error" role="alert">{initiativeSelectionError}</div>
                    )}
                    <DialogActions
                      acting={acting}
                      disabled={initiativesLoading || Boolean(initiativesLoadError) || initiativeOptions.length === 0}
                      submitLabel="ربط المبادرة"
                      loadingLabel="جارٍ ربط المبادرة…"
                      onCancel={closeActionDialog}
                    />
                  </fieldset>
                </form>
              </ActionModal>
            )}

            {actionDialog === 'enter-data' && (
              <ActionModal
                title="إدخال البيانات وحساب المبلغ"
                description="راجع بيانات الحساب وحدد شاهدين مختلفين. الحقول الاختيارية الفارغة تُحتسب تلقائياً أو بقيمة صفر."
                titleId="marriage-enter-data-title"
                icon={<CalculatorIcon aria-hidden="true" />}
                acting={acting}
                onClose={closeActionDialog}
                wide
              >
                <form onSubmit={onEnterData} noValidate>
                  <fieldset className="marriage-action-fieldset" disabled={acting}>
                    <div className="marriage-form-section">
                      <div className="marriage-form-section-heading">
                        <strong>بيانات الحساب</strong>
                        <span>المبالغ بالريال السعودي</span>
                      </div>
                      <div className="marriage-action-grid">
                        <FormField
                          id="marriage-contributions-sum"
                          label="مجموع المساهمات"
                          required
                          error={enterDataErrors.contributionsSum}
                        >
                          <input
                            id="marriage-contributions-sum"
                            className={`marriage-action-input marriage-ltr-input${enterDataErrors.contributionsSum ? ' has-error' : ''}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={enterDataForm.contributionsSum}
                            onChange={(event) => updateEnterDataField('contributionsSum', event.target.value)}
                            autoFocus
                            dir="ltr"
                            aria-required="true"
                            aria-invalid={Boolean(enterDataErrors.contributionsSum)}
                            aria-describedby={enterDataErrors.contributionsSum ? 'marriage-contributions-sum-error' : undefined}
                            placeholder="0.00"
                          />
                        </FormField>
                        <FormField
                          id="marriage-previous-count"
                          label="عدد العنانيات السابقة"
                          error={enterDataErrors.previousAnaniyatCountOverride}
                          hint="اختياري — اتركه فارغاً للحساب التلقائي."
                        >
                          <input
                            id="marriage-previous-count"
                            className={`marriage-action-input marriage-ltr-input${enterDataErrors.previousAnaniyatCountOverride ? ' has-error' : ''}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={enterDataForm.previousAnaniyatCountOverride}
                            onChange={(event) => updateEnterDataField('previousAnaniyatCountOverride', event.target.value)}
                            dir="ltr"
                            aria-invalid={Boolean(enterDataErrors.previousAnaniyatCountOverride)}
                            aria-describedby={enterDataErrors.previousAnaniyatCountOverride
                              ? 'marriage-previous-count-error'
                              : 'marriage-previous-count-hint'}
                            placeholder="تلقائي"
                          />
                        </FormField>
                        <FormField
                          id="marriage-additional-balance"
                          label="رصيد الدعم الإضافي"
                          error={enterDataErrors.additionalSupportBalance}
                          hint="اختياري — القيمة الافتراضية صفر."
                        >
                          <input
                            id="marriage-additional-balance"
                            className={`marriage-action-input marriage-ltr-input${enterDataErrors.additionalSupportBalance ? ' has-error' : ''}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={enterDataForm.additionalSupportBalance}
                            onChange={(event) => updateEnterDataField('additionalSupportBalance', event.target.value)}
                            dir="ltr"
                            aria-invalid={Boolean(enterDataErrors.additionalSupportBalance)}
                            aria-describedby={enterDataErrors.additionalSupportBalance
                              ? 'marriage-additional-balance-error'
                              : 'marriage-additional-balance-hint'}
                            placeholder="0.00"
                          />
                        </FormField>
                        <FormField
                          id="marriage-special-value"
                          label="قيمة العناية الخاصة"
                          error={enterDataErrors.specialAnaniyaValue}
                          hint="اختياري — القيمة الافتراضية صفر."
                        >
                          <input
                            id="marriage-special-value"
                            className={`marriage-action-input marriage-ltr-input${enterDataErrors.specialAnaniyaValue ? ' has-error' : ''}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={enterDataForm.specialAnaniyaValue}
                            onChange={(event) => updateEnterDataField('specialAnaniyaValue', event.target.value)}
                            dir="ltr"
                            aria-invalid={Boolean(enterDataErrors.specialAnaniyaValue)}
                            aria-describedby={enterDataErrors.specialAnaniyaValue
                              ? 'marriage-special-value-error'
                              : 'marriage-special-value-hint'}
                            placeholder="0.00"
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="marriage-form-section marriage-witness-section">
                      <div className="marriage-form-section-heading">
                        <strong>بيانات الشهود</strong>
                        <span>ابحث عن عضوين مختلفين؛ لا يمكن اختيار المستفيد نفسه.</span>
                      </div>
                      <div className="marriage-witness-grid">
                        <div className="marriage-witness-card">
                          <span className="marriage-witness-number">الشاهد الأول</span>
                          <MemberPicker
                            idPrefix="marriage-witness-1"
                            label="اختيار الشاهد الأول"
                            query={witness1Search}
                            onQueryChange={setWitness1Search}
                            results={witness1Results}
                            selected={selectedWitness1}
                            searching={witness1Searching}
                            searchError={witness1SearchError}
                            validationError={enterDataErrors.witness1}
                            onSelect={(member) => {
                              setSelectedWitness1(member);
                              setWitness1Search('');
                              setWitness1Results([]);
                              setEnterDataErrors((current) => {
                                const next = { ...current };
                                delete next.witness1;
                                return next;
                              });
                            }}
                            onClear={() => {
                              setSelectedWitness1(null);
                              setWitness1Search('');
                            }}
                          />
                        </div>

                        <div className="marriage-witness-card">
                          <span className="marriage-witness-number">الشاهد الثاني</span>
                          <MemberPicker
                            idPrefix="marriage-witness-2"
                            label="اختيار الشاهد الثاني"
                            query={witness2Search}
                            onQueryChange={setWitness2Search}
                            results={witness2Results}
                            selected={selectedWitness2}
                            searching={witness2Searching}
                            searchError={witness2SearchError}
                            validationError={enterDataErrors.witness2}
                            onSelect={(member) => {
                              setSelectedWitness2(member);
                              setWitness2Search('');
                              setWitness2Results([]);
                              setEnterDataErrors((current) => {
                                const next = { ...current };
                                delete next.witness2;
                                return next;
                              });
                            }}
                            onClear={() => {
                              setSelectedWitness2(null);
                              setWitness2Search('');
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <DialogActions
                      acting={acting}
                      submitLabel="حفظ البيانات وحساب المبلغ"
                      loadingLabel="جارٍ الحفظ والحساب…"
                      onCancel={closeActionDialog}
                    />
                  </fieldset>
                </form>
              </ActionModal>
            )}

            {actionDialog === 'chairman-approval' && (
              <ActionModal
                title="اعتماد رئيس الصندوق"
                description="راجع القرار وأضف ملاحظة اختيارية قبل اعتماد الطلب نهائياً للانتقال إلى مرحلة الصرف."
                titleId="marriage-chairman-approval-title"
                icon={<ChatBubbleBottomCenterTextIcon aria-hidden="true" />}
                acting={acting}
                onClose={closeActionDialog}
              >
                <form onSubmit={onChairmanApprove} noValidate>
                  <fieldset className="marriage-action-fieldset" disabled={acting}>
                    <FormField
                      id="marriage-chairman-note"
                      label="ملاحظة رئيس الصندوق"
                      error={chairmanNoteError}
                      hint="اختيارية — ستُحفظ ضمن سجل الطلب."
                    >
                      <textarea
                        id="marriage-chairman-note"
                        className={`marriage-action-textarea${chairmanNoteError ? ' has-error' : ''}`}
                        value={chairmanNote}
                        onChange={(event) => {
                          setChairmanNote(event.target.value);
                          if (chairmanNoteError) setChairmanNoteError(null);
                        }}
                        rows={5}
                        maxLength={500}
                        autoFocus
                        aria-invalid={Boolean(chairmanNoteError)}
                        aria-describedby={chairmanNoteError
                          ? 'marriage-chairman-note-error'
                          : 'marriage-chairman-note-hint'}
                        placeholder="اكتب ملاحظة مختصرة عند الحاجة…"
                      />
                    </FormField>
                    <div className="marriage-character-count" dir="ltr">{chairmanNote.length} / 500</div>
                    <DialogActions
                      acting={acting}
                      submitLabel="تأكيد اعتماد الطلب"
                      loadingLabel="جارٍ اعتماد الطلب…"
                      onCancel={closeActionDialog}
                    />
                  </fieldset>
                </form>
              </ActionModal>
            )}

            {showRejectModal && (
              <div className="marriage-reject-backdrop" onClick={closeRejectModal}>
                <section
                  className="marriage-reject-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="marriage-reject-title"
                  aria-describedby="marriage-reject-description"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="marriage-reject-heading">
                    <div className="marriage-reject-heading-icon">
                      <ExclamationTriangleIcon aria-hidden="true" />
                    </div>
                    <div>
                      <h3 id="marriage-reject-title">تأكيد رفض الطلب</h3>
                      <p id="marriage-reject-description">
                        سيظهر السبب للجهات المخولة في سجل الطلب، ولا يمكن التراجع عن الرفض من هذه الشاشة.
                      </p>
                    </div>
                  </div>

                  <label className="marriage-reject-label" htmlFor="marriage-rejection-reason">
                    سبب الرفض <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="marriage-rejection-reason"
                    className={`marriage-reject-textarea${rejectionError ? ' has-error' : ''}`}
                    value={rejectionReason}
                    onChange={(event) => {
                      setRejectionReason(event.target.value);
                      if (rejectionError) setRejectionError(null);
                    }}
                    maxLength={500}
                    rows={5}
                    autoFocus
                    disabled={acting}
                    aria-invalid={Boolean(rejectionError)}
                    aria-describedby={rejectionError ? 'marriage-rejection-error' : undefined}
                    placeholder="مثال: المستندات المقدمة غير مكتملة، ويلزم إرفاق عقد الزواج المعتمد."
                  />
                  <div className="marriage-reject-meta">
                    <span>اكتب سبباً محدداً وواضحاً.</span>
                    <span dir="ltr">{rejectionReason.length} / 500</span>
                  </div>
                  {rejectionError && (
                    <div id="marriage-rejection-error" className="marriage-reject-error" role="alert">
                      {rejectionError}
                    </div>
                  )}

                  <div className="marriage-reject-actions">
                    <button type="button" onClick={onReject} disabled={acting} style={btnDanger}>
                      {acting ? 'جارٍ تسجيل الرفض…' : 'تأكيد الرفض'}
                    </button>
                    <button type="button" onClick={closeRejectModal} disabled={acting} style={btnSecondary}>
                      إلغاء
                    </button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface ActionModalProps {
  title: string;
  description: string;
  titleId: string;
  icon: React.ReactNode;
  acting: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

interface MemberPickerProps {
  idPrefix: string;
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  results: MarriageMemberOption[];
  selected: MarriageMemberOption | null;
  searching: boolean;
  searchError: string | null;
  validationError?: string;
  onSelect: (member: MarriageMemberOption) => void;
  onClear: () => void;
}

const MemberPicker: React.FC<MemberPickerProps> = ({
  idPrefix,
  label,
  query,
  onQueryChange,
  results,
  selected,
  searching,
  searchError,
  validationError,
  onSelect,
  onClear,
}) => {
  const listId = `${idPrefix}-results`;

  if (selected) {
    return (
      <div className="marriage-selected-member" aria-live="polite">
        <div>
          <strong>{selected.full_name}</strong>
          <span>
            {selected.membership_number ? `رقم العضوية: ${selected.membership_number}` : 'رقم العضوية غير متاح'}
            {' · '}
            {selected.phone || 'الهاتف غير متاح'}
          </span>
        </div>
        <button type="button" onClick={onClear} className="marriage-change-selection">
          تغيير الاختيار
        </button>
      </div>
    );
  }

  return (
    <div className="marriage-member-picker">
      <FormField
        id={`${idPrefix}-search`}
        label={label}
        required
        error={validationError}
        hint="ابحث بالاسم أو الهاتف أو رقم العضوية (حرفان على الأقل)."
      >
        <input
          id={`${idPrefix}-search`}
          className={`marriage-action-input${validationError ? ' has-error' : ''}`}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-required="true"
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? `${idPrefix}-search-error` : `${idPrefix}-search-hint`}
          placeholder="اكتب اسم العضو أو هاتفه أو رقم عضويته"
        />
      </FormField>

      {searching && <div className="marriage-member-search-state" role="status">جارٍ البحث عن الأعضاء…</div>}
      {searchError && <div className="marriage-member-search-state is-error" role="alert">{searchError}</div>}
      {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && (
        <div className="marriage-member-search-state">لا توجد نتائج مطابقة أو أن الأعضاء المطابقين غير مؤهلين لهذا الاختيار.</div>
      )}
      {results.length > 0 && (
        <div id={listId} className="marriage-member-results" role="listbox" aria-label={`نتائج ${label}`}>
          {results.map((member) => (
            <button
              key={member.id}
              type="button"
              role="option"
              aria-selected="false"
              className="marriage-member-result"
              onClick={() => onSelect(member)}
            >
              <strong>{member.full_name}</strong>
              <span>
                {member.membership_number ? `عضوية ${member.membership_number}` : 'دون رقم عضوية'}
                {' · '}
                {member.phone || 'دون رقم هاتف'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ActionModal: React.FC<ActionModalProps> = ({
  title,
  description,
  titleId,
  icon,
  acting,
  onClose,
  children,
  wide = false,
}) => {
  const dialogRef = React.useRef<HTMLElement | null>(null);

  const keepFocusInsideDialog = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute('hidden'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="marriage-action-backdrop"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !acting) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`marriage-action-dialog${wide ? ' is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInsideDialog}
      >
        <div className="marriage-action-heading">
          <div className="marriage-action-heading-icon">{icon}</div>
          <div className="marriage-action-heading-copy">
            <h3 id={titleId}>{title}</h3>
            <p id={`${titleId}-description`}>{description}</p>
          </div>
          <button
            type="button"
            className="marriage-icon-button"
            onClick={onClose}
            disabled={acting}
            aria-label={`إغلاق نافذة ${title}`}
          >
            <XMarkIcon aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
};

interface FormFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, children, required, error, hint }) => (
  <div className="marriage-form-field">
    <label htmlFor={id}>
      {label}
      {required && <span className="marriage-required-mark" aria-hidden="true">*</span>}
    </label>
    {children}
    {error ? (
      <div id={`${id}-error`} className="marriage-field-error" role="alert">{error}</div>
    ) : hint ? (
      <div id={`${id}-hint`} className="marriage-field-hint">{hint}</div>
    ) : null}
  </div>
);

interface DialogActionsProps {
  acting: boolean;
  disabled?: boolean;
  submitLabel: string;
  loadingLabel: string;
  onCancel: () => void;
}

const DialogActions: React.FC<DialogActionsProps> = ({ acting, disabled = false, submitLabel, loadingLabel, onCancel }) => (
  <div className="marriage-action-buttons">
    <button type="submit" disabled={acting || disabled} style={btnPrimary}>
      {acting ? loadingLabel : submitLabel}
    </button>
    <button type="button" disabled={acting} onClick={onCancel} style={btnSecondary}>
      إلغاء
    </button>
  </div>
);

interface SignatureWorkflowProps {
  request: MarriageRequest;
  acting: boolean;
  reminding: boolean;
  canRemind: boolean;
  committeeChairName?: string;
  onRemind: () => Promise<boolean>;
}

const SignatureWorkflow: React.FC<SignatureWorkflowProps> = ({
  request,
  acting,
  reminding,
  canRemind,
  committeeChairName,
  onRemind,
}) => {
  const signedRoles = getSignedRoles(request);
  const backendSignedCount = Number(request.signature_summary?.signed_count);
  const signedCount = Number.isFinite(backendSignedCount)
    ? Math.min(SIGNATURE_ORDER.length, Math.max(0, backendSignedCount))
    : signedRoles.size;
  const totalCount = SIGNATURE_ORDER.length;
  const nextSignerRole = getNextSignerRole(request);
  const displaySignerName = (role: SignerRole) =>
    role === 'committee_chair' && committeeChairName && !signedRoles.has(role)
      ? committeeChairName
      : getSignerName(request, role);
  const nextSignerName = nextSignerRole ? displaySignerName(nextSignerRole) : null;
  const awaitingSignatures = request.status === 'awaiting_signatures';
  const completed = signedCount === totalCount || request.status === 'signatures_complete';
  const progressPercentage = (signedCount / totalCount) * 100;

  const stageMessage = (() => {
    if (completed || ['approved_by_chairman', 'completed'].includes(request.status)) {
      return 'اكتملت التوقيعات الأربعة بنجاح';
    }
    if (request.status === 'rejected') return 'توقف مسار التوقيع بعد رفض الطلب';
    if (request.status === 'cancelled') return 'توقف مسار التوقيع بعد إلغاء الطلب';
    if (awaitingSignatures && nextSignerRole) {
      return `بانتظار توقيع ${SIGNER_ROLE_LABELS_AR[nextSignerRole]}`;
    }
    if (awaitingSignatures) return 'يجري التحقق من اكتمال التوقيعات';
    return 'يبدأ التسلسل بعد إعداد إقرار الدين';
  })();

  return (
    <section className="marriage-signature-card" aria-labelledby="marriage-signature-title">
      <div className="marriage-signature-header">
        <div className="marriage-signature-heading">
          <span className="marriage-signature-eyebrow">مسار التوقيع الإلكتروني</span>
          <div className="marriage-signature-title-row">
            <h3 id="marriage-signature-title">التوقيعات المتسلسلة</h3>
            <span className="marriage-signature-count" dir="ltr" aria-label={`${signedCount} من ${totalCount} توقيعات مكتملة`}>
              {signedCount}/{totalCount}
            </span>
          </div>
          <p>{stageMessage}</p>
        </div>

        {awaitingSignatures && nextSignerRole && (
          <div className="marriage-next-signer">
            <div>
              <span>الموقّع التالي</span>
              <strong>{nextSignerName}</strong>
              <small>{SIGNER_ROLE_LABELS_AR[nextSignerRole]}</small>
            </div>
            {canRemind && (
              <button type="button" onClick={onRemind} disabled={acting} className="marriage-reminder-button">
                <BellAlertIcon aria-hidden="true" />
                <span>{reminding ? 'جارٍ الإرسال…' : 'إرسال تذكير'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="marriage-signature-progress"
        role="progressbar"
        aria-label="نسبة اكتمال التوقيعات"
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={signedCount}
      >
        <span style={{ width: `${progressPercentage}%` }} />
      </div>

      <ol className="marriage-signature-steps">
        {SIGNATURE_ORDER.map((role, index) => {
          const signature = (request.signatures || []).find((item) => item.signer_role === role);
          const isSigned = signedRoles.has(role);
          const isCurrent = awaitingSignatures && nextSignerRole === role && !isSigned;
          const stateClass = isSigned ? 'is-complete' : isCurrent ? 'is-current' : 'is-pending';
          const stateLabel = isSigned ? 'تم التوقيع' : isCurrent ? 'الدور الحالي' : 'بانتظار دوره';

          return (
            <li key={role} className={`marriage-signature-step ${stateClass}`} aria-current={isCurrent ? 'step' : undefined}>
              <div className="marriage-signature-step-top">
                <span className="marriage-signature-step-icon" aria-hidden="true">
                  {isSigned ? <CheckIcon /> : isCurrent ? <ClockIcon /> : index + 1}
                </span>
                <span className="marriage-signature-state">{stateLabel}</span>
              </div>
              <strong>{SIGNER_ROLE_LABELS_AR[role]}</strong>
              <span className="marriage-signature-name">{displaySignerName(role)}</span>
              {signature?.signed_at && (
                <time className="marriage-signature-date" dateTime={signature.signed_at}>
                  {formatDate(signature.signed_at)}
                </time>
              )}
            </li>
          );
        })}
      </ol>

      <div className="marriage-signature-security-note">
        <LockClosedIcon aria-hidden="true" />
        <span>التوقيع شخصي ومتسلسل؛ لا يمكن للمسؤول التوقيع نيابةً عن المستفيد أو الشهود.</span>
      </div>
    </section>
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

const marriageSupportStyles = `
  .marriage-support-modal,
  .marriage-support-modal * {
    box-sizing: border-box;
  }

  .marriage-support-modal button:disabled {
    cursor: not-allowed !important;
    opacity: 0.62;
  }

  .marriage-icon-button {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    color: #475569;
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
  }

  .marriage-icon-button:hover {
    background: #eef2f7;
    color: #0f172a;
    transform: translateY(-1px);
  }

  .marriage-icon-button:focus-visible,
  .marriage-reminder-button:focus-visible,
  .marriage-reject-textarea:focus-visible,
  .marriage-action-input:focus-visible,
  .marriage-action-textarea:focus-visible,
  .marriage-action-buttons button:focus-visible {
    outline: 3px solid rgba(15, 118, 110, 0.2);
    outline-offset: 2px;
  }

  .marriage-icon-button svg {
    width: 20px;
    height: 20px;
  }

  .marriage-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .marriage-party-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .marriage-disbursement-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .marriage-rejection-banner {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    margin-bottom: 16px;
    border: 1px solid #fecaca;
    border-inline-start: 4px solid #dc2626;
    border-radius: 14px;
    background: linear-gradient(135deg, #fff7f7 0%, #fff1f2 100%);
    color: #7f1d1d;
  }

  .marriage-rejection-icon {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 10px;
    background: #fee2e2;
    color: #dc2626;
  }

  .marriage-rejection-icon svg {
    width: 20px;
    height: 20px;
  }

  .marriage-rejection-title {
    margin-bottom: 3px;
    font-size: 13px;
    font-weight: 800;
  }

  .marriage-rejection-text {
    color: #991b1b;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.75;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .marriage-rejection-date {
    margin-top: 5px;
    color: #b91c1c;
    font-size: 11px;
  }

  .marriage-signature-card {
    position: relative;
    overflow: hidden;
    margin-bottom: 12px;
    padding: 18px;
    border: 1px solid #cbded9;
    border-radius: 18px;
    background:
      radial-gradient(circle at 100% 0%, rgba(15, 118, 110, 0.09), transparent 34%),
      linear-gradient(150deg, #ffffff 0%, #f8fbfa 100%);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
  }

  .marriage-signature-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
    gap: 18px;
    align-items: stretch;
  }

  .marriage-signature-heading {
    min-width: 0;
  }

  .marriage-signature-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #0f766e;
    font-size: 11px;
    font-weight: 800;
  }

  .marriage-signature-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .marriage-signature-title-row h3 {
    margin: 0;
    color: #143d38;
    font-size: 18px;
    font-weight: 800;
  }

  .marriage-signature-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    padding: 4px 9px;
    border: 1px solid #99d5ca;
    border-radius: 999px;
    background: #ecfdf5;
    color: #065f46;
    font-size: 13px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .marriage-signature-heading p {
    margin: 7px 0 0;
    color: #526b67;
    font-size: 13px;
    line-height: 1.7;
  }

  .marriage-next-signer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 13px 14px;
    border: 1px solid #f4cf85;
    border-radius: 14px;
    background: linear-gradient(135deg, #fffbeb 0%, #fff7dc 100%);
  }

  .marriage-next-signer > div {
    min-width: 0;
  }

  .marriage-next-signer span,
  .marriage-next-signer small {
    display: block;
  }

  .marriage-next-signer > div > span {
    color: #92400e;
    font-size: 10px;
    font-weight: 800;
  }

  .marriage-next-signer strong {
    display: block;
    margin: 2px 0;
    overflow: hidden;
    color: #78350f;
    font-size: 14px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .marriage-next-signer small {
    color: #a16207;
    font-size: 10px;
  }

  .marriage-reminder-button {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: 0 0 auto;
    padding: 8px 12px;
    border: 1px solid #d97706;
    border-radius: 10px;
    background: #b45309;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    transition: background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .marriage-reminder-button:hover:not(:disabled) {
    background: #92400e;
    box-shadow: 0 8px 18px rgba(146, 64, 14, 0.2);
    transform: translateY(-1px);
  }

  .marriage-reminder-button svg {
    width: 17px;
    height: 17px;
  }

  .marriage-signature-progress {
    height: 7px;
    margin: 16px 0;
    overflow: hidden;
    border-radius: 999px;
    background: #e2e8f0;
  }

  .marriage-signature-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #0f766e 0%, #16a34a 100%);
    transition: width 320ms ease;
  }

  .marriage-signature-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .marriage-signature-step {
    min-width: 0;
    min-height: 142px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.82);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .marriage-signature-step.is-complete {
    border-color: #a7d7c6;
    background: #f0fdf8;
  }

  .marriage-signature-step.is-current {
    border-color: #e5ad43;
    background: #fffbeb;
    box-shadow: 0 7px 20px rgba(180, 83, 9, 0.1);
    transform: translateY(-2px);
  }

  .marriage-signature-step-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 10px;
  }

  .marriage-signature-step-icon {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 10px;
    background: #eef2f7;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .marriage-signature-step-icon svg {
    width: 17px;
    height: 17px;
  }

  .marriage-signature-step.is-complete .marriage-signature-step-icon {
    background: #d1fae5;
    color: #047857;
  }

  .marriage-signature-step.is-current .marriage-signature-step-icon {
    background: #fef3c7;
    color: #b45309;
  }

  .marriage-signature-state {
    color: #64748b;
    font-size: 9px;
    font-weight: 800;
  }

  .marriage-signature-step.is-complete .marriage-signature-state { color: #047857; }
  .marriage-signature-step.is-current .marriage-signature-state { color: #b45309; }

  .marriage-signature-step > strong {
    margin-bottom: 3px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 800;
  }

  .marriage-signature-name {
    overflow: hidden;
    color: #475569;
    font-size: 12px;
    line-height: 1.6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .marriage-signature-date {
    margin-top: auto;
    padding-top: 8px;
    color: #64748b;
    font-size: 9px;
    line-height: 1.5;
  }

  .marriage-signature-security-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 13px;
    color: #526b67;
    font-size: 11px;
    line-height: 1.65;
  }

  .marriage-signature-security-note svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    margin-top: 2px;
    color: #0f766e;
  }

  .marriage-history-row {
    display: flex;
    gap: 10px;
    color: #1e293b;
    font-size: 13px;
  }

  .marriage-action-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1250;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, 0.74);
    backdrop-filter: blur(5px);
  }

  .marriage-action-dialog {
    width: min(560px, 100%);
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 22px;
    border: 1px solid #cbded9;
    border-radius: 20px;
    background:
      radial-gradient(circle at 100% 0%, rgba(15, 118, 110, 0.08), transparent 28%),
      #fff;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
  }

  .marriage-action-dialog.is-wide {
    width: min(820px, 100%);
  }

  .marriage-action-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .marriage-action-heading-icon {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 14px;
    background: linear-gradient(145deg, #dff7f1 0%, #ccf0e5 100%);
    color: #0f766e;
    box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.08);
  }

  .marriage-action-heading-icon svg {
    width: 23px;
    height: 23px;
  }

  .marriage-action-heading-copy {
    min-width: 0;
    flex: 1;
  }

  .marriage-action-heading h3 {
    margin: 0 0 4px;
    color: #143d38;
    font-size: 18px;
    font-weight: 800;
  }

  .marriage-action-heading p {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.75;
  }

  .marriage-action-fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .marriage-form-field {
    min-width: 0;
  }

  .marriage-form-field > label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 7px;
    color: #334155;
    font-size: 12px;
    font-weight: 800;
  }

  .marriage-required-mark {
    color: #dc2626;
    font-size: 14px;
  }

  .marriage-action-input,
  .marriage-action-textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 11px;
    background: #f8fafc;
    color: #172033;
    font: inherit;
    font-size: 13px;
    transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }

  .marriage-action-input {
    height: 43px;
    padding: 0 12px;
  }

  .marriage-action-select {
    padding-inline-end: 34px;
    color: #1e293b;
    cursor: pointer;
  }

  .marriage-action-textarea {
    min-height: 118px;
    resize: vertical;
    padding: 11px 12px;
    line-height: 1.8;
  }

  .marriage-action-input:focus,
  .marriage-action-textarea:focus {
    border-color: #0f766e;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.09);
  }

  .marriage-action-input.has-error,
  .marriage-action-textarea.has-error {
    border-color: #dc2626;
    background: #fff7f7;
  }

  .marriage-ltr-input {
    direction: ltr;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }

  .marriage-field-hint,
  .marriage-field-error {
    margin-top: 5px;
    font-size: 10px;
    line-height: 1.55;
  }

  .marriage-field-hint {
    color: #64748b;
  }

  .marriage-field-error {
    color: #b91c1c;
    font-weight: 700;
  }

  .marriage-picker-state,
  .marriage-member-search-state {
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px dashed #cbd5e1;
    border-radius: 11px;
    background: #f8fafc;
    color: #64748b;
    font-size: 11px;
    line-height: 1.65;
  }

  .marriage-picker-state.is-error,
  .marriage-member-search-state.is-error {
    border-color: #fecaca;
    background: #fff7f7;
    color: #991b1b;
  }

  .marriage-picker-state.is-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .marriage-selected-initiative {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 13px;
    padding: 12px 13px;
    border: 1px solid #a7d7c6;
    border-radius: 13px;
    background: #f0fdf8;
  }

  .marriage-selected-initiative > div:first-child span,
  .marriage-selected-initiative > div:first-child strong {
    display: block;
  }

  .marriage-selected-initiative > div:first-child span {
    margin-bottom: 2px;
    color: #047857;
    font-size: 9px;
    font-weight: 800;
  }

  .marriage-selected-initiative > div:first-child strong {
    color: #14532d;
    font-size: 13px;
  }

  .marriage-initiative-metrics {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .marriage-initiative-metrics span {
    padding: 4px 8px;
    border-radius: 999px;
    background: #dcfce7;
    color: #166534;
    font-size: 9px;
    font-weight: 700;
  }

  .marriage-form-section {
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 15px;
    background: rgba(248, 250, 252, 0.72);
  }

  .marriage-form-section + .marriage-form-section {
    margin-top: 13px;
  }

  .marriage-form-section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .marriage-form-section-heading strong {
    color: #1e293b;
    font-size: 13px;
    font-weight: 800;
  }

  .marriage-form-section-heading span {
    color: #64748b;
    font-size: 10px;
  }

  .marriage-action-grid,
  .marriage-witness-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
  }

  .marriage-witness-card {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 11px;
    padding: 13px;
    border: 1px solid #d7e6e2;
    border-radius: 13px;
    background: #fff;
  }

  .marriage-witness-number {
    align-self: flex-start;
    padding: 4px 9px;
    border-radius: 999px;
    background: #ecfdf5;
    color: #047857;
    font-size: 10px;
    font-weight: 800;
  }

  .marriage-member-picker {
    min-width: 0;
  }

  .marriage-member-results {
    max-height: 190px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding: 5px;
    border: 1px solid #d7e6e2;
    border-radius: 11px;
    background: #f8fbfa;
  }

  .marriage-member-result {
    width: 100%;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: 9px;
    background: #fff;
    color: #1e293b;
    text-align: start;
    cursor: pointer;
    transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
  }

  .marriage-member-result:hover,
  .marriage-member-result:focus-visible {
    border-color: #99d5ca;
    background: #ecfdf5;
    transform: translateY(-1px);
  }

  .marriage-member-result strong {
    font-size: 12px;
    font-weight: 800;
  }

  .marriage-member-result span {
    color: #64748b;
    font-size: 9px;
    line-height: 1.5;
  }

  .marriage-selected-member {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px;
    border: 1px solid #a7d7c6;
    border-radius: 11px;
    background: #f0fdf8;
  }

  .marriage-selected-member > div {
    min-width: 0;
  }

  .marriage-selected-member strong,
  .marriage-selected-member span {
    display: block;
  }

  .marriage-selected-member strong {
    overflow: hidden;
    color: #14532d;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .marriage-selected-member span {
    margin-top: 3px;
    color: #527166;
    font-size: 9px;
  }

  .marriage-change-selection {
    flex: 0 0 auto;
    padding: 6px 9px;
    border: 1px solid #6ee7b7;
    border-radius: 8px;
    background: #fff;
    color: #047857;
    font-family: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .marriage-action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
  }

  .marriage-character-count {
    margin-top: 5px;
    color: #64748b;
    font-size: 10px;
    text-align: left;
  }

  .marriage-reject-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(4px);
  }

  .marriage-reject-dialog {
    width: min(520px, 100%);
    padding: 22px;
    border: 1px solid #fecaca;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
  }

  .marriage-reject-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }

  .marriage-reject-heading-icon {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 13px;
    background: #fee2e2;
    color: #dc2626;
  }

  .marriage-reject-heading-icon svg {
    width: 23px;
    height: 23px;
  }

  .marriage-reject-heading h3 {
    margin: 0 0 4px;
    color: #7f1d1d;
    font-size: 18px;
    font-weight: 800;
  }

  .marriage-reject-heading p {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.7;
  }

  .marriage-reject-label {
    display: block;
    margin-bottom: 7px;
    color: #334155;
    font-size: 13px;
    font-weight: 800;
  }

  .marriage-reject-label span { color: #dc2626; }

  .marriage-reject-textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    padding: 12px 13px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #f8fafc;
    color: #1e293b;
    font: inherit;
    font-size: 13px;
    line-height: 1.8;
    transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }

  .marriage-reject-textarea:focus {
    border-color: #0f766e;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.09);
  }

  .marriage-reject-textarea.has-error {
    border-color: #dc2626;
    background: #fff7f7;
  }

  .marriage-reject-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 5px;
    color: #64748b;
    font-size: 10px;
  }

  .marriage-reject-error {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 9px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 11px;
    font-weight: 700;
  }

  .marriage-reject-actions {
    display: flex;
    gap: 8px;
    margin-top: 18px;
  }

  @media (max-width: 760px) {
    .marriage-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .marriage-party-grid,
    .marriage-disbursement-grid,
    .marriage-signature-header,
    .marriage-action-grid,
    .marriage-witness-grid {
      grid-template-columns: 1fr;
    }

    .marriage-signature-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .marriage-history-row {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 480px) {
    .marriage-support-modal {
      padding: 15px !important;
      border-radius: 16px !important;
    }

    .marriage-signature-card {
      padding: 14px;
    }

    .marriage-signature-steps {
      grid-template-columns: 1fr;
    }

    .marriage-signature-step {
      min-height: 120px;
    }

    .marriage-next-signer {
      align-items: stretch;
      flex-direction: column;
    }

    .marriage-reminder-button {
      width: 100%;
    }

    .marriage-reject-dialog {
      padding: 17px;
    }

    .marriage-action-backdrop {
      align-items: flex-start;
      padding: 10px;
    }

    .marriage-action-dialog {
      max-height: calc(100vh - 20px);
      padding: 17px;
      border-radius: 18px;
    }

    .marriage-action-heading-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
    }

    .marriage-action-heading h3 {
      font-size: 16px;
    }

    .marriage-form-section-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
    }

    .marriage-selected-initiative,
    .marriage-selected-member,
    .marriage-picker-state.is-error {
      align-items: stretch;
      flex-direction: column;
    }

    .marriage-initiative-metrics {
      justify-content: flex-start;
    }

    .marriage-action-buttons {
      flex-direction: column;
    }

    .marriage-action-buttons button {
      width: 100%;
    }

    .marriage-reject-actions {
      flex-direction: column;
    }

    .marriage-reject-actions button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marriage-support-modal *,
    .marriage-support-modal *::before,
    .marriage-support-modal *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

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
const fieldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, color: '#475569', fontSize: 12 };
const fieldInput: React.CSSProperties = { width: '100%', height: 40, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', background: '#fff', fontFamily: 'inherit' };

export default MarriageSupportDetail;
