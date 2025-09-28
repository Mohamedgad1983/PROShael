import React from 'react';
import { Line, Doughnut, Pie } from 'react-chartjs-2';
import styles from './styles';

interface OverviewChartsProps {
  revenueData: any;
  memberDistribution: any;
  chartOptions: any;
  tribalSectionsData?: any;
}

const OverviewCharts: React.FC<OverviewChartsProps> = ({ revenueData, memberDistribution, chartOptions, tribalSectionsData }) => (
  <div style={{...styles.chartsGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'}}>
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

    {tribalSectionsData && (
      <div style={styles.chartCard}>
        <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>توزيع الأعضاء حسب الفخذ</h3>
        <div style={{ height: 'calc(100% - 40px)', position: 'relative' }}>
          <Pie
            data={tribalSectionsData}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins?.legend,
                  position: 'right',
                  labels: {
                    font: {
                      family: 'Cairo, sans-serif',
                      size: 12
                    },
                    generateLabels: function(chart: any) {
                      const data = chart.data;
                      if (data.labels.length && data.datasets.length) {
                        return data.labels.map((label: string, i: number) => {
                          const dataset = data.datasets[0];
                          const value = dataset.data[i];
                          const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return {
                            text: `${label} (${value} - ${percentage}%)`,
                            fillStyle: dataset.backgroundColor[i],
                            strokeStyle: dataset.borderColor || '#fff',
                            lineWidth: dataset.borderWidth || 1,
                            hidden: false,
                            index: i
                          };
                        });
                      }
                      return [];
                    }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context: any) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${label}: ${value} عضو (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    )}
  </div>
);

export default OverviewCharts;
