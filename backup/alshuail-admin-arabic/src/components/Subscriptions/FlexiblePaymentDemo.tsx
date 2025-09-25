import React, { useState } from 'react';
import FlexiblePayment from './FlexiblePayment';
import './FlexiblePayment.css';

interface DemoState {
  isProcessing: boolean;
  paymentHistory: Array<{
    id: string;
    amount: number;
    date: Date;
    status: 'success' | 'pending' | 'failed';
  }>;
  totalContributed: number;
}

const FlexiblePaymentDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    isProcessing: false,
    paymentHistory: [
      {
        id: 'PAY001',
        amount: 200,
        date: new Date('2024-09-15'),
        status: 'success'
      },
      {
        id: 'PAY002',
        amount: 500,
        date: new Date('2024-09-10'),
        status: 'success'
      }
    ],
    totalContributed: 700
  });

  // Simulate payment processing
  const handlePaymentSubmit = async (amount: number): Promise<void> => {
    setDemoState(prev => ({ ...prev, isProcessing: true }));

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add to payment history
    const newPayment = {
      id: `PAY${String(Date.now()).slice(-6)}`,
      amount,
      date: new Date(),
      status: 'success' as const
    };

    setDemoState(prev => ({
      ...prev,
      isProcessing: false,
      paymentHistory: [newPayment, ...prev.paymentHistory],
      totalContributed: prev.totalContributed + amount
    }));
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      padding: '40px 20px',
      direction: 'rtl',
      fontFamily: "'Tajawal', Arial, sans-serif"
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            لوحة تحكم آل الشعيل - نظام الدفع المرن
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            نظام دفع متقدم يدعم المبالغ المرنة مع تصميم زجاجي أنيق وتجربة مستخدم سلسة
          </p>
        </div>

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#10B981',
              marginBottom: '8px'
            }}>
              {formatAmount(demoState.totalContributed)} ريال
            </div>
            <div style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              إجمالي المساهمات
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#3B82F6',
              marginBottom: '8px'
            }}>
              {demoState.paymentHistory.length}
            </div>
            <div style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              عدد المعاملات
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#8B5CF6',
              marginBottom: '8px'
            }}>
              {demoState.paymentHistory.length > 0
                ? formatAmount(Math.round(demoState.totalContributed / demoState.paymentHistory.length))
                : '0'} ريال
            </div>
            <div style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              متوسط المساهمة
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Payment Component */}
          <div>
            <FlexiblePayment
              onPaymentSubmit={handlePaymentSubmit}
              minAmount={50}
              currency="ريال"
              className="demo-payment"
            />
          </div>

          {/* Payment History */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '32px',
            color: 'white'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '24px',
              color: 'white',
              textAlign: 'center'
            }}>
              سجل المساهمات
            </h3>

            {demoState.paymentHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                padding: '40px 0'
              }}>
                لا توجد مساهمات بعد
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {demoState.paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#10B981',
                        marginBottom: '4px'
                      }}>
                        {formatAmount(payment.amount)} ريال
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        {formatDate(payment.date)}
                      </div>
                    </div>
                    <div style={{
                      background: payment.status === 'success'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                      color: payment.status === 'success' ? '#10B981' : '#EF4444',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {payment.status === 'success' ? 'مكتملة' : 'معلقة'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Showcase */}
        <div style={{
          marginTop: '64px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '40px',
          color: 'white'
        }}>
          <h3 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            مميزات النظام
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {[
              {
                icon: '💰',
                title: 'مبالغ مرنة',
                description: 'ادفع أي مبلغ تريده ابتداءً من 50 ريال بمضاعفات 50'
              },
              {
                icon: '🎨',
                title: 'تصميم زجاجي',
                description: 'واجهة أنيقة بتأثيرات زجاجية وتدرجات لونية جميلة'
              },
              {
                icon: '📱',
                title: 'تجاوب كامل',
                description: 'يعمل بشكل مثالي على جميع الأجهزة والشاشات'
              },
              {
                icon: '🌍',
                title: 'دعم العربية',
                description: 'مصمم خصيصاً للغة العربية مع دعم RTL كامل'
              },
              {
                icon: '⚡',
                title: 'تفاعلية متقدمة',
                description: 'رسوم متحركة سلسة وتجربة مستخدم متميزة'
              },
              {
                icon: '🔒',
                title: 'آمان عالي',
                description: 'معالجة آمنة للمدفوعات مع التحقق من صحة البيانات'
              }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease'
                }}
              >
                <div style={{
                  fontSize: '36px',
                  marginBottom: '16px'
                }}>
                  {feature.icon}
                </div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#3B82F6'
                }}>
                  {feature.title}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.5'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Specifications */}
        <div style={{
          marginTop: '48px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white'
        }}>
          <h4 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#8B5CF6'
          }}>
            المواصفات التقنية
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <div>✅ React TypeScript</div>
            <div>✅ CSS3 Glassmorphism</div>
            <div>✅ Arabic RTL Support</div>
            <div>✅ Mobile Responsive</div>
            <div>✅ Accessibility (WCAG)</div>
            <div>✅ Touch Optimized</div>
            <div>✅ High Contrast Support</div>
            <div>✅ Print Styles</div>
            <div>✅ Reduced Motion</div>
            <div>✅ Modern Animations</div>
            <div>✅ Input Validation</div>
            <div>✅ Error Handling</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlexiblePaymentDemo;