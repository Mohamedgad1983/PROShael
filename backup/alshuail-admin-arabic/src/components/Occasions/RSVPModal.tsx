import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { Occasion, RSVP, RSVPStatus } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface RSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  occasion: Occasion | null;
  currentUserRSVP?: RSVP;
  allRSVPs?: RSVP[];
  onSubmitRSVP: (status: RSVPStatus, guestCount: number, notes?: string) => void;
  isLoading?: boolean;
  isManagementMode?: boolean;
}

const RSVPModal: React.FC<RSVPModalProps> = ({
  isOpen,
  onClose,
  occasion,
  currentUserRSVP,
  allRSVPs = [],
  onSubmitRSVP,
  isLoading = false,
  isManagementMode = false
}) => {
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus>('pending');
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (currentUserRSVP) {
      setSelectedStatus(currentUserRSVP.status);
      setGuestCount(currentUserRSVP.guestCount);
      setNotes(currentUserRSVP.notes || '');
    }
  }, [currentUserRSVP]);

  if (!isOpen || !occasion) return null;

  const getStatusIcon = (status: RSVPStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon style={{ width: '20px', height: '20px' }} />;
      case 'declined':
        return <XCircleIcon style={{ width: '20px', height: '20px' }} />;
      case 'maybe':
        return <QuestionMarkCircleIcon style={{ width: '20px', height: '20px' }} />;
      default:
        return <QuestionMarkCircleIcon style={{ width: '20px', height: '20px' }} />;
    }
  };

  const getStatusColor = (status: RSVPStatus) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'declined': return '#ef4444';
      case 'maybe': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: RSVPStatus) => {
    switch (status) {
      case 'confirmed': return ARABIC_LABELS.confirmed;
      case 'declined': return ARABIC_LABELS.declined;
      case 'maybe': return ARABIC_LABELS.maybe;
      default: return 'في الانتظار';
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  const formatTime = (time: string): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(`2000-01-01T${time}`));
  };

  const handleSubmit = () => {
    onSubmitRSVP(selectedStatus, guestCount, notes);
  };

  const getAttendanceStats = () => {
    const confirmed = allRSVPs.filter(rsvp => rsvp.status === 'confirmed').length;
    const declined = allRSVPs.filter(rsvp => rsvp.status === 'declined').length;
    const maybe = allRSVPs.filter(rsvp => rsvp.status === 'maybe').length;
    const pending = allRSVPs.filter(rsvp => rsvp.status === 'pending').length;
    const totalGuests = allRSVPs
      .filter(rsvp => rsvp.status === 'confirmed')
      .reduce((sum, rsvp) => sum + rsvp.guestCount, 0);

    return { confirmed, declined, maybe, pending, totalGuests };
  };

  const stats = getAttendanceStats();

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
    maxWidth: '600px',
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
    margin: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
  };

  const occasionInfoStyle: React.CSSProperties = {
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px'
  };

  const statusButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: '2px solid transparent',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    direction: 'rtl' as const
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const
  };

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '20px'
  };

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    marginBottom: '8px'
  };

  const attendeeItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    marginBottom: '8px'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            {isManagementMode ? ARABIC_LABELS.rsvpManagement : ARABIC_LABELS.rsvp}
          </h2>
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

        <div style={occasionInfoStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
            {occasion.title}
          </h3>
          <div style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '4px' }}>
              📅 {formatDate(occasion.date)} - {formatTime(occasion.time)}
            </div>
            <div style={{ marginBottom: '4px' }}>
              📍 {occasion.location}
            </div>
            {occasion.maxAttendees && (
              <div>
                👥 الحد الأقصى: {occasion.maxAttendees} شخص
              </div>
            )}
          </div>
        </div>

        {isManagementMode ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={statCardStyle}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {stats.confirmed}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>مؤكد</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                  {stats.declined}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>معتذر</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {stats.maybe}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>ربما</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                  {stats.totalGuests}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>إجمالي الحضور</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                قائمة الحضور ({allRSVPs.length})
              </h4>
              <button
                style={{
                  padding: '6px 12px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              </button>
            </div>

            <div style={{ maxHeight: showDetails ? '300px' : '150px', overflowY: 'auto' }}>
              {allRSVPs.map((rsvp) => (
                <div key={rsvp.id} style={attendeeItemStyle}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '20px',
                      background: rsvp.memberAvatar ? `url(${rsvp.memberAvatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {!rsvp.memberAvatar && rsvp.memberName.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {rsvp.memberName}
                    </div>
                    {showDetails && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        الضيوف: {rsvp.guestCount} | التاريخ: {new Intl.DateTimeFormat('ar-SA').format(rsvp.responseDate)}
                        {rsvp.notes && <div>الملاحظات: {rsvp.notes}</div>}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      background: getStatusColor(rsvp.status),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {getStatusIcon(rsvp.status)}
                    {getStatusLabel(rsvp.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                حالة الحضور
              </h4>

              {(['confirmed', 'maybe', 'declined'] as RSVPStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  style={{
                    ...statusButtonStyle,
                    borderColor: selectedStatus === status ? getStatusColor(status) : 'transparent',
                    background: selectedStatus === status ?
                      `${getStatusColor(status)}15` : 'rgba(255, 255, 255, 0.8)',
                    color: selectedStatus === status ? getStatusColor(status) : '#374151'
                  }}
                  onClick={() => setSelectedStatus(status)}
                >
                  {getStatusIcon(status)}
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>

            {selectedStatus === 'confirmed' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  <UsersIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                  عدد الحضور (بما في ذلك نفسك)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={occasion.maxAttendees || 100}
                />
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                <ChatBubbleLeftIcon style={{ width: '16px', height: '16px', display: 'inline', marginLeft: '4px' }} />
                ملاحظات (اختيارية)
              </label>
              <textarea
                style={textareaStyle}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات أو طلبات خاصة..."
              />
            </div>

            <button
              style={submitButtonStyle}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? ARABIC_LABELS.loading : ARABIC_LABELS.save}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RSVPModal;