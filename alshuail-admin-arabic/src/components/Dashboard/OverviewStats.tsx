import React from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import styles from './styles';

export interface OverviewStat {
  title: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

interface OverviewStatsProps {
  stats: OverviewStat[];
}

const OverviewStats: React.FC<OverviewStatsProps> = ({ stats }) => (
  <div style={styles.statsGrid}>
    {stats.map((stat, index) => {
      const Icon = stat.icon;

      return (
        <div
          key={`${stat.title}-${index}`}
          style={styles.statCard}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ ...styles.iconBox, background: stat.color }}>
            <Icon style={{ width: '30px', height: '30px', color: 'white' }} />
          </div>
          <h3 style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
            {stat.title}
          </h3>
          <div style={{ fontSize: '24px', fontWeight: 400, marginBottom: '8px' }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: '12px',
            color: stat.trend >= 0 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <ArrowTrendingUpIcon
              style={{
                width: '14px',
                height: '14px',
                transform: stat.trend < 0 ? 'rotate(180deg)' : 'none'
              }}
              aria-hidden="true"
            />
            {Math.abs(stat.trend)}%
          </div>
        </div>
      );
    })}
  </div>
);

export default OverviewStats;
