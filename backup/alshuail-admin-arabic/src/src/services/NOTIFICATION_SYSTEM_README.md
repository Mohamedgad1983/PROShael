# Al-Shuail Real-Time Notification System

A comprehensive real-time notification system for the Al-Shuail Family Management System with full Arabic RTL support, PWA capabilities, and advanced features.

## 🌟 Features

### Core Capabilities
- **Real-time WebSocket Integration** - Instant notifications via WebSocket connection
- **Push Notifications** - Browser push notifications with service worker support
- **Arabic RTL Support** - Full right-to-left layout and Arabic numeral conversion
- **Offline Functionality** - Notification queueing and offline caching
- **Permission Management** - Smart permission request handling
- **Background Operation** - Works when app is in background or closed

### Notification Types
- **Balance Updates** (تحديث الرصيد) - Account balance changes
- **Occasions** (مناسبات) - Family events (weddings, graduations, etc.)
- **Initiatives** (مبادرات) - Charitable initiatives and fundraising
- **Diyas** (ديات) - Blood money contributions
- **Payment Reminders** (تذكير بالدفع) - Monthly payment reminders
- **Family Announcements** (إعلانات عائلية) - General family announcements

## 📁 File Structure

```
src/
├── services/
│   ├── notificationService.js      # Core notification service
│   └── NOTIFICATION_SYSTEM_README.md
├── components/MobilePWA/
│   ├── NotificationCenter.jsx      # Main notification center UI
│   ├── NotificationDemo.jsx        # Testing and demo component
│   └── NotificationCards.jsx       # Legacy notification cards
├── hooks/
│   └── useNotifications.js         # React hook for notification management
├── utils/
│   ├── websocket.js               # WebSocket client with auto-reconnection
│   └── notificationTester.js      # Comprehensive testing suite
└── public/
    └── sw.js                      # Enhanced service worker
```

## 🚀 Quick Start

### 1. Initialize Notification Service

```javascript
import notificationService from '../services/notificationService';

// Initialize the service (automatically called)
// No manual initialization required
```

### 2. Use Notification Hook in Components

```javascript
import { useNotifications } from '../hooks/useNotifications';

const MyComponent = () => {
  const {
    notifications,
    unreadCount,
    permission,
    isConnected,
    markAsRead,
    requestPermission
  } = useNotifications();

  // Request permission if needed
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {/* Your component content */}
    </div>
  );
};
```

### 3. Display Notification Center

```javascript
import { NotificationCenter } from '../components/MobilePWA';

const App = () => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div>
      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};
```

## 🔧 Configuration

### Environment Variables

```env
# WebSocket URL for real-time connections
REACT_APP_WS_URL=ws://localhost:3001/ws

# API URL for backend communication
REACT_APP_API_URL=http://localhost:3001
```

### Service Worker Setup

The service worker is automatically registered and handles:
- Background push notifications
- Offline notification caching
- Notification click handling
- App badge updates

## 📱 Notification Types & Handlers

### Balance Update
```javascript
// Trigger balance update notification
notificationService.handleBalanceUpdate({
  newBalance: 2500,
  previousBalance: 2000
});
```

### New Occasion
```javascript
notificationService.handleNewOccasion({
  id: 'occasion-123',
  title: 'حفل زواج أحمد محمد',
  occasionType: 'زواج',
  date: '٢٠٢٤/١٠/١٥',
  time: '٧:٠٠ مساءً',
  location: 'قاعة الملك فهد'
});
```

### New Initiative
```javascript
notificationService.handleNewInitiative({
  id: 'initiative-456',
  title: 'مبادرة كسوة الشتاء',
  targetAmount: 20000,
  description: 'مبادرة لتوزيع ملابس الشتاء على المحتاجين'
});
```

### New Diya
```javascript
notificationService.handleNewDiya({
  id: 'diya-789',
  description: 'دية حادث مروري',
  targetAmount: 100000
});
```

### Payment Reminder
```javascript
notificationService.handlePaymentReminder({
  amount: 500,
  dueDate: '٢٠٢٤/١٠/٣٠'
});
```

## 🌐 WebSocket Integration

### Connection Management
```javascript
import wsClient from '../utils/websocket';

// Connect with authentication token
const token = localStorage.getItem('token');
await wsClient.connect(token);

// Listen for connection events
wsClient.on('connected', () => {
  console.log('WebSocket connected');
});

wsClient.on('disconnected', () => {
  console.log('WebSocket disconnected');
});

// Send messages
wsClient.send({
  type: 'custom-message',
  data: { key: 'value' }
});
```

### Event Handling
```javascript
// Listen for specific notification types
wsClient.on('balance-update', (data) => {
  notificationService.handleBalanceUpdate(data);
});

wsClient.on('new-occasion', (data) => {
  notificationService.handleNewOccasion(data);
});
```

## 🔔 Permission Management

### Request Permissions
```javascript
const { requestPermission, permission } = useNotifications();

// Check current permission status
if (permission === 'default') {
  const granted = await requestPermission();
  if (granted) {
    console.log('Notifications enabled');
  }
}
```

### Permission States
- `granted` - User has granted notification permission
- `denied` - User has denied notification permission
- `default` - Permission not yet requested

## 🧪 Testing

### Quick Test
```javascript
import notificationTester from '../utils/notificationTester';

// Run quick test
const result = await notificationTester.quickTest();
console.log('Quick test result:', result);
```

### Full Test Suite
```javascript
// Run comprehensive test suite
const results = await notificationTester.runAllTests();
console.log('Test results:', results);
```

### Manual Testing with Demo Component
```javascript
import { NotificationDemo } from '../components/MobilePWA';

// Use the demo component for interactive testing
<NotificationDemo />
```

## 🎨 UI Components

### NotificationCenter
A comprehensive notification center with:
- Filter tabs (All, Occasions, Initiatives, Diyas, Balance)
- Search functionality
- Swipe-to-dismiss gestures
- Read/unread state management
- Arabic RTL layout

### NotificationCards
Legacy notification cards component for backward compatibility.

### NotificationDemo
Testing and demonstration component with:
- System status indicators
- Test notification buttons
- Test suite execution
- Real-time connection monitoring

## 🔄 Offline Support

### Notification Queueing
```javascript
// Notifications are automatically queued when offline
notificationService.queueNotification(title, options);

// Process queued notifications when back online
await notificationService.processQueuedNotifications();
```

### Cached Notifications
```javascript
// Get notification history (works offline)
const history = notificationService.getNotificationHistory();

// Filter by type
const occasions = notificationService.getNotificationHistory('occasion');
```

## 🌍 Arabic & RTL Support

### Arabic Numerals
```javascript
// Convert numbers to Arabic numerals
const arabicNumber = notificationService.toArabicNumerals(12345);
// Result: "١٢٣٤٥"
```

### RTL Layout
All components include proper RTL support:
- Text alignment: `text-right`
- Direction: `dir="rtl"`
- Margin/padding adjustments: `mr-*` instead of `ml-*`

## 📊 Analytics & Monitoring

### Notification Statistics
```javascript
const { getNotificationStats } = useNotifications();

const stats = getNotificationStats();
console.log(stats);
// {
//   total: 25,
//   unread: 3,
//   recent24h: 5,
//   lastWeek: 12,
//   typeBreakdown: { occasion: 10, initiative: 8, ... },
//   readRate: "88.0"
// }
```

### Connection Monitoring
```javascript
// Check WebSocket connection status
const isConnected = notificationService.isConnectedToWebSocket();

// Get connection statistics
const stats = wsClient.getStats();
console.log(stats);
```

## 🔒 Security Features

### Token-based Authentication
- JWT tokens for WebSocket authentication
- Automatic token refresh
- Secure token storage

### Data Validation
- Input sanitization
- XSS prevention
- Content Security Policy compliance

## 🚀 Performance Optimization

### Efficient Updates
- Debounced state updates
- Lazy loading of notification history
- Memory management for large notification lists

### Caching Strategy
- Service worker caching for offline access
- IndexedDB for large data storage
- Smart cache invalidation

## 🐛 Troubleshooting

### Common Issues

#### Permission Denied
```javascript
// Check if permission is denied
if (Notification.permission === 'denied') {
  // Guide user to enable in browser settings
  alert('يرجى تفعيل الإشعارات في إعدادات المتصفح');
}
```

#### WebSocket Connection Failed
```javascript
// Check connection status
if (!wsClient.isWebSocketConnected()) {
  // Try manual reconnection
  await wsClient.reconnect();
}
```

#### Service Worker Not Registered
```javascript
// Check service worker registration
if (!('serviceWorker' in navigator)) {
  console.warn('Service workers not supported');
} else {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    console.warn('Service worker not registered');
  }
}
```

### Debug Mode
```javascript
// Enable debug logging
const wsClient = new WebSocketClient(url, {
  enableLogging: true
});
```

## 📚 API Reference

### NotificationService Methods
- `requestPermission()` - Request notification permission
- `showNotification(title, options)` - Show notification
- `handleBalanceUpdate(data)` - Handle balance update
- `handleNewOccasion(data)` - Handle new occasion
- `handleNewInitiative(data)` - Handle new initiative
- `handleNewDiya(data)` - Handle new diya
- `handlePaymentReminder(data)` - Handle payment reminder
- `markAsRead(id)` - Mark notification as read
- `getNotificationHistory(filter)` - Get notification history
- `clearAllNotifications()` - Clear all notifications

### useNotifications Hook Returns
- `notifications` - Array of all notifications
- `unreadCount` - Number of unread notifications
- `permission` - Current notification permission status
- `isConnected` - WebSocket connection status
- `markAsRead(id)` - Function to mark notification as read
- `markAllAsRead()` - Function to mark all as read
- `dismissNotification(id)` - Function to dismiss notification
- `clearAll()` - Function to clear all notifications
- `requestPermission()` - Function to request permission

## 🔮 Future Enhancements

### Planned Features
- [ ] Push notification subscriptions
- [ ] Notification scheduling
- [ ] Rich media notifications
- [ ] Voice notifications for accessibility
- [ ] Machine learning for smart notification timing
- [ ] Notification templates
- [ ] A/B testing for notification content

### Integration Plans
- [ ] SMS notifications fallback
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Telegram bot notifications
- [ ] Apple Push Notifications (when available)

## 📄 License

This notification system is part of the Al-Shuail Family Management System and follows the same licensing terms.

## 🤝 Contributing

When contributing to the notification system:

1. **Test thoroughly** - Use the test suite and demo component
2. **Maintain Arabic support** - Ensure RTL layout and Arabic numerals work
3. **Follow patterns** - Use existing patterns for new notification types
4. **Document changes** - Update this README for new features
5. **Performance** - Consider performance impact of changes

## 📞 Support

For issues related to the notification system:

1. Check the console for error messages
2. Run the test suite to identify issues
3. Use the NotificationDemo component for debugging
4. Check browser compatibility and permissions
5. Verify WebSocket server configuration

---

**Note**: This notification system is designed specifically for the Al-Shuail Family Management System with Arabic language support and Islamic cultural context in mind.