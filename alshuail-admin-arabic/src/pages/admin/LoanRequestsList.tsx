/**
 * LoanRequestsList — admin page rendered when sidebar section = 'loan-requests'.
 *
 * Same component serves both fund staff and brouj_partner — the loanService
 * picks the right backend URL based on the user's role, and the server returns
 * already-filtered data for brouj.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  loanService,
  LoanRequest,
  LoanStatus,
  STATUS_LABELS_AR,
  STATUS_COLORS,
} from '../../services/loanService';
import LoanRequestDetail from './LoanRequestDetail';

const ALL_STATUSES: LoanStatus[] = [
  'submitted',
  'under_fund_review',
  'approved_by_fund',
  'forwarded_to_brouj',
  'brouj_processing',
  'najiz_uploaded',
  'fee_collected',
  'ready_for_disbursement',
  'completed',
  'rejected',
  'cancelled',
];

const formatSAR = (v: string | number | undefined) => {
  if (v === undefined || v === null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س';
};

const formatDate = (s: string | undefined) => {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(s));
  } catch {
    return s.slice(0, 10);
  }
};

const LoanRequestsList: React.FC = () => {
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [statusFilter, setStatusFilter] = useState<LoanStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  // detail drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await loanService.list({
        status: statusFilter || undefined,
        year: yearFilter || undefined,
        q: search || undefined,
      });
      setLoans(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter, search]);

  // Group counts shown above the filters give the admin a sense of scale
  // (e.g. how many submitted vs how many forwarded).
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const loan of loans) {
      counts[loan.status] = (counts[loan.status] || 0) + 1;
    }
    return counts;
  }, [loans]);

  return (
    <div style={{ direction: 'rtl', padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
          طلبات السلف المستردة
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          إدارة طلبات السلف للموظفين الحكوميين — مراجعة، موافقة، إحالة لمؤسسة بروز الريادة، وصرف.
        </p>
      </div>

      {/* status counts strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {ALL_STATUSES.map((s) => {
          const count = groupCounts[s] || 0;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: statusFilter === s ? `2px solid ${STATUS_COLORS[s]}` : '1px solid #e5e7eb',
                background: statusFilter === s ? `${STATUS_COLORS[s]}22` : '#fff',
                color: STATUS_COLORS[s],
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {STATUS_LABELS_AR[s]} • {count}
            </button>
          );
        })}
      </div>

      {/* filters row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LoanStatus | '')}
          style={selectStyle}
        >
          <option value="">كل الحالات</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS_AR[s]}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="السنة"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : '')}
          style={{ ...selectStyle, width: 110 }}
        />

        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
          style={{ display: 'flex', gap: 6, flex: '1 1 auto' }}
        >
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الطلب أو الهوية"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          />
          <button type="submit" style={primaryButtonStyle}>بحث</button>
          {(search || statusFilter || yearFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setYearFilter('');
                setSearch('');
                setSearchInput('');
              }}
              style={secondaryButtonStyle}
            >
              مسح
            </button>
          )}
        </form>

        <button onClick={refresh} style={secondaryButtonStyle}>
          🔄 تحديث
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>جاري التحميل…</div>
      ) : loans.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12 }}>
          لا توجد طلبات تطابق الفلاتر الحالية
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>رقم الطلب</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>اسم العضو</th>
                <th style={thStyle}>رقم الهوية</th>
                <th style={thStyle}>المبلغ</th>
                <th style={thStyle}>الرسوم</th>
                <th style={thStyle}>تاريخ التقديم</th>
                <th style={thStyle}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right', fontWeight: 600 }}>
                    {loan.sequence_number}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: STATUS_COLORS[loan.status],
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_LABELS_AR[loan.status]}
                    </span>
                  </td>
                  <td style={tdStyle}>{loan.applicant_name || loan.member_full_name_ar || '—'}</td>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>{loan.national_id || '—'}</td>
                  <td style={tdStyle}>{formatSAR(loan.loan_amount)}</td>
                  <td style={tdStyle}>{formatSAR(loan.admin_fee_amount)}</td>
                  <td style={tdStyle}>{formatDate(loan.created_at)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setSelectedId(loan.id)}
                      style={{
                        background: '#eef2ff',
                        color: '#4338ca',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer (modal) */}
      {selectedId && (
        <LoanRequestDetail
          loanId={selectedId}
          onClose={() => setSelectedId(null)}
          onChange={() => { refresh(); }}
        />
      )}
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  background: '#4338ca',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  fontWeight: 600,
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: '#1e293b',
};

export default LoanRequestsList;
