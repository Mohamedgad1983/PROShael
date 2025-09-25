import React, { useState } from 'react';
import {
  EyeIcon,
  PencilSquareIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ChevronUpDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { Diya, DiyaStatus, DiyaPriority, DiyaCaseType } from './types';
import { CURRENCY } from '../../constants/arabic';

interface DiyasTableProps {
  diyas: Diya[];
  onView: (diya: Diya) => void;
  onEdit: (diya: Diya) => void;
  loading?: boolean;
}

type SortField = 'caseDateOccurred' | 'reportedDate' | 'compensationAmount' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

const DiyasTable: React.FC<DiyasTableProps> = ({
  diyas,
  onView,
  onEdit,
  loading = false
}) => {
  const [sortField, setSortField] = useState<SortField>('reportedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<DiyaStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DiyaPriority | 'all'>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusColor = (status: DiyaStatus): string => {
    switch (status) {
      case 'reported': return '#f59e0b';
      case 'investigating': return '#3b82f6';
      case 'mediation': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'awaitingPayment': return '#f97316';
      case 'completed': return '#059669';
      case 'cancelled': return '#ef4444';
      case 'appealed': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: DiyaStatus): string => {
    switch (status) {
      case 'reported': return 'مُبلغ عنه';
      case 'investigating': return 'قيد التحقيق';
      case 'mediation': return 'وساطة';
      case 'resolved': return 'تم الحل';
      case 'awaitingPayment': return 'في انتظار الدفع';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      case 'appealed': return 'مستأنف';
      default: return status;
    }
  };

  const getPriorityColor = (priority: DiyaPriority): string => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: DiyaPriority): string => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  const getCaseTypeLabel = (type: DiyaCaseType): string => {
    switch (type) {
      case 'accidentalDamage': return 'ضرر عارض';
      case 'intentionalDamage': return 'ضرر مقصود';
      case 'medicalCompensation': return 'تعويض طبي';
      case 'propertyDamage': return 'ضرر في الممتلكات';
      case 'vehicleAccident': return 'حادث مروري';
      case 'personalInjury': return 'إصابة شخصية';
      case 'death': return 'وفاة';
      case 'financial': return 'مالي';
      default: return type;
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', { notation: 'compact' }).format(amount);
  };

  const filteredDiyas = diyas.filter(diya => {
    if (statusFilter !== 'all' && diya.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && diya.priority !== priorityFilter) return false;
    return true;
  });

  const sortedDiyas = [...filteredDiyas].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortField) {
      case 'caseDateOccurred':
        aVal = a.caseDateOccurred.getTime();
        bVal = b.caseDateOccurred.getTime();
        break;
      case 'reportedDate':
        aVal = a.reportedDate.getTime();
        bVal = b.reportedDate.getTime();
        break;
      case 'compensationAmount':
        aVal = a.compensationAmount;
        bVal = b.compensationAmount;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
        break;
      default:
        return 0;
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  const tableStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    direction: 'rtl' as const
  };

  const filtersStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const filterSelectStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    minWidth: '120px'
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const headerCellStyle: React.CSSProperties = {
    padding: '16px 12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right' as const,
    borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    userSelect: 'none' as const,
    position: 'relative'
  };

  const sortableHeaderStyle: React.CSSProperties = {
    ...headerCellStyle,
    transition: 'background 0.2s ease'
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  };

  const cellStyle: React.CSSProperties = {
    padding: '16px 12px',
    fontSize: '14px',
    borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
    verticalAlign: 'middle'
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '6px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: '4px'
  };

  const viewButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6'
  };

  const editButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981'
  };

  const statusBadgeStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block'
  };

  const priorityBadgeStyle: React.CSSProperties = {
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block'
  };

  const loadingStyle: React.CSSProperties = {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px'
  };

  const emptyStyle: React.CSSProperties = {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px'
  };

  if (loading) {
    return (
      <div style={tableStyle}>
        <div style={loadingStyle}>
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <div style={tableStyle}>
      <div style={filtersStyle}>
        <FunnelIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />

        <select
          style={filterSelectStyle}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DiyaStatus | 'all')}
        >
          <option value="all">جميع الحالات</option>
          <option value="reported">مُبلغ عنه</option>
          <option value="investigating">قيد التحقيق</option>
          <option value="mediation">وساطة</option>
          <option value="resolved">تم الحل</option>
          <option value="awaitingPayment">في انتظار الدفع</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
          <option value="appealed">مستأنف</option>
        </select>

        <select
          style={filterSelectStyle}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as DiyaPriority | 'all')}
        >
          <option value="all">جميع الأولويات</option>
          <option value="urgent">عاجل</option>
          <option value="high">عالي</option>
          <option value="medium">متوسط</option>
          <option value="low">منخفض</option>
        </select>

        <div style={{ fontSize: '14px', color: '#6b7280', marginRight: 'auto' }}>
          {sortedDiyas.length} من {diyas.length} قضية
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={headerStyle}>
          <tr>
            <th style={headerCellStyle}>الإجراءات</th>
            <th
              style={sortableHeaderStyle}
              onClick={() => handleSort('status')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                الحالة
                <ChevronUpDownIcon style={{ width: '16px', height: '16px' }} />
              </div>
            </th>
            <th
              style={sortableHeaderStyle}
              onClick={() => handleSort('priority')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                الأولوية
                <ChevronUpDownIcon style={{ width: '16px', height: '16px' }} />
              </div>
            </th>
            <th
              style={sortableHeaderStyle}
              onClick={() => handleSort('compensationAmount')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                التعويض
                <ChevronUpDownIcon style={{ width: '16px', height: '16px' }} />
              </div>
            </th>
            <th style={headerCellStyle}>المُبلغ</th>
            <th style={headerCellStyle}>نوع القضية</th>
            <th
              style={sortableHeaderStyle}
              onClick={() => handleSort('caseDateOccurred')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                تاريخ الحادث
                <ChevronUpDownIcon style={{ width: '16px', height: '16px' }} />
              </div>
            </th>
            <th style={headerCellStyle}>عنوان القضية</th>
          </tr>
        </thead>
        <tbody>
          {sortedDiyas.length > 0 ? (
            sortedDiyas.map((diya) => (
              <tr
                key={diya.id}
                style={rowStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={cellStyle}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      style={viewButtonStyle}
                      onClick={() => onView(diya)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      }}
                      title="عرض التفاصيل"
                    >
                      <EyeIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      style={editButtonStyle}
                      onClick={() => onEdit(diya)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                      }}
                      title="تعديل"
                    >
                      <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </td>
                <td style={cellStyle}>
                  <span
                    style={{
                      ...statusBadgeStyle,
                      background: getStatusColor(diya.status)
                    }}
                  >
                    {getStatusLabel(diya.status)}
                  </span>
                </td>
                <td style={cellStyle}>
                  <span
                    style={{
                      ...priorityBadgeStyle,
                      background: getPriorityColor(diya.priority)
                    }}
                  >
                    {getPriorityLabel(diya.priority)}
                  </span>
                  {diya.priority === 'urgent' && (
                    <ExclamationTriangleIcon style={{ width: '14px', height: '14px', color: '#dc2626', marginRight: '4px' }} />
                  )}
                </td>
                <td style={cellStyle}>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>
                    {formatAmount(diya.compensationAmount)} {CURRENCY.symbol}
                  </div>
                </td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserIcon style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                    {diya.reportedByName}
                  </div>
                </td>
                <td style={cellStyle}>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    background: 'rgba(107, 114, 128, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '8px'
                  }}>
                    {getCaseTypeLabel(diya.caseType)}
                  </span>
                </td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                    <CalendarIcon style={{ width: '14px', height: '14px' }} />
                    {formatDate(diya.caseDateOccurred)}
                  </div>
                </td>
                <td style={cellStyle}>
                  <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                    {diya.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
                    {diya.description.length > 100
                      ? `${diya.description.substring(0, 100)}...`
                      : diya.description}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} style={emptyStyle}>
                لا توجد قضايا تطابق المرشحات المحددة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DiyasTable;