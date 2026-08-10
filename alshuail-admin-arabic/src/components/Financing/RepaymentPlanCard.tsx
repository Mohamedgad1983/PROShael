import React from 'react';
import type { RepaymentPlan } from '../../services/financingRepaymentTypes';

interface Props {
  plan: RepaymentPlan;
}

const money = (value: string | number) =>
  `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value) || 0)} ر.س`;

const date = (value?: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value));
};

const statusLabels: Record<string, string> = {
  scheduled: 'مجدول',
  active: 'نشط',
  due: 'مستحق',
  partially_paid: 'مدفوع جزئياً',
  paid: 'مدفوع',
  overdue: 'متأخر',
  cancelled: 'ملغي',
};

const statusColors: Record<string, { color: string; background: string }> = {
  scheduled: { color: '#475569', background: '#f1f5f9' },
  active: { color: '#075985', background: '#e0f2fe' },
  due: { color: '#92400e', background: '#fef3c7' },
  partially_paid: { color: '#9a3412', background: '#ffedd5' },
  paid: { color: '#065f46', background: '#d1fae5' },
  overdue: { color: '#991b1b', background: '#fee2e2' },
  cancelled: { color: '#475569', background: '#e2e8f0' },
};

const RepaymentPlanCard: React.FC<Props> = ({ plan }) => (
  <section
    aria-label="جدول الأقساط"
    dir="rtl"
    style={{
      background: 'linear-gradient(145deg, #fffdf7 0%, #ffffff 55%, #f0fdf4 100%)',
      border: '1px solid #d8e7dc',
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      boxShadow: '0 8px 24px rgba(15, 71, 49, 0.06)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div>
        <h3 style={{ margin: 0, color: '#123d2d', fontSize: 17 }}>خطة السداد</h3>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
          {plan.installment_count} أقساط · أول استحقاق {date(plan.first_due_date)}
        </p>
      </div>
      <span style={{
        ...statusColors[plan.status],
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
      }}>
        {statusLabels[plan.status] || plan.status}
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
      <Metric label="مبلغ التمويل" value={money(plan.principal_amount)} />
      <Metric label="رسوم البرنامج" value={money(plan.fee_amount)} />
      <Metric label="إجمالي السداد" value={money(plan.total_amount)} emphasis />
      <Metric label="المتبقي" value={money(plan.outstanding_amount)} warning={Number(plan.outstanding_amount) > 0} />
    </div>

    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, textAlign: 'right' }}>
        <thead>
          <tr style={{ background: '#f8fafc', color: '#475569' }}>
            <th style={th}>القسط</th>
            <th style={th}>تاريخ الاستحقاق</th>
            <th style={th}>القيمة</th>
            <th style={th}>المدفوع</th>
            <th style={th}>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {plan.installments.map((installment) => {
            const colors = statusColors[installment.status] || statusColors.scheduled;
            return (
              <tr key={installment.id} style={{ borderTop: '1px solid #edf2f7' }}>
                <td style={td}>#{installment.installment_number}</td>
                <td style={td}>{date(installment.due_date)}</td>
                <td style={td}>{money(installment.amount)}</td>
                <td style={td}>{money(installment.paid_amount)}</td>
                <td style={td}>
                  <span style={{ ...colors, borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 700 }}>
                    {statusLabels[installment.status] || installment.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);

const Metric: React.FC<{ label: string; value: string; emphasis?: boolean; warning?: boolean }> = ({
  label,
  value,
  emphasis,
  warning,
}) => (
  <div style={{
    borderRadius: 12,
    padding: '11px 12px',
    background: emphasis ? '#ecfdf5' : warning ? '#fff7ed' : '#ffffffcc',
    border: emphasis ? '1px solid #a7f3d0' : warning ? '1px solid #fed7aa' : '1px solid #e2e8f0',
  }}>
    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 3 }}>{label}</div>
    <div style={{ color: emphasis ? '#065f46' : warning ? '#9a3412' : '#1e293b', fontSize: 16, fontWeight: 800 }}>{value}</div>
  </div>
);

const th: React.CSSProperties = { padding: '10px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 12, color: '#1e293b', whiteSpace: 'nowrap' };

export default RepaymentPlanCard;
