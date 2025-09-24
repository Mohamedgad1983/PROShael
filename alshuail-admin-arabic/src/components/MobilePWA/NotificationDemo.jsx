/**
 * NotificationDemo - Demo component to test notification system functionality
 * Features: Test different notification types, permission handling, real-time testing
 */

import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import notificationService from '../../services/notificationService';
import notificationTester from '../../utils/notificationTester';
import wsClient from '../../utils/websocket';
import NotificationCenter from './NotificationCenter';

const NotificationDemo = () => {
  const {
    notifications,
    unreadCount,
    permission,
    isConnected,
    requestPermission,
    addNotification
  } = useNotifications();

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      if (wsClient.isWebSocketConnected()) {
        setConnectionStatus('Connected');
      } else if (wsClient.isReconnecting) {
        setConnectionStatus('Reconnecting...');
      } else {
        setConnectionStatus('Disconnected');
      }
    };

    // Initial status
    updateStatus();

    // Listen for connection events
    wsClient.on('connected', updateStatus);
    wsClient.on('disconnected', updateStatus);
    wsClient.on('reconnecting', updateStatus);

    return () => {
      wsClient.off('connected', updateStatus);
      wsClient.off('disconnected', updateStatus);
      wsClient.off('reconnecting', updateStatus);
    };
  }, []);

  // Test notification types
  const testNotificationTypes = [
    {
      type: 'balance-update',
      title: 'تحديث الرصيد',
      description: 'اختبار تحديث الرصيد',
      testData: { newBalance: 2500, previousBalance: 2000 }
    },
    {
      type: 'new-occasion',
      title: 'مناسبة جديدة',
      description: 'اختبار إشعار مناسبة جديدة',
      testData: {
        id: 'test-occasion-1',
        title: 'حفل زواج أحمد محمد',
        occasionType: 'زواج',
        date: '٢٠٢٤/١٠/١٥'
      }
    },
    {
      type: 'new-initiative',
      title: 'مبادرة خيرية',
      description: 'اختبار إشعار مبادرة خيرية',
      testData: {
        id: 'test-initiative-1',
        title: 'مبادرة كسوة الشتاء',
        targetAmount: 20000
      }
    },
    {
      type: 'new-diya',
      title: 'دية جديدة',
      description: 'اختبار إشعار دية جديدة',
      testData: {
        id: 'test-diya-1',
        description: 'دية حادث مروري',
        targetAmount: 100000
      }
    },
    {
      type: 'payment-reminder',
      title: 'تذكير بالدفع',
      description: 'اختبار تذكير بالدفع',
      testData: { amount: 500 }
    }
  ];

  // Send test notification
  const sendTestNotification = async (notificationType) => {
    try {
      const testData = testNotificationTypes.find(t => t.type === notificationType);

      if (!testData) {
        throw new Error('Notification type not found');
      }

      // Simulate the notification handler
      switch (notificationType) {
        case 'balance-update':
          notificationService.handleBalanceUpdate(testData.testData);
          break;
        case 'new-occasion':
          notificationService.handleNewOccasion(testData.testData);
          break;
        case 'new-initiative':
          notificationService.handleNewInitiative(testData.testData);
          break;
        case 'new-diya':
          notificationService.handleNewDiya(testData.testData);
          break;
        case 'payment-reminder':
          notificationService.handlePaymentReminder(testData.testData);
          break;
        default:
          await notificationService.showNotification(testData.title, {
            body: testData.description,
            tag: `test-${notificationType}`,
            data: { type: notificationType, ...testData.testData }
          });
      }

      console.log(`✅ Test notification sent: ${testData.title}`);
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
    }
  };

  // Run quick test
  const runQuickTest = async () => {
    setIsTestRunning(true);
    try {
      const result = await notificationTester.quickTest();
      setTestResults({ quick: result, timestamp: new Date() });
    } catch (error) {
      console.error('Quick test failed:', error);
      setTestResults({ quick: false, error: error.message, timestamp: new Date() });
    } finally {
      setIsTestRunning(false);
    }
  };

  // Run full test suite
  const runFullTestSuite = async () => {
    setIsTestRunning(true);
    try {
      const results = await notificationTester.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Full test suite failed:', error);
      setTestResults({ error: error.message, timestamp: new Date() });
    } finally {
      setIsTestRunning(false);
    }
  };

  // Connect WebSocket
  const connectWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('لا يوجد رمز مصادقة. يرجى تسجيل الدخول أولاً');
        return;
      }

      await wsClient.connect(token);
      console.log('✅ WebSocket connected manually');
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      alert('فشل في الاتصال بالخادم');
    }
  };

  // Get permission status color
  const getPermissionColor = () => {
    switch (permission) {
      case 'granted': return 'text-green-400';
      case 'denied': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  // Get connection status color
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'text-green-400';
      case 'Reconnecting...': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  if (showNotificationCenter) {
    return (
      <NotificationCenter
        onClose={() => setShowNotificationCenter(false)}
      />
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">اختبار نظام الإشعارات</h1>
        <p className="text-slate-300 text-sm">اختبار شامل لنظام الإشعارات المباشرة</p>
      </div>

      {/* System Status */}
      <div className="glass-card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">حالة النظام</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">صلاحية الإشعارات:</span>
            <span className={`font-medium ${getPermissionColor()}`}>
              {permission === 'granted' ? 'ممنوحة' : permission === 'denied' ? 'مرفوضة' : 'غير محددة'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">اتصال الخادم:</span>
            <span className={`font-medium ${getConnectionColor()}`}>
              {connectionStatus === 'Connected' ? 'متصل' :
               connectionStatus === 'Reconnecting...' ? 'إعادة اتصال...' : 'غير متصل'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">إجمالي الإشعارات:</span>
            <span className="text-white font-medium">
              {notifications.length}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">غير مقروءة:</span>
            <span className="text-white font-medium">
              {unreadCount}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="btn btn-primary flex-1 text-sm py-2"
            >
              طلب الإذن
            </button>
          )}

          {connectionStatus !== 'Connected' && (
            <button
              onClick={connectWebSocket}
              className="btn btn-secondary flex-1 text-sm py-2"
            >
              اتصال
            </button>
          )}

          <button
            onClick={() => setShowNotificationCenter(true)}
            className="btn btn-outline flex-1 text-sm py-2"
          >
            مركز الإشعارات ({unreadCount})
          </button>
        </div>
      </div>

      {/* Test Notifications */}
      <div className="glass-card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">اختبار أنواع الإشعارات</h2>

        <div className="grid grid-cols-1 gap-3">
          {testNotificationTypes.map((test) => (
            <button
              key={test.type}
              onClick={() => sendTestNotification(test.type)}
              className="btn btn-secondary text-right py-3 px-4"
              disabled={permission !== 'granted'}
            >
              <div>
                <div className="font-semibold">{test.title}</div>
                <div className="text-xs opacity-75">{test.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Test Suite */}
      <div className="glass-card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">مجموعة الاختبارات</h2>

        <div className="space-y-3">
          <button
            onClick={runQuickTest}
            disabled={isTestRunning}
            className="w-full btn btn-primary py-3"
          >
            {isTestRunning ? 'جاري الاختبار...' : 'اختبار سريع'}
          </button>

          <button
            onClick={runFullTestSuite}
            disabled={isTestRunning}
            className="w-full btn btn-secondary py-3"
          >
            {isTestRunning ? 'جاري الاختبار...' : 'اختبار شامل'}
          </button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-semibold text-white mb-2">نتائج الاختبار</h3>

            {testResults.quick !== undefined ? (
              <div className={`text-sm ${testResults.quick ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.quick ? '✅ الاختبار السريع نجح' : '❌ الاختبار السريع فشل'}
                {testResults.error && <div className="text-red-400 mt-1">{testResults.error}</div>}
              </div>
            ) : testResults.summary ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-300">
                  المجموع: {testResults.summary.total} |
                  نجح: <span className="text-green-400">{testResults.summary.passed}</span> |
                  فشل: <span className="text-red-400">{testResults.summary.failed}</span>
                </div>
                <div className="text-sm text-slate-300">
                  معدل النجاح: {testResults.summary.passRate}
                </div>
                <div className="text-sm text-slate-300">
                  المدة: {testResults.summary.duration}
                </div>

                {testResults.recommendations && testResults.recommendations.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-yellow-400 mb-1">التوصيات:</div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      {testResults.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                ❌ خطأ في الاختبار: {testResults.error}
              </div>
            )}

            <div className="text-xs text-slate-500 mt-2">
              آخر اختبار: {new Date(testResults.timestamp).toLocaleString('ar-SA')}
            </div>
          </div>
        )}
      </div>

      {/* Recent Notifications Preview */}
      {notifications.length > 0 && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4">آخر الإشعارات</h2>

          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg bg-slate-800/50 ${
                  !notification.isRead ? 'border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">
                      {notification.title}
                    </div>
                    {notification.body && (
                      <div className="text-slate-300 text-xs mt-1 line-clamp-2">
                        {notification.body}
                      </div>
                    )}
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                  )}
                </div>
              </div>
            ))}

            {notifications.length > 3 && (
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="w-full text-center text-blue-400 text-sm py-2 hover:text-blue-300"
              >
                عرض جميع الإشعارات ({notifications.length})
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default NotificationDemo;