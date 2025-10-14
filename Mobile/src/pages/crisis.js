import userStore from '../state/user-store.js';
import apiClient from '../api/api-client.js';

class CrisisPage {
  constructor() {
    this.activeCrisis = null;
    this.history = [];
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) window.location.href = '/login.html';
    await this.loadCrisisData();
    this.renderActiveCrisis();
    this.renderHistory();
    this.attachEventListeners();
  }

  async loadCrisisData() {
    try {
      const result = await apiClient.get('/api/crisis');
      if (result.success) {
        this.activeCrisis = result.data.active;
        this.history = result.data.history;
      }
    } catch {
      this.activeCrisis = null;
      this.history = [];
    }
  }

  renderActiveCrisis() {
    const banner = document.getElementById('activeCrisisBanner');
    const safeCard = document.getElementById('safeButtonCard');

    if (this.activeCrisis) {
      banner.style.display = 'flex';
      safeCard.style.display = 'block';
      document.getElementById('crisisTitle').textContent = this.activeCrisis.title;
      document.getElementById('crisisMessage').textContent = this.activeCrisis.message;
    } else {
      banner.style.display = 'none';
      safeCard.style.display = 'none';
    }
  }

  renderHistory() {
    const container = document.getElementById('crisisHistoryList');

    if (this.history.length === 0) {
      container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><p>لا توجد تنبيهات سابقة</p></div>';
      return;
    }

    container.innerHTML = this.history.map(crisis => `
      <div class="crisis-history-item">
        <div class="crisis-history-header">
          <div class="crisis-history-title">${crisis.title}</div>
          <span class="crisis-status-badge ${crisis.status}">${crisis.status === 'active' ? 'نشط' : 'منتهي'}</span>
        </div>
        <div class="crisis-history-message">${crisis.message}</div>
        <div class="crisis-history-date">${this.formatDate(crisis.created_at)}</div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => window.location.href = '/dashboard.html');

    document.getElementById('imSafeBtn').addEventListener('click', async () => {
      if (confirm('هل تريد الإبلاغ عن أنك بخير؟')) {
        try {
          await apiClient.post('/api/crisis/safe', {crisis_id: this.activeCrisis?.id});
          alert('تم الإبلاغ بنجاح. شكراً لك.');
        } catch {
          alert('تم تسجيل حالتك');
        }
      }
    });
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ar-SA', {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  }
}

new CrisisPage();
