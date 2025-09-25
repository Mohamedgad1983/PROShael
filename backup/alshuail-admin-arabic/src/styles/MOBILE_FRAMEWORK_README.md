# Al-Shuail PWA Mobile-First Arabic Framework

## Phase M1: Core Mobile Layout Foundation

This comprehensive mobile-first framework provides a complete solution for creating touch-friendly, RTL-optimized interfaces for Arabic-speaking users.

## 🎯 Framework Overview

### Core Features
- **Mobile-First Design**: Optimized for screens from 320px to 2560px
- **Arabic RTL Support**: Complete right-to-left layout system
- **Touch-Friendly**: 48px minimum touch targets with haptic feedback
- **Glassmorphism UI**: Modern glass effects with backdrop blur
- **Dark Theme**: Slate gradient backgrounds (#0f172a to #1e293b)
- **Safe Area Support**: iPhone notch and dynamic island compatibility
- **PWA Optimized**: Full Progressive Web App capabilities

## 📱 Breakpoint System

```css
/* Mobile-First Breakpoints */
- Extra Small: < 375px    (older phones)
- Small Mobile: 375-428px (iPhone SE to iPhone 14 Pro Max)
- Large Mobile: 429-768px (phablets, small tablets)
- Tablet: 769-1024px     (iPad, Android tablets)
- Desktop: > 1024px      (laptops, desktops)
```

## 🎨 Design System

### Color Palette
```css
/* Slate Dark Theme */
--color-slate-900: #0f172a  /* Background primary */
--color-slate-800: #1e293b  /* Background secondary */
--color-slate-700: #334155  /* Surface */
--color-slate-600: #475569  /* Border */
--color-slate-400: #94a3b8  /* Text secondary */
--color-slate-100: #f1f5f9  /* Text primary */

/* Brand Colors */
--color-primary: #3b82f6    /* Blue */
--color-secondary: #8b5cf6  /* Purple */
--color-accent: #06b6d4     /* Cyan */
```

### Typography
```css
/* Arabic Fonts */
--font-family-arabic: 'Cairo', 'Noto Sans Arabic', system-ui, sans-serif;

/* Font Sizes (Mobile Optimized) */
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
```

### Spacing System
```css
/* Touch-Optimized Spacing */
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */

/* Touch Targets */
--touch-target-min: 48px
--touch-target-recommended: 56px
```

## 🚀 Getting Started

### 1. Import the Framework
```css
/* In your main CSS file */
@import './styles/mobile-arabic.css';
```

### 2. Basic HTML Structure
```html
<div class="min-h-screen bg-gradient-primary" dir="rtl">
  <div class="safe-area-container">
    <!-- Your app content -->
  </div>
</div>
```

### 3. Use React Hooks
```javascript
import { useMobile } from '../hooks/useMobile';

function MyComponent() {
  const { device, viewport, safeArea } = useMobile();

  return (
    <div className={`glass-card ${viewport.isMobile ? 'p-4' : 'p-6'}`}>
      {/* Component content */}
    </div>
  );
}
```

## 🧩 Core Components

### Glass Cards
```html
<div class="glass-card">
  <h3 class="text-lg font-semibold text-white mb-4">العنوان</h3>
  <p class="text-slate-300">المحتوى</p>
</div>
```

### Touch-Friendly Buttons
```html
<!-- Primary Button -->
<button class="btn btn-primary">
  حفظ البيانات
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">
  إلغاء
</button>

<!-- Ghost Button -->
<button class="btn btn-ghost">
  عرض المزيد
</button>
```

### Form Elements
```html
<div class="form-group">
  <label class="form-label">الاسم الكامل</label>
  <input type="text" class="form-input" placeholder="أدخل الاسم">
</div>

<div class="form-group">
  <label class="form-label">الحالة</label>
  <select class="form-select">
    <option>اختر الحالة</option>
    <option>نشط</option>
    <option>معلق</option>
  </select>
</div>
```

### Bottom Sheet Modal
```html
<div class="bottom-sheet active">
  <div class="bottom-sheet-backdrop"></div>
  <div class="bottom-sheet-content">
    <div class="bottom-sheet-handle"></div>
    <div class="bottom-sheet-header">
      <h3 class="text-lg font-semibold text-white">العنوان</h3>
    </div>
    <div class="bottom-sheet-body">
      <!-- Content -->
    </div>
  </div>
</div>
```

### Floating Action Button
```html
<button class="fab fab-right">
  <svg class="w-6 h-6" fill="none" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
  </svg>
</button>
```

### Tab Navigation
```html
<nav class="tab-nav">
  <button class="tab-nav-item active">نظرة عامة</button>
  <button class="tab-nav-item">الأعضاء</button>
  <button class="tab-nav-item">التقارير</button>
</nav>
```

### Bottom Navigation
```html
<nav class="bottom-nav">
  <div class="bottom-nav-items">
    <a href="#" class="bottom-nav-item active">
      <svg class="bottom-nav-icon"><!-- Icon --></svg>
      <span class="bottom-nav-label">الرئيسية</span>
    </a>
    <!-- More items -->
  </div>
</nav>
```

## 📐 Layout Utilities

### Container System
```html
<!-- Responsive container with safe margins -->
<div class="container">
  <!-- Content automatically centers and adds appropriate padding -->
</div>
```

### Grid System
```html
<!-- Mobile-first grid -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div class="glass-card">Item 1</div>
  <div class="glass-card">Item 2</div>
  <div class="glass-card">Item 3</div>
  <div class="glass-card">Item 4</div>
</div>
```

### Flexbox Utilities
```html
<!-- RTL-aware flex layout -->
<div class="flex items-center justify-between">
  <span>النص</span>
  <button class="btn btn-primary">زر</button>
</div>
```

### Spacing Utilities
```html
<!-- Responsive spacing -->
<div class="p-4 mb-6 mx-auto">
  <h2 class="text-xl font-bold mb-4">العنوان</h2>
  <p class="text-slate-400">النص</p>
</div>
```

## 🌐 RTL Support

### Automatic RTL Layout
```html
<!-- RTL container -->
<div dir="rtl">
  <!-- All content automatically becomes RTL -->
</div>
```

### RTL-Aware Classes
```css
/* These classes automatically flip for RTL */
.text-start   /* Right in RTL, Left in LTR */
.text-end     /* Left in RTL, Right in LTR */
.mr-auto      /* Becomes ml-auto in RTL */
.ml-auto      /* Becomes mr-auto in RTL */
```

### RTL Flexbox
```html
<!-- Automatically reverses direction in RTL -->
<div class="flex flex-row">
  <div>First (rightmost in RTL)</div>
  <div>Second (leftmost in RTL)</div>
</div>
```

## 📱 Safe Area Support

### iPhone Notch/Dynamic Island
```html
<!-- Safe area aware container -->
<div class="safe-area-container">
  <!-- Content avoids notch areas -->
</div>

<!-- Manual safe area classes -->
<header class="safe-area-top">Header</header>
<footer class="safe-area-bottom">Footer</footer>
```

### iOS Specific
```css
/* Automatic iOS safe area handling */
.ios-safe-top    /* 44px + safe-area-inset-top */
.ios-safe-bottom /* 34px + safe-area-inset-bottom */
```

## 🎛️ Responsive Utilities

### Breakpoint-Specific Classes
```html
<!-- Show/hide based on screen size -->
<div class="mobile:hidden tablet:block">Only on tablet+</div>
<div class="desktop:hidden">Only on mobile/tablet</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  <!-- Responsive columns -->
</div>
```

### Responsive Text
```html
<h1 class="text-2xl md:text-3xl lg:text-4xl">
  Responsive heading
</h1>
```

## 🎨 Glassmorphism Effects

### Glass Components
```html
<!-- Basic glass effect -->
<div class="glass">Content</div>

<!-- Light glass -->
<div class="glass-light">Lighter content</div>

<!-- Dark glass -->
<div class="glass-dark">Darker content</div>

<!-- Glass card with hover effect -->
<div class="glass-card">Interactive card</div>
```

### Custom Glass Effects
```css
.custom-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

## 🔄 Animations

### Built-in Animations
```html
<!-- Fade in animation -->
<div class="animate-fade-in">Fades in</div>

<!-- Slide animations (RTL aware) -->
<div class="animate-slide-in-right">Slides from right</div>
<div class="animate-slide-in-left">Slides from left</div>

<!-- Loading animations -->
<div class="animate-spin">Spinning loader</div>
<div class="animate-pulse">Pulsing placeholder</div>
```

### Custom Animations
```css
/* Custom spring animation */
.custom-animation {
  animation: customSpring 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes customSpring {
  0% { transform: scale(0.8) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
```

## 🎯 Touch Optimization

### Touch Targets
```html
<!-- Minimum 48px touch target -->
<button class="touch-target">
  <svg class="w-6 h-6"><!-- Icon --></svg>
</button>

<!-- Larger 56px touch target -->
<button class="touch-target-lg">
  Large touch area
</button>
```

### Touch Feedback
```javascript
// Automatic touch feedback with React hook
import { useHapticFeedback } from '../hooks/useMobile';

function Button() {
  const { feedback } = useHapticFeedback();

  return (
    <button
      className="btn btn-primary"
      onClick={() => feedback('light')}
    >
      Click me
    </button>
  );
}
```

## 🌟 Advanced Features

### Pull to Refresh
```javascript
import { usePullToRefresh } from '../hooks/useMobile';

function ListView() {
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh(
    async () => {
      // Refresh data
      await fetchData();
    }
  );

  return (
    <div ref={containerRef} className="overflow-y-auto">
      {/* List content */}
    </div>
  );
}
```

### Swipe Gestures
```javascript
import { useSwipeGesture } from '../hooks/useMobile';

function SwipeableCard() {
  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right')
  });

  return <div ref={swipeRef} className="glass-card">Swipeable content</div>;
}
```

### Network Awareness
```javascript
import { useNetworkStatus } from '../hooks/useMobile';

function DataComponent() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (!isOnline) {
    return <div>You're offline</div>;
  }

  if (isSlowConnection) {
    return <div>Loading optimized for slow connection...</div>;
  }

  return <div>Full experience</div>;
}
```

## 🛠️ Utility Classes

### Display
```css
.hidden         /* display: none */
.block          /* display: block */
.flex           /* display: flex */
.grid           /* display: grid */
.inline-flex    /* display: inline-flex */
```

### Positioning
```css
.relative       /* position: relative */
.absolute       /* position: absolute */
.fixed          /* position: fixed */
.sticky         /* position: sticky */
```

### Dimensions
```css
.w-full         /* width: 100% */
.h-full         /* height: 100% */
.min-h-screen   /* min-height: 100vh */
.max-w-full     /* max-width: 100% */
```

### Colors
```css
.text-white     /* color: white */
.text-slate-100 /* color: var(--color-slate-100) */
.text-primary   /* color: var(--color-primary) */
.text-success   /* color: var(--color-success) */
.text-error     /* color: var(--color-error) */
```

### Border Radius
```css
.rounded-none   /* border-radius: 0 */
.rounded-sm     /* border-radius: 6px */
.rounded        /* border-radius: 8px */
.rounded-lg     /* border-radius: 12px */
.rounded-xl     /* border-radius: 16px */
.rounded-2xl    /* border-radius: 24px */
.rounded-full   /* border-radius: 9999px */
```

## ♿ Accessibility

### Built-in A11y Features
```html
<!-- Screen reader only text -->
<span class="sr-only">Screen reader description</span>

<!-- Focus ring for keyboard navigation -->
<button class="btn btn-primary focus-ring">Accessible button</button>
```

### Reduced Motion Support
```css
/* Automatically respects user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  /* All animations become instant */
}
```

### High Contrast Support
```css
/* Automatically adapts for high contrast mode */
@media (prefers-contrast: high) {
  /* Enhanced borders and contrast */
}
```

## 🔧 Customization

### CSS Custom Properties
```css
/* Override default values */
:root {
  --color-primary: #your-brand-color;
  --radius-lg: 16px;
  --space-4: 20px;
  --touch-target-min: 52px;
}
```

### Component Customization
```css
/* Extend existing components */
.my-custom-card {
  @extend .glass-card;
  /* Additional styles */
  border: 2px solid var(--color-primary);
}
```

## 📚 Best Practices

### Mobile Performance
1. Use `transform` instead of changing layout properties
2. Minimize DOM queries in touch events
3. Use `will-change` for animated elements
4. Optimize images for mobile (use WebP when possible)

### Arabic Typography
1. Always use `dir="rtl"` on Arabic containers
2. Test with long Arabic text for overflow
3. Use Arabic-specific fonts (Cairo, Noto Sans Arabic)
4. Consider Arabic number formats (Arabic-Indic vs Western)

### Touch Interactions
1. Minimum 48px touch targets
2. Provide visual feedback on touch
3. Use appropriate haptic feedback
4. Test on real devices

### PWA Guidelines
1. Test offline functionality
2. Ensure fast loading with service workers
3. Use proper manifest configuration
4. Test installation on multiple devices

## 🐛 Troubleshooting

### Common Issues

#### Safe Area Not Working
```css
/* Ensure viewport meta tag is set */
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

/* Check if CSS environment variables are supported */
@supports (padding: max(0px)) {
  .safe-area-top {
    padding-top: max(44px, env(safe-area-inset-top));
  }
}
```

#### RTL Layout Issues
```css
/* Ensure proper RTL setup */
html[dir="rtl"] .flex-row {
  flex-direction: row-reverse;
}

/* Use logical properties when possible */
.element {
  margin-inline-start: 1rem; /* Better than margin-left/right */
}
```

#### Touch Events Not Working
```javascript
// Ensure passive event listeners
element.addEventListener('touchstart', handler, { passive: false });

// Prevent default for custom gestures
event.preventDefault();
```

## 📖 Examples

See `PWAMobileDemo.jsx` for a complete implementation example showcasing:
- Responsive navigation
- Glass morphism effects
- Touch-friendly interactions
- Bottom sheet modals
- RTL layout
- Safe area handling
- Haptic feedback

## 🔮 Future Enhancements

### Phase M2 (Planned)
- Advanced gestures (pinch, rotate)
- Voice interface for Arabic
- Enhanced offline capabilities
- Better performance monitoring
- Advanced animation presets

### Phase M3 (Planned)
- AR integration for family trees
- Islamic calendar widgets
- Prayer time integration
- Advanced accessibility features

---

**Created for Al-Shuail Family Management System**
Mobile-First Arabic PWA Framework v1.0