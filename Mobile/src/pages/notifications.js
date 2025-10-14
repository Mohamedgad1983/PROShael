import userStore from '../state/user-store.js';
import apiClient from '../api/api-client.js';

class NotificationsPage {
  constructor() {
    this.notifications = [];
    this.currentFilter = 'all';
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }

    await this.loadNotifications();
    this.renderNotifications();
    this.attachEventListeners();
  }

  async loadNotifications() {
    try {
      const result = await apiClient.get('/api/notifications');
      if (result.success) {
        this.notifications = result.data;
        this.updateCounts();
      }
    } catch (error) {
      this.notifications = this.getMockNotifications();
      this.updateCounts();
    }
  }

  getMockNotifications() {
    return [
      {id:1,type:'event',title:'فعالية جديدة',message:'تم إضافة فعالية اجتماع العائلة السنوي',time:'منذ ساعة',read:false},
      {id:2,type:'payment',title:'تأكيد الدفع',message:'تم استلام دفعة الاشتراك بنجاح',time:'منذ 3 ساعات',read:false},
      {id:3,type:'announcement',title:'إعلان عام',message:'تحديث في نظام العضوية',time:'منذ يوم',read:true}
    ];
  }

  renderNotifications() {
    const container = document.getElementById('notificationsList');
    const filtered = this.currentFilter === 'all'
      ? this.notifications
      : this.notifications.filter(n => !n.read);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg><p>لا توجد إشعارات</p></div>';
      return;
    }

    container.innerHTML = filtered.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notification-icon ${n.type}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getIconPath(n.type)}
          </svg>
        </div>
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <div class="notification-message">${n.message}</div>
          <div class="notification-time">${n.time}</div>
        </div>
        ${!n.read ? '<div class="unread-badge"></div>' : ''}
      </div>
    `).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => this.markAsRead(parseInt(item.dataset.id)));
    });
  }

  getIconPath(type) {
    const icons = {
      event: '<rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />',
      payment: '<rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />',
      crisis: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />',
      announcement: '<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />'
    };
    return icons[type] || icons.announcement;
  }

  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.updateCounts();
      this.renderNotifications();
    }
  }

  updateCounts() {
    document.getElementById('allCount').textContent = this.notifications.length;
    document.getElementById('unreadCount').textContent = this.notifications.filter(n => !n.read).length;
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    document.getElementById('markAllReadBtn').addEventListener('click', () => {
      this.notifications.forEach(n => n.read = true);
      this.updateCounts();
      this.renderNotifications();
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.dataset.filter;
        this.renderNotifications();
      });
    });
  }
}

new NotificationsPage();
