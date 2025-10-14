/**
 * Dashboard Page - Main Screen
 *
 * Features:
 * - Welcome card with user greeting
 * - Balance summary with account status
 * - Quick action buttons
 * - Upcoming events preview
 * - Recent payments list
 */

import userStore from '../state/user-store.js';
import paymentStore from '../state/payment-store.js';
import eventStore from '../state/event-store.js';
import customModal from '../components/custom-modal.js';
import logger from '../utils/logger.js';

class Dashboard {
  constructor() {
    this.init();
  }

  async init() {
    // Check authentication
    if (!userStore.state.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }

    // Show loading
    this.showLoading(true);

    try {
      // Initialize user store
      await userStore.actions.initialize(userStore.state);

      // Load data in parallel
      await Promise.all([
        paymentStore.actions.fetchPayments(paymentStore.state, { limit: 5 }),
        eventStore.actions.fetchEvents(eventStore.state)
      ]);

      // Render content
      this.renderWelcome();
      this.renderBalance();
      this.renderUpcomingEvents();
      this.renderRecentPayments();

      // Attach event listeners
      this.attachEventListeners();
    } catch (error) {
      logger.error('Dashboard initialization error:', { error });
      this.showError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      this.showLoading(false);
    }
  }

  renderWelcome() {
    const user = userStore.state.user;
    if (!user) return;

    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');

    const hour = new Date().getHours();
    let greeting = 'مرحباً';

    if (hour < 12) {
      greeting = 'صباح الخير';
    } else if (hour < 18) {
      greeting = 'مساء الخير';
    } else {
      greeting = 'مساء الخير';
    }

    welcomeTitle.textContent = `${greeting}، ${user.name || user.full_name || 'عزيزي العضو'}`;
    welcomeSubtitle.textContent = 'نتمنى لك يوماً سعيداً';
  }

  renderBalance() {
    const profile = userStore.state.profile;
    if (!profile) return;

    const balanceAmount = document.getElementById('balanceAmount');
    const lastPayment = document.getElementById('lastPayment');
    const accountStatus = document.getElementById('accountStatus');
    const membershipBadge = document.getElementById('membershipBadge');

    // Format balance
    const balance = profile.balance || 0;
    balanceAmount.textContent = this.formatCurrency(balance);

    // Last payment date
    if (paymentStore.state.payments.length > 0) {
      const lastPaymentDate = paymentStore.state.payments[0].created_at;
      lastPayment.textContent = this.formatDate(lastPaymentDate);
    } else {
      lastPayment.textContent = 'لا توجد دفعات';
    }

    // Account status
    const membershipStatus = profile.membership_status || 'active';
    if (membershipStatus === 'active') {
      accountStatus.textContent = 'نشط';
      accountStatus.className = 'status-value status-active';
      membershipBadge.textContent = 'عضوية نشطة';
      membershipBadge.className = 'badge badge-success';
    } else if (membershipStatus === 'inactive') {
      accountStatus.textContent = 'غير نشط';
      accountStatus.className = 'status-value';
      membershipBadge.textContent = 'عضوية معلقة';
      membershipBadge.className = 'badge badge-warning';
    } else {
      accountStatus.textContent = 'معلق';
      accountStatus.className = 'status-value';
      membershipBadge.textContent = 'عضوية معلقة';
      membershipBadge.className = 'badge badge-warning';
    }
  }

  renderUpcomingEvents() {
    const container = document.getElementById('upcomingEventsList');
    const upcomingEvents = eventStore.state.upcomingEvents.slice(0, 3);

    if (upcomingEvents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p>لا توجد فعاليات قادمة</p>
        </div>
      `;
      return;
    }

    container.innerHTML = upcomingEvents.map(event => {
      const eventDate = new Date(event.date);
      const day = eventDate.getDate();
      const month = eventDate.toLocaleDateString('ar-SA', { month: 'short' });
      const time = eventDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="event-card" data-event-id="${event.id}">
          <div class="event-date">
            <span class="event-day">${day}</span>
            <span class="event-month">${month}</span>
          </div>
          <div class="event-details">
            <h4 class="event-title">${event.title}</h4>
            <div class="event-meta">
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                ${time}
              </div>
              <div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                ${event.location || 'لم يحدد'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers and keyboard accessibility
    container.querySelectorAll('.event-card').forEach(card => {
      // Make keyboard accessible
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `فعالية: ${card.querySelector('.event-title')?.textContent || 'فعالية'}`);

      // Click handler
      const handleActivate = () => {
        const eventId = card.dataset.eventId;
        window.location.href = `/events.html?id=${eventId}`;
      };

      card.addEventListener('click', handleActivate);

      // Keyboard handler
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      });
    });
  }

  renderRecentPayments() {
    const container = document.getElementById('recentPaymentsList');
    const payments = paymentStore.state.payments.slice(0, 5);

    if (payments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <p>لا توجد عمليات سابقة</p>
        </div>
      `;
      return;
    }

    container.innerHTML = payments.map(payment => {
      const isSuccess = payment.status === 'success' || payment.status === 'completed';
      const iconColor = isSuccess ? 'success' : 'warning';

      return `
        <div class="payment-item">
          <div class="payment-info">
            <div class="payment-icon" style="background: var(--${iconColor}-light); color: var(--${iconColor});">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isSuccess
                  ? '<path d="M20 6L9 17l-5-5" />'
                  : '<path d="M12 8v4M12 16h.01" /><circle cx="12" cy="12" r="10" />'
                }
              </svg>
            </div>
            <div class="payment-details">
              <div class="payment-description">${payment.description || 'دفعة اشتراك'}</div>
              <div class="payment-date">${this.formatDate(payment.created_at)}</div>
            </div>
          </div>
          <div class="payment-amount" style="color: var(--${iconColor});">
            ${this.formatCurrency(payment.amount)}
          </div>
        </div>
      `;
    }).join('');
  }

  attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', () => this.handleRefresh());
  }

  async handleRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.style.animation = 'spin 1s linear';

    try {
      await Promise.all([
        userStore.actions.fetchProfile(userStore.state),
        paymentStore.actions.fetchPayments(paymentStore.state, { limit: 5 }),
        eventStore.actions.fetchEvents(eventStore.state)
      ]);

      this.renderBalance();
      this.renderUpcomingEvents();
      this.renderRecentPayments();

      // Show success feedback
      this.showToast('تم تحديث البيانات', 'success');
    } catch (error) {
      logger.error('Refresh error:', { error });
      this.showToast('فشل تحديث البيانات', 'error');
    } finally {
      setTimeout(() => {
        refreshBtn.style.animation = '';
      }, 1000);
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
  }

  async showError(message) {
    await customModal.alert(message, 'خطأ');
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.style.animation = 'slideUp 0.3s ease-out';

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

// Initialize dashboard
new Dashboard();
