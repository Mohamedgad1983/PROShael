/**
 * Bottom Navigation Component
 *
 * Renders bottom navigation bar with 5 tabs
 * Handles active state and navigation
 */

export class Navigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.render();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('payment')) return 'payment';
    if (path.includes('events')) return 'events';
    if (path.includes('profile')) return 'profile';
    if (path.includes('notifications')) return 'notifications';
    return 'dashboard';
  }

  render() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'القائمة الرئيسية');

    nav.innerHTML = `
      <div class="nav-container">
        <a href="/dashboard.html" class="nav-item ${this.currentPage === 'dashboard' ? 'active' : ''}" aria-label="لوحة التحكم">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>الرئيسية</span>
        </a>

        <a href="/payment.html" class="nav-item ${this.currentPage === 'payment' ? 'active' : ''}" aria-label="الدفع">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>الدفع</span>
        </a>

        <a href="/events.html" class="nav-item ${this.currentPage === 'events' ? 'active' : ''}" aria-label="الفعاليات">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>الفعاليات</span>
        </a>

        <a href="/notifications.html" class="nav-item ${this.currentPage === 'notifications' ? 'active' : ''}" aria-label="الإشعارات">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>الإشعارات</span>
        </a>

        <a href="/profile.html" class="nav-item ${this.currentPage === 'profile' ? 'active' : ''}" aria-label="الملف الشخصي">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>الحساب</span>
        </a>
      </div>
    `;

    document.body.appendChild(nav);
  }
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Navigation());
} else {
  new Navigation();
}

export default Navigation;
