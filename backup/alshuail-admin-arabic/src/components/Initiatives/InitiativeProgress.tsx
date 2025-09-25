import React from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { Initiative, Contribution, InitiativeProgress as IInitiativeProgress } from './types';
import { CURRENCY } from '../../constants/arabic';

interface InitiativeProgressProps {
  initiative: Initiative;
  contributions: Contribution[];
  className?: string;
}

const InitiativeProgress: React.FC<InitiativeProgressProps> = ({
  initiative,
  contributions,
  className = ''
}) => {
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getDaysLeft = (endDate?: Date): number | undefined => {
    if (!endDate) return undefined;
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getProgressData = (): IInitiativeProgress => {
    const percentage = Math.min((initiative.raisedAmount / initiative.targetAmount) * 100, 100);
    const remaining = Math.max(initiative.targetAmount - initiative.raisedAmount, 0);
    const contributors = new Set(contributions.filter(c => c.status === 'approved').map(c => c.memberId)).size;
    const daysLeft = getDaysLeft(initiative.endDate);
    const recentContributions = contributions
      .filter(c => c.status === 'approved')
      .sort((a, b) => b.contributionDate.getTime() - a.contributionDate.getTime())
      .slice(0, 5);

    return {
      percentage,
      remaining,
      contributors,
      daysLeft,
      recentContributions
    };
  };

  const progress = getProgressData();
  const approvedContributions = contributions.filter(c => c.status === 'approved');
  const totalContributions = approvedContributions.length;
  const averageContribution = totalContributions > 0 ?
    approvedContributions.reduce((sum, c) => sum + c.amount, 0) / totalContributions : 0;

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937'
  };

  const progressBarContainerStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '12px',
    background: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '12px',
    position: 'relative'
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    borderRadius: '6px',
    width: `${progress.percentage}%`,
    transition: 'width 0.8s ease-in-out',
    position: 'relative',
    overflow: 'hidden'
  };

  const progressTextStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600'
  };

  const amountInfoStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  };

  const infoCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease'
  };

  const infoValueStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '4px'
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  };

  const contributorsListStyle: React.CSSProperties = {
    marginTop: '20px'
  };

  const contributorItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    marginBottom: '8px',
    transition: 'all 0.2s ease'
  };

  const avatarStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600'
  };

  const milestoneStyle: React.CSSProperties = {
    marginTop: '20px',
    padding: '16px',
    background: progress.percentage >= 100 ?
      'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
      'rgba(245, 158, 11, 0.1)',
    borderRadius: '12px',
    color: progress.percentage >= 100 ? 'white' : '#d97706',
    textAlign: 'center' as const
  };

  const progressAnimation: React.CSSProperties = {
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    animation: 'progress-shine 2s ease-in-out infinite'
  };

  // Add CSS animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progress-shine {
        0% { left: -100%; }
        100% { left: 100%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{ ...containerStyle }} className={className}>
      <div style={headerStyle}>
        <ChartBarIcon style={{ width: '24px', height: '24px' }} />
        تقدم المبادرة
      </div>

      <div style={progressBarContainerStyle}>
        <div style={progressBarStyle}>
          <div style={progressFillStyle}>
            <div style={progressAnimation} />
          </div>
        </div>
        <div style={progressTextStyle}>
          <div style={{ color: '#10b981', fontSize: '16px' }}>
            {progress.percentage.toFixed(1)}% مكتمل
          </div>
          <div style={{ color: '#6b7280' }}>
            {formatAmount(initiative.raisedAmount)} من {formatAmount(initiative.targetAmount)} {CURRENCY.symbol}
          </div>
        </div>
      </div>

      <div style={amountInfoStyle}>
        <div
          style={infoCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CurrencyDollarIcon style={{
            width: '24px',
            height: '24px',
            color: '#10b981',
            margin: '0 auto 8px'
          }} />
          <div style={{ ...infoValueStyle, color: '#10b981' }}>
            {formatAmount(initiative.raisedAmount)}
          </div>
          <div style={infoLabelStyle}>المبلغ المجمع</div>
        </div>

        <div
          style={infoCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <UsersIcon style={{
            width: '24px',
            height: '24px',
            color: '#3b82f6',
            margin: '0 auto 8px'
          }} />
          <div style={{ ...infoValueStyle, color: '#3b82f6' }}>
            {progress.contributors}
          </div>
          <div style={infoLabelStyle}>المساهمون</div>
        </div>

        <div
          style={infoCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <HeartIcon style={{
            width: '24px',
            height: '24px',
            color: '#f59e0b',
            margin: '0 auto 8px'
          }} />
          <div style={{ ...infoValueStyle, color: '#f59e0b' }}>
            {formatAmount(Math.round(averageContribution))}
          </div>
          <div style={infoLabelStyle}>متوسط المساهمة</div>
        </div>

        {progress.daysLeft !== undefined && (
          <div
            style={infoCardStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ClockIcon style={{
              width: '24px',
              height: '24px',
              color: progress.daysLeft > 0 ? '#ef4444' : '#6b7280',
              margin: '0 auto 8px'
            }} />
            <div style={{
              ...infoValueStyle,
              color: progress.daysLeft > 0 ? '#ef4444' : '#6b7280'
            }}>
              {progress.daysLeft}
            </div>
            <div style={infoLabelStyle}>
              {progress.daysLeft > 0 ? 'يوم متبقي' : 'انتهت المهلة'}
            </div>
          </div>
        )}
      </div>

      {progress.percentage >= 100 ? (
        <div style={milestoneStyle}>
          <TrophyIcon style={{ width: '32px', height: '32px', margin: '0 auto 8px' }} />
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
            تهانينا! تم الوصول للهدف
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            تم جمع {formatAmount(initiative.raisedAmount)} {CURRENCY.symbol} بنجاح
          </div>
        </div>
      ) : progress.remaining <= (initiative.targetAmount * 0.1) ? (
        <div style={milestoneStyle}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            🔥 قريب من الهدف!
          </div>
          <div style={{ fontSize: '14px' }}>
            متبقي فقط {formatAmount(progress.remaining)} {CURRENCY.symbol}
          </div>
        </div>
      ) : null}

      {progress.recentContributions.length > 0 && (
        <div style={contributorsListStyle}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            آخر المساهمات
          </h4>
          {progress.recentContributions.map((contribution) => (
            <div
              key={contribution.id}
              style={contributorItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div
                style={{
                  ...avatarStyle,
                  backgroundImage: contribution.memberAvatar ? `url(${contribution.memberAvatar})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!contribution.memberAvatar && contribution.memberName.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                  {contribution.isAnonymous ? 'مساهم مجهول' : contribution.memberName}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(contribution.contributionDate)}
                </div>
              </div>
              <div style={{
                fontWeight: '700',
                color: '#10b981',
                fontSize: '14px'
              }}>
                +{formatAmount(contribution.amount)} {CURRENCY.symbol}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InitiativeProgress;