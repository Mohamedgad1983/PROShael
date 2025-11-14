import React, { memo,  useState } from 'react';
import {
  XMarkIcon,
  ScaleIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UsersIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { Diya } from './types';
import DiyaStatus from './DiyaStatus';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';

interface DiyaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diya: Diya | null;
  onEdit?: (diya: Diya) => void;
  onStatusUpdate?: (diyaId: string, newStatus: any) => void;
  canEdit?: boolean;
}

const DiyaDetailsModal: React.FC<DiyaDetailsModalProps> = ({
  isOpen,
  onClose,
  diya,
  onEdit,
  onStatusUpdate,
  canEdit = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'parties' | 'payments' | 'documents'>('overview');

  if (!isOpen || !diya) return null;

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  const getCaseTypeLabel = (type: string): string => {
    switch (type) {
      case 'accidentalDamage': return ARABIC_LABELS.accidentalDamage;
      case 'intentionalDamage': return ARABIC_LABELS.intentionalDamage;
      case 'medicalCompensation': return ARABIC_LABELS.medicalCompensation;
      case 'propertyDamage': return ARABIC_LABELS.propertyDamage;
      case 'vehicleAccident': return 'حادث مروري';
      case 'personalInjury': return 'إصابة شخصية';
      case 'death': return 'وفاة';
      case 'financial': return 'مالي';
      default: return type;
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'complainant': return 'المشتكي';
      case 'respondent': return 'المشتكى عليه';
      case 'witness': return 'شاهد';
      case 'guardian': return 'ولي أمر';
      case 'representative': return 'ممثل قانوني';
      default: return role;
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  };

  const editButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '24px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const tabStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'transparent',
    color: '#6b7280'
  };

  const activeTabStyle: React.CSSProperties = {
    ...tabStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const contentStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const infoGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  };

  const infoCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const infoValueStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  };

  const partyCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const renderOverview = () => (
    <div>
      <div style={infoGridStyle}>
        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <ScaleIcon style={{ width: '16px', height: '16px' }} />
            نوع القضية
          </div>
          <div style={infoValueStyle}>
            {getCaseTypeLabel(diya.caseType)}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <CurrencyDollarIcon style={{ width: '16px', height: '16px' }} />
            مبلغ التعويض
          </div>
          <div style={{ ...infoValueStyle, color: '#10b981' }}>
            {formatAmount(diya.compensationAmount)} {CURRENCY.symbol}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <CalendarIcon style={{ width: '16px', height: '16px' }} />
            تاريخ الحادث
          </div>
          <div style={infoValueStyle}>
            {formatDate(diya.caseDateOccurred)}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <ClockIcon style={{ width: '16px', height: '16px' }} />
            تاريخ الإبلاغ
          </div>
          <div style={infoValueStyle}>
            {formatDate(diya.reportedDate)}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <MapPinIcon style={{ width: '16px', height: '16px' }} />
            المكان
          </div>
          <div style={infoValueStyle}>
            {diya.caseDetails.location}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <UserIcon style={{ width: '16px', height: '16px' }} />
            المُبلغ
          </div>
          <div style={infoValueStyle}>
            {diya.reportedByName}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={sectionTitleStyle}>
          <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
          وصف القضية
        </h4>
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#374151'
        }}>
          {diya.description}
        </div>
      </div>

      <div>
        <h4 style={sectionTitleStyle}>
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
          تفاصيل الأضرار
        </h4>
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#374151'
        }}>
          {diya.caseDetails.damageDescription}

          {diya.caseDetails.estimatedCost && (
            <div style={{ marginTop: '12px', fontWeight: '600' }}>
              التكلفة المقدرة: {formatAmount(diya.caseDetails.estimatedCost)} {CURRENCY.symbol}
            </div>
          )}

          {diya.caseDetails.insuranceClaim && (
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: '#fbbf24',
              color: 'white',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-block'
            }}>
              يوجد مطالبة تأمينية
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderParties = () => (
    <div>
      <h4 style={sectionTitleStyle}>
        <UsersIcon style={{ width: '20px', height: '20px' }} />
        الأطراف المعنية ({diya.involvedParties.length})
      </h4>

      {diya.involvedParties.map((party, index) => (
        <div key={index} style={partyCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <h5 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                {party.name}
              </h5>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: party.role === 'complainant' ? '#10b981' :
                       party.role === 'respondent' ? '#ef4444' : '#6b7280',
                background: party.role === 'complainant' ? 'rgba(16, 185, 129, 0.1)' :
                           party.role === 'respondent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                padding: '2px 8px',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                {getRoleLabel(party.role)}
              </div>
            </div>

            {party.isResponsible && (
              <div style={{
                background: '#dc2626',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                مسؤول
              </div>
            )}
          </div>

          {party.relationship && (
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              الصلة: {party.relationship}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {party.contactInfo?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <PhoneIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <span>{party.contactInfo.phone}</span>
              </div>
            )}

            {party.contactInfo?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <EnvelopeIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <span>{party.contactInfo.email}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPayments = () => (
    <div>
      <h4 style={sectionTitleStyle}>
        <CurrencyDollarIcon style={{ width: '20px', height: '20px' }} />
        تفاصيل المدفوعات
      </h4>

      {diya.paymentDetails ? (
        <div>
          <div style={infoGridStyle}>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>إجمالي المبلغ</div>
              <div style={{ ...infoValueStyle, color: '#3b82f6' }}>
                {formatAmount(diya.paymentDetails.totalAmount)} {CURRENCY.symbol}
              </div>
            </div>

            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>المبلغ المدفوع</div>
              <div style={{ ...infoValueStyle, color: '#10b981' }}>
                {formatAmount(diya.paymentDetails.paidAmount)} {CURRENCY.symbol}
              </div>
            </div>

            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>المبلغ المتبقي</div>
              <div style={{ ...infoValueStyle, color: diya.paymentDetails.remainingAmount > 0 ? '#ef4444' : '#10b981' }}>
                {formatAmount(diya.paymentDetails.remainingAmount)} {CURRENCY.symbol}
              </div>
            </div>

            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>طريقة الدفع</div>
              <div style={infoValueStyle}>
                {diya.paymentDetails.paymentMethod}
              </div>
            </div>
          </div>

          {diya.paymentDetails.installments && diya.paymentDetails.installments.length > 0 && (
            <div>
              <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                الأقساط ({diya.paymentDetails.installments.length})
              </h5>
              {diya.paymentDetails.installments.map((installment, index) => (
                <div key={index} style={{
                  ...partyCardStyle,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      القسط {index + 1}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      تاريخ الاستحقاق: {formatDate(installment.dueDate)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' as const }}>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>
                      {formatAmount(installment.amount)} {CURRENCY.symbol}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: installment.status === 'paid' ? '#10b981' :
                             installment.status === 'overdue' ? '#ef4444' : '#f59e0b',
                      background: installment.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' :
                                 installment.status === 'overdue' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      {installment.status === 'paid' ? 'مدفوع' :
                       installment.status === 'overdue' ? 'متأخر' : 'معلق'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          textAlign: 'center' as const,
          padding: '40px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          لم يتم إدخال تفاصيل المدفوعات بعد
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div>
      <h4 style={sectionTitleStyle}>
        <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
        المستندات ({diya.documents.length})
      </h4>

      {diya.documents.length > 0 ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          {diya.documents.map((doc, index) => (
            <div key={index} style={{
              ...partyCardStyle,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  رفع بواسطة: {doc.uploadedBy} | {formatDate(doc.uploadedDate)}
                </div>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '4px 8px',
                borderRadius: '8px',
                fontWeight: '600'
              }}>
                {doc.type}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center' as const,
          padding: '40px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          لم يتم رفع أي مستندات بعد
        </div>
      )}
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            <ScaleIcon style={{ width: '28px', height: '28px', color: '#667eea' }} />
            {diya.title}
          </h2>
          <div style={actionsStyle}>
            {canEdit && onEdit && (
              <button
                style={editButtonStyle}
                onClick={() => onEdit(diya)}
              >
                <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
                {ARABIC_LABELS.edit}
              </button>
            )}
            <button
              style={closeButtonStyle}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              <XMarkIcon style={{ width: '24px', height: '24px' }} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <DiyaStatus
            status={diya.status}
            priority={diya.priority}
            onStatusChange={onStatusUpdate ? (newStatus) => onStatusUpdate(diya.id, newStatus) : undefined}
            isEditable={canEdit}
          />
        </div>

        <div style={tabsStyle}>
          <button
            style={activeTab === 'overview' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('overview')}
          >
            نظرة عامة
          </button>
          <button
            style={activeTab === 'parties' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('parties')}
          >
            الأطراف
          </button>
          <button
            style={activeTab === 'payments' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('payments')}
          >
            المدفوعات
          </button>
          <button
            style={activeTab === 'documents' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('documents')}
          >
            المستندات
          </button>
        </div>

        <div style={contentStyle}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'parties' && renderParties()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'documents' && renderDocuments()}
        </div>
      </div>
    </div>
  );
};

export default memo(DiyaDetailsModal);