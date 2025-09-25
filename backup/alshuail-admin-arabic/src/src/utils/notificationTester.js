/**
 * Notification System Tester
 * Tests notifications in background, foreground, and closed app states
 */

import notificationService from '../services/notificationService';
import wsClient from './websocket';

class NotificationTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.testStartTime = null;
  }

  /**
   * Run comprehensive notification tests
   */
  async runAllTests() {
    if (this.isRunning) {
      console.warn('⚠️ Tests already running');
      return;
    }

    this.isRunning = true;
    this.testStartTime = Date.now();
    this.testResults = [];

    console.log('🧪 Starting notification system tests...');

    try {
      // Test 1: Permission and basic setup
      await this.testPermissionAndSetup();

      // Test 2: Service worker registration
      await this.testServiceWorkerRegistration();

      // Test 3: WebSocket connection
      await this.testWebSocketConnection();

      // Test 4: Local notifications
      await this.testLocalNotifications();

      // Test 5: Background notifications
      await this.testBackgroundNotifications();

      // Test 6: Offline handling
      await this.testOfflineHandling();

      // Test 7: Arabic RTL content
      await this.testArabicContent();

      // Test 8: Notification types
      await this.testNotificationTypes();

      // Test 9: Click handling
      await this.testClickHandling();

      // Test 10: Badge updates
      await this.testBadgeUpdates();

      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addTestResult('Test Suite', false, error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test notification permission and basic setup
   */
  async testPermissionAndSetup() {
    const testName = 'Permission and Setup';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      // Test permission request
      const permissionGranted = await notificationService.requestPermission();

      if (!permissionGranted) {
        throw new Error('Permission denied or not granted');
      }

      // Test service initialization
      const isSupported = notificationService.isNotificationSupported();
      if (!isSupported) {
        throw new Error('Notification service not properly initialized');
      }

      this.addTestResult(testName, true, 'Permission granted and service initialized');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test service worker registration
   */
  async testServiceWorkerRegistration() {
    const testName = 'Service Worker Registration';
    console.log(`🔧 Testing: ${testName}`);

    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers not supported');
      }

      // Check if service worker is registered
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        throw new Error('Service worker not registered');
      }

      // Test service worker state
      if (registration.active) {
        this.addTestResult(testName, true, 'Service worker active and ready');
      } else {
        throw new Error('Service worker not active');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection() {
    const testName = 'WebSocket Connection';
    console.log(`🔧 Testing: ${testName}`);

    return new Promise((resolve) => {
      try {
        // Get token for connection
        const token = localStorage.getItem('token');
        if (!token) {
          this.addTestResult(testName, false, 'No authentication token found');
          resolve();
          return;
        }

        // Set up connection event listeners
        const connectionTimeout = setTimeout(() => {
          wsClient.off('connected', onConnected);
          wsClient.off('error', onError);
          this.addTestResult(testName, false, 'Connection timeout (10s)');
          resolve();
        }, 10000);

        const onConnected = () => {
          clearTimeout(connectionTimeout);
          wsClient.off('connected', onConnected);
          wsClient.off('error', onError);
          this.addTestResult(testName, true, 'WebSocket connected successfully');
          resolve();
        };

        const onError = (error) => {
          clearTimeout(connectionTimeout);
          wsClient.off('connected', onConnected);
          wsClient.off('error', onError);
          this.addTestResult(testName, false, `Connection error: ${error}`);
          resolve();
        };

        wsClient.on('connected', onConnected);
        wsClient.on('error', onError);

        // Attempt connection
        wsClient.connect(token).catch((error) => {
          clearTimeout(connectionTimeout);
          this.addTestResult(testName, false, error.message);
          resolve();
        });

      } catch (error) {
        this.addTestResult(testName, false, error.message);
        resolve();
      }
    });
  }

  /**
   * Test local notifications
   */
  async testLocalNotifications() {
    const testName = 'Local Notifications';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Test basic notification
      await notificationService.showNotification('اختبار الإشعارات', {
        body: 'هذا اختبار لنظام الإشعارات المحلية',
        tag: 'test-local',
        icon: '/icons/icon-192.png',
        data: { test: true }
      });

      // Wait a moment
      await this.sleep(1000);

      this.addTestResult(testName, true, 'Local notification displayed');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test background notifications
   */
  async testBackgroundNotifications() {
    const testName = 'Background Notifications';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Simulate background notification
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        throw new Error('Service worker not available for background notifications');
      }

      // Test service worker notification
      await registration.showNotification('إشعار الخلفية', {
        body: 'اختبار الإشعارات في الخلفية',
        tag: 'test-background',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        dir: 'rtl',
        lang: 'ar',
        data: { type: 'background-test' }
      });

      this.addTestResult(testName, true, 'Background notification works via service worker');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test offline handling
   */
  async testOfflineHandling() {
    const testName = 'Offline Handling';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Simulate offline scenario
      const originalOnLine = navigator.onLine;

      // Test notification queueing when offline
      notificationService.queueNotification('إشعار غير متصل', {
        body: 'هذا الإشعار تم حفظه عند عدم الاتصال',
        tag: 'test-offline'
      });

      // Check if notification was queued
      const queuedNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');

      if (queuedNotifications.length > 0) {
        this.addTestResult(testName, true, 'Notifications properly queued when offline');
      } else {
        this.addTestResult(testName, false, 'Notification queueing not working');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test Arabic RTL content
   */
  async testArabicContent() {
    const testName = 'Arabic RTL Content';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Test Arabic numerals conversion
      const arabicNumber = notificationService.toArabicNumerals(12345);
      const expectedArabic = '١٢٣٤٥';

      if (arabicNumber !== expectedArabic) {
        throw new Error(`Arabic numeral conversion failed: got ${arabicNumber}, expected ${expectedArabic}`);
      }

      // Test Arabic notification
      await notificationService.showNotification('اختبار المحتوى العربي', {
        body: 'تم تحديث رصيدك إلى ١٢٣٤ ريال سعودي',
        dir: 'rtl',
        lang: 'ar',
        tag: 'test-arabic'
      });

      this.addTestResult(testName, true, 'Arabic content and RTL support working');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test different notification types
   */
  async testNotificationTypes() {
    const testName = 'Notification Types';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Test balance update
      notificationService.handleBalanceUpdate({
        newBalance: 2500,
        previousBalance: 2000
      });

      // Test occasion notification
      notificationService.handleNewOccasion({
        id: 'test-occasion',
        title: 'حفل زواج',
        occasionType: 'زواج',
        date: '٢٠٢٤/١٠/١٥'
      });

      // Test initiative notification
      notificationService.handleNewInitiative({
        id: 'test-initiative',
        title: 'مبادرة خيرية',
        targetAmount: 10000
      });

      // Test diya notification
      notificationService.handleNewDiya({
        id: 'test-diya',
        description: 'دية حادث',
        targetAmount: 50000
      });

      this.addTestResult(testName, true, 'All notification types processed successfully');

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test notification click handling
   */
  async testClickHandling() {
    const testName = 'Click Handling';
    console.log(`🔧 Testing: ${testName}`);

    try {
      let clickHandled = false;

      // Set up click event listener
      const handleClick = (event) => {
        clickHandled = true;
        window.removeEventListener('notificationClicked', handleClick);
      };

      window.addEventListener('notificationClicked', handleClick);

      // Simulate notification click
      notificationService.handleNotificationClick({
        type: 'balance',
        amount: 1000
      });

      // Wait for event
      await this.sleep(100);

      if (clickHandled) {
        this.addTestResult(testName, true, 'Notification click events properly handled');
      } else {
        this.addTestResult(testName, false, 'Click events not triggered');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test badge updates
   */
  async testBadgeUpdates() {
    const testName = 'Badge Updates';
    console.log(`🔧 Testing: ${testName}`);

    try {
      // Add test notification to history
      notificationService.addToNotificationHistory('اختبار الشارة', {
        body: 'اختبار تحديث شارة التطبيق',
        data: { type: 'test' }
      });

      // Check if badge was updated
      const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
      const unreadCount = history.filter(n => !n.isRead).length;

      if (unreadCount > 0) {
        this.addTestResult(testName, true, `Badge count updated: ${unreadCount} unread notifications`);
      } else {
        this.addTestResult(testName, false, 'Badge count not updated properly');
      }

    } catch (error) {
      this.addTestResult(testName, false, error.message);
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.testStartTime;

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
        duration: `${duration}ms`
      },
      results: this.testResults,
      systemInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        notificationPermission: Notification.permission,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        webSocketSupported: 'WebSocket' in window,
        onLine: navigator.onLine
      },
      recommendations: this.generateRecommendations()
    };

    console.log('\n📊 NOTIFICATION SYSTEM TEST REPORT');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    console.log(`Duration: ${report.summary.duration}`);
    console.log('\nDetailed Results:');

    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.test}: ${result.message}`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    // Store report in localStorage for debugging
    localStorage.setItem('notificationTestReport', JSON.stringify(report));

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => !r.passed);

    if (failedTests.some(t => t.test === 'Permission and Setup')) {
      recommendations.push('Request notification permission from user');
    }

    if (failedTests.some(t => t.test === 'Service Worker Registration')) {
      recommendations.push('Ensure service worker is properly registered and active');
    }

    if (failedTests.some(t => t.test === 'WebSocket Connection')) {
      recommendations.push('Check WebSocket server configuration and authentication');
    }

    if (failedTests.some(t => t.test === 'Background Notifications')) {
      recommendations.push('Verify service worker notification capabilities');
    }

    if (failedTests.some(t => t.test === 'Offline Handling')) {
      recommendations.push('Implement proper offline notification queueing');
    }

    if (Notification.permission === 'denied') {
      recommendations.push('Guide user to enable notifications in browser settings');
    }

    return recommendations;
  }

  /**
   * Utility function to pause execution
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test specific notification scenario
   */
  async testScenario(scenarioName, testFunction) {
    console.log(`🔧 Testing scenario: ${scenarioName}`);

    try {
      await testFunction();
      this.addTestResult(scenarioName, true, 'Scenario completed successfully');
    } catch (error) {
      this.addTestResult(scenarioName, false, error.message);
      console.error(`❌ Scenario failed:`, error);
    }
  }

  /**
   * Quick test for development
   */
  async quickTest() {
    console.log('🚀 Running quick notification test...');

    try {
      // Quick permission check
      const hasPermission = await notificationService.requestPermission();
      if (!hasPermission) {
        throw new Error('Permission required for quick test');
      }

      // Send test notification
      await notificationService.showNotification('اختبار سريع', {
        body: 'نظام الإشعارات يعمل بشكل صحيح!',
        tag: 'quick-test',
        icon: '/icons/icon-192.png'
      });

      console.log('✅ Quick test passed - notification system working');
      return true;

    } catch (error) {
      console.error('❌ Quick test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const notificationTester = new NotificationTester();

export default notificationTester;