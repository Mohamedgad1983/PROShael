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
        maxWidth: '600px',
        margin: '0 auto',
        height: '500px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        borderRadius: '20px',
        padding: '30px',
      }}>
        <h3 style={{
          fontSize: '24px',
          marginBottom: '1rem',
          textAlign: 'center',
          color: '#1e293b',
          fontWeight: '600',
          fontFamily: 'Cairo, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          توزيع الأرصدة حسب الفخذ
        </h3>
        <div style={{ height: 'calc(100% - 50px)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pie
            data={tribalSectionsData}
            options={{
              ...chartOptions,
              maintainAspectRatio: false,
              responsive: true,
              layout: {
                padding: {
                  top: 20,
                  bottom: 20,
                  left: 20,
                  right: 20
                }
              },
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  display: true,
                  position: 'right',
                  align: 'center',
                  labels: {
                    padding: 12,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: {
                      family: '-apple-system, BlinkMacSystemFont, Cairo, sans-serif',
                      size: 13,
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
                          const formattedValue = (value / 1000).toFixed(0);
                          return {
                            text: `${label}: ${formattedValue}k SAR`,
                            fillStyle: dataset.backgroundColor[i],
                            strokeStyle: dataset.borderColor || '#fff',
                            lineWidth: 2,
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
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  titleFont: {
                    family: '-apple-system, BlinkMacSystemFont, Cairo, sans-serif',
                    size: 14,
                    weight: 'bold'
                  },
                  bodyFont: {
                    family: '-apple-system, BlinkMacSystemFont, Cairo, sans-serif',
                    size: 13
                  },
                  padding: 12,
                  cornerRadius: 8,
                  callbacks: {
                    label: function(context: any) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      const formattedValue = value.toLocaleString('ar-SA');
                      return [`${label}`, `الرصيد: ${formattedValue} ريال`, `النسبة: ${percentage}%`];
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

export default React.memo(OverviewCharts);
