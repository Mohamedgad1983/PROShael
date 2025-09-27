import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import OverviewStats, { OverviewStat } from '../OverviewStats';
import OverviewCharts from '../OverviewCharts';
import RecentActivities, { ActivityItem } from '../RecentActivities';

jest.mock('react-chartjs-2', () => ({
  Line: ({ data }: { data: unknown }) => <div data-testid="line-chart">{JSON.stringify(data)}</div>,
  Doughnut: ({ data }: { data: unknown }) => <div data-testid="doughnut-chart">{JSON.stringify(data)}</div>
}));

describe('Dashboard overview components', () => {
  it('renders overview stats cards with trend indicator', () => {
    const stats: OverviewStat[] = [
      {
        title: 'إجمالي المشتركين',
        value: 45,
        trend: 12,
        icon: () => <svg data-testid="stat-icon" />,
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }
    ];

    render(<OverviewStats stats={stats} />);

    expect(screen.getByText('إجمالي المشتركين')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getByText('12%')).toBeTruthy();
    expect(screen.getByTestId('stat-icon')).toBeTruthy();
  });

  it('renders overview charts using provided datasets', () => {
    const dataset = { labels: ['A'], datasets: [{ data: [10] }] };

    render(
      <OverviewCharts
        revenueData={dataset}
        memberDistribution={dataset}
        chartOptions={{ responsive: true }}
      />
    );

    expect(screen.getByRole('heading', { name: 'الإيرادات الشهرية' })).toBeTruthy();
    expect(screen.getByTestId('line-chart')).toHaveTextContent('10');
    expect(screen.getByTestId('doughnut-chart')).toHaveTextContent('10');
  });

  it('renders recent activities list', () => {
    const activities: ActivityItem[] = [
      {
        user: 'أحمد الشعيل',
        action: 'أضاف مبادرة جديدة',
        time: 'قبل ساعتين',
        amount: '500 ﷼'
      }
    ];

    render(<RecentActivities activities={activities} />);

    expect(screen.getByText('أحمد الشعيل')).toBeTruthy();
    expect(screen.getByText('أضاف مبادرة جديدة')).toBeTruthy();
    expect(screen.getByText('قبل ساعتين')).toBeTruthy();
    expect(screen.getByText('500 ﷼')).toBeTruthy();
  });
});

