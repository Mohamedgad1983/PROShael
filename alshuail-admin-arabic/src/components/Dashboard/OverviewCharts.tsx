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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {/* Tribal Sections Chart - Large and Centered */}
    {tribalSectionsData && (
      <div style={{
        ...styles.chartCard,
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        height: '450px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{
          fontSize: '22px',
          marginBottom: '1.5rem',
          textAlign: 'center',
          color: '#1e293b',
          fontWeight: '600'
        }}>
          توزيع الأعضاء حسب الفخذ
        </h3>
        <div style={{ height: 'calc(100% - 60px)', position: 'relative', padding: '0 20px' }}>
          <Pie
            data={tribalSectionsData}
            options={{
              ...chartOptions,
              maintainAspectRatio: true,
              responsive: true,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins?.legend,
                  position: 'bottom',
                  labels: {
                    padding: 15,
                    font: {
                      family: 'Cairo, sans-serif',
                      size: 14,
                      weight: '500'
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

    {/* Other Charts - Side by Side */}
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
    </div>
  </div>
);

export default OverviewCharts;
