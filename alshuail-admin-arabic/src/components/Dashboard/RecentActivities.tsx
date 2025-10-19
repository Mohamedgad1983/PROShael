import React from 'react';
import styles from './styles';

export interface ActivityItem {
  user: string;
  action: string;
  time: string;
  amount?: string | null;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => (
  <div style={styles.activitiesCard}>
    <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>النشاطات الأخيرة</h3>
    {activities.map((activity, index) => (
      <div key={`${activity.user}-${index}`} style={styles.activityItem}>
        <div>
          <div style={{ fontWeight: 400, marginBottom: '4px' }}>{activity.user}</div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
            {activity.action}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            {activity.time}
          </div>
          {activity.amount && (
            <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 400 }}>
              {activity.amount}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default React.memo(RecentActivities);
