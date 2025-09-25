# Mobile PWA Components for Al-Shuail System

This directory contains the core mobile Progressive Web App (PWA) components for the Al-Shuail Family Management System, implementing Phase M2 of the mobile implementation plan.

## 🚀 Components Overview

### Core Components

#### 1. **MobileLoginScreen.jsx**
Phone-based authentication screen with Saudi number validation.

**Features:**
- Saudi phone number validation (05xxxxxxxx pattern)
- Password field with show/hide toggle
- Remember me functionality
- Glassmorphic design with dark theme
- Loading states and error handling
- Full Arabic RTL support

```jsx
import { MobileLoginScreen } from './components/MobilePWA';

<MobileLoginScreen
  onLogin={handleLogin}
  loading={isLoading}
  error={errorMessage}
/>
```

#### 2. **MobileDashboard.jsx**
Main dashboard screen with complete mobile experience.

**Features:**
- Welcome header with member information
- Balance card with minimum balance indicator
- Quick actions grid
- Notification cards
- Bottom navigation
- Pull-to-refresh support
- Scroll-to-top functionality

```jsx
import { MobileDashboard } from './components/MobilePWA';

<MobileDashboard
  user={{ name: 'أحمد الشعيل', membershipId: 'SH001' }}
  balance={2500}
  onActionSelect={handleAction}
  onNotificationSelect={handleNotification}
  onTabChange={handleTabChange}
/>
```

#### 3. **BalanceCard.jsx**
Enhanced balance display with color coding and progress tracking.

**Features:**
- Color coding: Green (≥3000 SAR), Red (<3000 SAR)
- Progress bar to minimum balance (3000 SAR)
- Arabic numerals display
- Warning messages for low balance
- Quick action buttons (Pay, Statement)

```jsx
import { BalanceCard } from './components/MobilePWA';

<BalanceCard
  balance={2500}
  minimumBalance={3000}
  currency="ريال"
  lastPaymentDate="١٥/٩/٢٠٢٤"
  nextPaymentDue="١٥/١٠/٢٠٢٤"
  onViewDetails={handleViewDetails}
/>
```

#### 4. **QuickActions.jsx**
Touch-optimized action buttons grid.

**Features:**
- 8 main actions: Pay, Statement, Events, Profile, Documents, Support, Notifications, Settings
- Gradient backgrounds with hover effects
- Touch feedback and haptic response
- Responsive grid layout
- Accessibility support

```jsx
import { QuickActions } from './components/MobilePWA';

<QuickActions
  onActionSelect={handleActionSelect}
/>
```

#### 5. **NotificationCards.jsx**
Interactive notification cards for occasions, initiatives, and diyas.

**Features:**
- Three types: Occasions (💒), Initiatives (🧥), Diyas (🤝)
- Progress bars for financial targets
- Priority indicators (High/Medium/Low)
- Swipe-to-dismiss functionality
- Read/unread states

```jsx
import { NotificationCards } from './components/MobilePWA';

<NotificationCards
  onNotificationSelect={handleNotificationSelect}
  onMarkAsRead={handleMarkAsRead}
  onDismiss={handleDismiss}
/>
```

#### 6. **BottomNavigation.jsx**
Mobile navigation bar with safe area support.

**Features:**
- 5 main tabs: Dashboard, Payments, Events, Notifications, Profile
- Badge counts for notifications
- Center floating action button
- Safe area padding for modern devices
- Haptic feedback

```jsx
import { BottomNavigation } from './components/MobilePWA';

<BottomNavigation
  activeTab="dashboard"
  onTabChange={handleTabChange}
  badgeCounts={{ notifications: 3, payments: 1 }}
  isVisible={true}
/>
```

## 🎨 Design System

### Arabic RTL Support
- All components support right-to-left layout
- Arabic numerals conversion built-in
- Proper text alignment and spacing
- Icon positioning for RTL layout

### Color Coding System
```css
/* Balance Status */
.balance-good: green (≥3000 SAR)
.balance-warning: yellow (near minimum)
.balance-critical: red (<3000 SAR)

/* Priority Levels */
.priority-high: red indicator
.priority-medium: yellow indicator
.priority-low: green indicator

/* Notification Types */
.occasion: pink gradient (💒)
.initiative: blue gradient (🧥)
.diya: green gradient (🤝)
```

### Touch Targets
- Minimum 44px touch targets
- Haptic feedback on interactions
- Hover states for desktop testing
- Active states with scale animations

## 📱 Mobile Features

### Safe Area Support
Components automatically handle device safe areas:
```jsx
const { applySafeArea } = useMobile();

<div style={applySafeArea(['top', 'bottom'])}>
  Content
</div>
```

### Haptic Feedback
Built-in haptic feedback for interactions:
```jsx
const { feedback } = useHapticFeedback();

// Usage
feedback('light');   // Light tap
feedback('medium');  // Button press
feedback('heavy');   // Important action
feedback('success'); // Success feedback
feedback('error');   // Error feedback
```

### Responsive Breakpoints
```css
xs: < 480px  (small mobile)
sm: 480-768px (mobile)
md: 768-1024px (tablet)
lg: 1024-1440px (desktop)
xl: > 1440px (large desktop)
```

## 🔧 Setup and Usage

### 1. Import Components
```jsx
import {
  MobileLoginScreen,
  MobileDashboard,
  BalanceCard,
  QuickActions,
  NotificationCards,
  BottomNavigation
} from './components/MobilePWA';
```

### 2. Use Mobile Hooks
```jsx
import { useMobile, useHapticFeedback } from './hooks/useMobile';

const { device, viewport, applySafeArea } = useMobile();
const { feedback } = useHapticFeedback();
```

### 3. Apply Mobile Styles
```jsx
import './styles/mobile-arabic.css';
```

## 🧪 Testing

### Demo Component
Use `MobilePWADemo.jsx` to test all components:

```jsx
import MobilePWADemo from './components/MobilePWA/MobilePWADemo';

// Renders complete mobile experience
<MobilePWADemo />
```

### Development Features
- Desktop controls for testing different screens
- Mobile framework info overlay
- Real-time device detection
- Network status monitoring

## 📋 Phase M2 Implementation Status

✅ **Completed Features:**
- [x] Mobile login with Saudi phone validation
- [x] Dashboard with balance card (3000 SAR minimum)
- [x] Color-coded balance display
- [x] Quick actions grid (8 actions)
- [x] Notification cards (occasions, initiatives, diyas)
- [x] Bottom navigation with badges
- [x] Arabic numerals conversion
- [x] RTL layout support
- [x] Haptic feedback integration
- [x] Safe area handling
- [x] Touch-optimized interfaces

## 🔮 Next Phase Features (M3)

🔄 **Planned:**
- [ ] Payment processing integration
- [ ] QR code scanning
- [ ] Voice notes support
- [ ] Offline data caching
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Photo upload with compression
- [ ] GPS location services

## 📱 Progressive Web App Features

### Installation Support
```jsx
const { isInstallable, promptInstall } = usePWAInstall();

if (isInstallable) {
  await promptInstall();
}
```

### Offline Support
```jsx
const { isOnline, isSlowConnection } = useNetworkStatus();

if (!isOnline) {
  // Show offline message
}
```

### Service Worker
PWA features require service worker registration in `public/sw.js`.

## 🎯 Best Practices

### Performance
- Components use `React.memo` for optimization
- Lazy loading for heavy components
- Image optimization with WebP support
- Minimal bundle size with tree shaking

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### Security
- Input validation on all forms
- XSS protection
- Secure token storage
- Privacy-first design

## 🐛 Troubleshooting

### Common Issues

1. **Haptic feedback not working**
   - Check device support: `canVibrate` property
   - Requires HTTPS in production
   - iOS requires user interaction first

2. **Safe area not applied**
   - Ensure viewport meta tag in HTML
   - Check CSS custom properties support
   - iOS requires `viewport-fit=cover`

3. **RTL layout issues**
   - Verify `dir="rtl"` on container
   - Check CSS logical properties usage
   - Test with Arabic content

### Debug Tools
```jsx
// Enable debug mode
localStorage.setItem('mobile-debug', 'true');

// View device info
console.log(useMobile());
```

## 📄 File Structure

```
MobilePWA/
├── index.js                    # Component exports
├── MobileLoginScreen.jsx       # Phone login
├── MobileDashboard.jsx         # Main dashboard
├── BalanceCard.jsx            # Balance display
├── QuickActions.jsx           # Action grid
├── NotificationCards.jsx      # Notifications
├── BottomNavigation.jsx       # Bottom nav
├── MobilePWADemo.jsx          # Demo component
├── MobileFrameworkIntegration.jsx # Framework demo
├── PWAMobileDemo.jsx          # Legacy demo
└── README.md                  # This file
```

## 🤝 Contributing

When adding new mobile components:

1. Follow the existing naming convention
2. Include Arabic RTL support
3. Add haptic feedback for interactions
4. Use the mobile CSS framework
5. Test on actual mobile devices
6. Update this README

## 📞 Support

For issues with mobile components:
- Check device compatibility
- Verify network connectivity
- Test on multiple devices
- Review browser console errors

---

**Al-Shuail Family Management System**
Mobile PWA Components v1.0.0
Built with React 19.1.1 + Mobile-First Design