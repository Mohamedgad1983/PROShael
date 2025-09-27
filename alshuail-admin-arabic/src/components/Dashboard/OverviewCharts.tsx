import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import styles from './styles';

interface OverviewChartsProps {
  revenueData: any;
  memberDistribution: any;
  chartOptions: any;
}

const OverviewCharts: React.FC<OverviewChartsProps> = ({ revenueData, memberDistribution, chartOptions }) => (
  <div style={styles.chartsGrid}>
    <div style={styles.chartCard}>
      <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>الإيرادات الشهرية</h3>
      <div style={{ height: 'calc(100% - 40px)' }}>
        <Line data={revenueData} options={chartOptions} />
      </div>
    </div>

    <div style={styles.chartCard}>
      <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>توزيع الأعضاء</h3>
      <div style={{ height: 'calc(100% - 40px)' }}>
        <Doughnut data={memberDistribution} options={chartOptions} />
      </div>
    </div>
  </div>
);

export default OverviewCharts;
