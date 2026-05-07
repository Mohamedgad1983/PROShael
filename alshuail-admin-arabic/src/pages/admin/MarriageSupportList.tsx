/**
 * MarriageSupportList — admin page rendered when sidebar section = 'marriage-support'.
 *
 * Same component serves committee chair, super_admin, and viewers — actions
 * available in the detail drawer are role-aware.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  marriageSupportService,
  MarriageRequest,
  MarriageStatus,
  STATUS_LABELS_AR,
  STATUS_COLORS,
  fmtAmount,
} from '../../services/marriageSupportService';
import MarriageSupportDetail from './MarriageSupportDetail';

const ALL_STATUSES: MarriageStatus[] = [
  'submitted',
  'under_committee_review',
  'data_entered',
  'awaiting_signatures',
  'signatures_complete',
  'approved_by_chairman',
  'completed',
  'rejected',
  'cancelled',
];

const formatDate = (s?: string | null) => {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(s));
  } catch {
    return s.slice(0, 10);
  }
};

const MarriageSupportList: React.FC = () => {
  const [requests, setRequests] = useState<MarriageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<MarriageStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await marriageSupportService.list({
        status: statusFilter || undefined,
        year: yearFilter || undefined,
        search: search || undefined,
      });
      setRequests(list);
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

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of requests) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [requests]);

  return (
    <div style={{ direction: 'rtl', padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
          طلبات دعم المقبلين على الزواج
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          إدارة طلبات دعم الزواج — مراجعة، إدخال بيانات الحساب، توقيعات إقرار الدين، اعتماد رئيس الصندوق، وصرف.
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
          onChange={(e) => setStatusFilter(e.target.value as MarriageStatus | '')}
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
            placeholder="بحث بالاسم أو رقم الطلب أو اسم الزوجة"
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

        <button onClick={refresh} style={secondaryButtonStyle}>🔄 تحديث</button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>جاري التحميل…</div>
      ) : requests.length === 0 ? (
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
                <th style={thStyle}>اسم المتقدم</th>
                <th style={thStyle}>اسم الزوجة</th>
                <th style={thStyle}>تاريخ الزواج</th>
                <th style={thStyle}>المبلغ النهائي</th>
                <th style={thStyle}>تاريخ التقديم</th>
                <th style={thStyle}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right', fontWeight: 600 }}>
                    {r.sequence_number}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: STATUS_COLORS[r.status],
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_LABELS_AR[r.status]}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.applicant_name || '—'}</td>
                  <td style={tdStyle}>{r.spouse_name_ar || '—'}</td>
                  <td style={tdStyle}>{formatDate(r.marriage_date)}</td>
                  <td style={tdStyle}>{fmtAmount(r.final_amount)}</td>
                  <td style={tdStyle}>{formatDate(r.created_at)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setSelectedId(r.id)}
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

      {selectedId && (
        <MarriageSupportDetail
          requestId={selectedId}
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

export default MarriageSupportList;
