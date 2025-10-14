/**
 * Payment Page
 */

import userStore from '../state/user-store.js';
import paymentStore from '../state/payment-store.js';
import csrfManager from '../security/csrf-manager.js';
import customModal from '../components/custom-modal.js';
import logger from '../utils/logger.js';

class PaymentPage {
  constructor() {
    this.selectedMethod = 'knet';
    this.currentFilter = 'all';
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }

    this.showLoading(true);

    try {
      await userStore.actions.initialize(userStore.state);
      await csrfManager.initialize(); // Initialize CSRF protection
      await paymentStore.actions.fetchPayments(paymentStore.state);

      this.renderBalance();
      this.renderPaymentHistory();
      this.attachEventListeners();
    } catch (error) {
      logger.error('Payment page error:', { error });
    } finally {
      this.showLoading(false);
    }
  }

  renderBalance() {
    const profile = userStore.state.profile;
    if (!profile) return;

    const balanceElement = document.getElementById('currentBalance');
    const statusBadge = document.getElementById('statusBadge');

    balanceElement.textContent = this.formatCurrency(profile.balance || 0);

    if (profile.membership_status === 'active') {
      statusBadge.textContent = 'نشط';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
    } else {
      statusBadge.textContent = 'معلق';
      statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
    }
  }

  renderPaymentHistory() {
    const container = document.getElementById('paymentHistoryList');
    const filteredPayments = this.getFilteredPayments();

    if (filteredPayments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <p>لا توجد دفعات سابقة</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredPayments.map(payment => {
      const statusClass = payment.status === 'success' || payment.status === 'completed' ? 'success' :
                          payment.status === 'pending' ? 'pending' : 'failed';
      const statusIcon = statusClass === 'success' ? '<path d="M20 6L9 17l-5-5" />' :
                         statusClass === 'pending' ? '<path d="M12 8v4M12 16h.01" /><circle cx="12" cy="12" r="10" />' :
                         '<path d="M18 6L6 18M6 6l12 12" />';

      return `
        <div class="payment-history-item">
          <div class="payment-item-left">
            <div class="payment-status-icon ${statusClass}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${statusIcon}
              </svg>
            </div>
            <div class="payment-item-details">
              <div class="payment-item-description">${payment.description || 'دفعة اشتراك'}</div>
              <div class="payment-item-date">${this.formatDate(payment.created_at)}</div>
              <div class="payment-item-method">${this.getMethodName(payment.payment_method)}</div>
            </div>
          </div>
          <div class="payment-item-right">
            <div class="payment-item-amount ${statusClass}">
              ${this.formatCurrency(payment.amount)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  getFilteredPayments() {
    const payments = paymentStore.state.payments;

    if (this.currentFilter === 'all') {
      return payments;
    } else if (this.currentFilter === 'success') {
      return payments.filter(p => p.status === 'success' || p.status === 'completed');
    } else if (this.currentFilter === 'pending') {
      return payments.filter(p => p.status === 'pending');
    }

    return payments;
  }

  attachEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    // Payment method selection
    document.querySelectorAll('.method-option').forEach(option => {
      option.addEventListener('click', (e) => {
        this.selectedMethod = option.dataset.method;
        this.toggleBankDetails();
      });
    });

    // Quick amount buttons
    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('amountInput').value = btn.dataset.amount;
      });
    });

    // Pay button
    document.getElementById('payButton').addEventListener('click', () => {
      this.handlePayment();
    });

    // Modal buttons
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      this.hideConfirmationModal();
    });

    document.getElementById('cancelPaymentBtn').addEventListener('click', () => {
      this.hideConfirmationModal();
    });

    document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
      this.processPayment();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderPaymentHistory();
      });
    });
  }

  toggleBankDetails() {
    const bankDetailsCard = document.getElementById('bankDetailsCard');
    bankDetailsCard.style.display = this.selectedMethod === 'bank_transfer' ? 'block' : 'none';
  }

  async handlePayment() {
    const amount = parseFloat(document.getElementById('amountInput').value);
    const description = document.getElementById('descriptionInput').value;

    // C1: Comprehensive amount validation
    if (isNaN(amount) || !amount) {
      await customModal.alert('يرجى إدخال مبلغ صحيح', 'خطأ في المبلغ');
      return;
    }

    if (amount <= 0) {
      await customModal.alert('المبلغ يجب أن يكون أكبر من صفر', 'خطأ في المبلغ');
      return;
    }

    if (amount > 1000000) {
      await customModal.alert('المبلغ يجب أن يكون أقل من 1,000,000 ريال سعودي', 'خطأ في المبلغ');
      return;
    }

    // C2: Comprehensive receipt upload validation
    if (this.selectedMethod === 'bank_transfer') {
      const receiptInput = document.getElementById('receiptInput');

      if (!receiptInput.files.length) {
        await customModal.alert('يرجى إرفاق إيصال التحويل', 'إيصال مفقود');
        return;
      }

      const file = receiptInput.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        await customModal.alert('يرجى رفع صورة (JPG, PNG) أو PDF فقط', 'نوع ملف غير صحيح');
        return;
      }

      if (file.size > maxSize) {
        await customModal.alert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت', 'حجم ملف كبير');
        return;
      }
    }

    this.showConfirmationModal(amount, description);
  }

  showConfirmationModal(amount, description) {
    const modal = document.getElementById('confirmationModal');
    const methodName = this.getMethodName(this.selectedMethod);

    document.getElementById('confirmMethod').textContent = methodName;
    document.getElementById('confirmAmount').textContent = this.formatCurrency(amount) + ' ر.س';

    if (description) {
      document.getElementById('confirmDescriptionItem').style.display = 'flex';
      document.getElementById('confirmDescription').textContent = description;
    } else {
      document.getElementById('confirmDescriptionItem').style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  hideConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
  }

  async processPayment() {
    this.hideConfirmationModal();
    this.showLoading(true);

    const amount = parseFloat(document.getElementById('amountInput').value);
    const description = document.getElementById('descriptionInput').value || 'دفعة اشتراك';

    try {
      const result = await paymentStore.actions.initiatePayment(paymentStore.state, {
        method: this.selectedMethod,
        amount: amount,
        description: description
      });

      if (result.success) {
        if (result.data.payment_url) {
          window.location.href = result.data.payment_url;
        } else {
          await customModal.alert('تم تسجيل الدفع بنجاح وسيتم مراجعته قريباً', 'نجح الدفع');
          this.resetForm();
          await paymentStore.actions.fetchPayments(paymentStore.state);
          this.renderBalance();
          this.renderPaymentHistory();
        }
      } else {
        await customModal.alert(result.error || 'فشلت عملية الدفع', 'خطأ في الدفع');
      }
    } catch (error) {
      logger.error('Payment error:', { error });
      await customModal.alert('حدث خطأ أثناء معالجة الدفع', 'خطأ');
    } finally {
      this.showLoading(false);
    }
  }

  resetForm() {
    document.getElementById('amountInput').value = '';
    document.getElementById('descriptionInput').value = '';
    document.querySelector('input[name="paymentMethod"][value="knet"]').checked = true;
    this.selectedMethod = 'knet';
    this.toggleBankDetails();
  }

  getMethodName(method) {
    const methods = {
      'knet': 'كي نت',
      'card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي'
    };
    return methods[method] || method;
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
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

new PaymentPage();
