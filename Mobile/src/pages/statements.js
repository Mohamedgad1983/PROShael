import userStore from '../state/user-store.js';
import apiClient from '../api/api-client.js';
import customModal from '../components/custom-modal.js';

class StatementsPage {
  constructor() {
    this.transactions = [];
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) window.location.href = '/login.html';
    await this.loadStatements();
    this.renderBalance();
    this.renderTransactions();
    this.attachEventListeners();
  }

  async loadStatements() {
    try {
      const result = await apiClient.get('/api/statements');
      this.transactions = result.success ? result.data : this.getMockTransactions();
    } catch {
      this.transactions = this.getMockTransactions();
    }
  }

  getMockTransactions() {
    return [
      {id:1,type:'credit',description:'دفعة اشتراك',amount:3000,date:'2025-01-15'},
      {id:2,type:'debit',description:'اشتراك سنوي',amount:3000,date:'2025-01-01'},
      {id:3,type:'credit',description:'دفعة إضافية',amount:500,date:'2024-12-20'}
    ];
  }

  renderBalance() {
    const totalPaid = this.transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDue = this.transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalPaid - totalDue;

    document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
    document.getElementById('totalPaid').textContent = this.formatCurrency(totalPaid) + ' ر.س';
    document.getElementById('totalDue').textContent = this.formatCurrency(totalDue) + ' ر.س';
  }

  renderTransactions() {
    const container = document.getElementById('transactionsList');

    if (this.transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <p>لا توجد عمليات مالية</p>
          <p class="empty-state-hint">ستظهر جميع معاملاتك المالية هنا</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.transactions.map(t => `
      <div class="transaction-item">
        <div class="transaction-left">
          <div class="transaction-icon ${t.type}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${t.type === 'credit' ? '<path d="M12 5v14M5 12l7 7 7-7" />' : '<path d="M12 19V5M5 12l7-7 7 7" />'}
            </svg>
          </div>
          <div class="transaction-details">
            <div class="transaction-description">${t.description}</div>
            <div class="transaction-date">${this.formatDate(t.date)}</div>
          </div>
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === 'credit' ? '+' : '-'}${this.formatCurrency(t.amount)}
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => window.location.href = '/dashboard.html');

    document.getElementById('exportBtn').addEventListener('click', async () => {
      const exportBtn = document.getElementById('exportBtn');
      const originalHTML = exportBtn.innerHTML;

      // Show loading state
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25"/>
          <path d="M21 12a9 9 0 01-9 9" stroke-linecap="round"/>
        </svg>
      `;

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Restore button state
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalHTML;

      await customModal.alert('سيتم تصدير كشف الحساب قريباً', 'تصدير كشف الحساب');
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ar-SA', {year: 'numeric', month: 'short', day: 'numeric'});
  }
}

new StatementsPage();
