/**
 * Custom Modal Component
 * Replaces browser alert() with accessible, styled modal dialogs
 */

class CustomModal {
  constructor() {
    this.modalElement = null;
    this.createModal();
  }

  createModal() {
    // Create modal HTML structure
    const modalHTML = `
      <div id="customModal" class="custom-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="custom-modal-overlay"></div>
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="modalTitle" class="custom-modal-title"></h3>
            <button class="custom-modal-close" aria-label="إغلاق" id="modalCloseBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="custom-modal-body">
            <p id="modalMessage" class="custom-modal-message"></p>
          </div>
          <div class="custom-modal-footer">
            <button id="modalConfirmBtn" class="custom-modal-btn custom-modal-btn-primary">حسناً</button>
            <button id="modalCancelBtn" class="custom-modal-btn custom-modal-btn-secondary" style="display: none;">إلغاء</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    if (!document.getElementById('customModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.modalElement = document.getElementById('customModal');
      this.attachEventListeners();
      this.addStyles();
    }
  }

  addStyles() {
    // Check if styles already exist
    if (document.getElementById('customModalStyles')) return;

    const styles = `
      <style id="customModalStyles">
        .custom-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        .custom-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .custom-modal-content {
          position: relative;
          background: white;
          border-radius: 16px;
          max-width: 90%;
          width: 400px;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.3s ease;
        }

        .custom-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .custom-modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .custom-modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 8px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .custom-modal-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .custom-modal-body {
          padding: 24px;
        }

        .custom-modal-message {
          font-size: 1rem;
          line-height: 1.6;
          color: #374151;
          margin: 0;
        }

        .custom-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .custom-modal-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          font-family: 'Cairo', sans-serif;
        }

        .custom-modal-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .custom-modal-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .custom-modal-btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .custom-modal-btn-secondary:hover {
          background: #e5e7eb;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* RTL Support */
        [dir="rtl"] .custom-modal-footer {
          flex-direction: row-reverse;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  attachEventListeners() {
    // Close button
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
      this.hide();
    });

    // Overlay click to close
    this.modalElement?.querySelector('.custom-modal-overlay')?.addEventListener('click', () => {
      this.hide();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalElement?.style.display !== 'none') {
        this.hide();
      }
    });
  }

  /**
   * Show alert modal (single button)
   * @param {string} message - Message to display
   * @param {string} title - Modal title (optional)
   */
  alert(message, title = 'تنبيه') {
    return new Promise((resolve) => {
      const modal = document.getElementById('customModal');
      const titleEl = document.getElementById('modalTitle');
      const messageEl = document.getElementById('modalMessage');
      const confirmBtn = document.getElementById('modalConfirmBtn');
      const cancelBtn = document.getElementById('modalCancelBtn');

      titleEl.textContent = title;
      messageEl.textContent = message;
      confirmBtn.textContent = 'حسناً';
      cancelBtn.style.display = 'none';

      modal.style.display = 'flex';

      // Focus management
      setTimeout(() => confirmBtn.focus(), 100);

      const handleConfirm = () => {
        this.hide();
        confirmBtn.removeEventListener('click', handleConfirm);
        resolve(true);
      };

      confirmBtn.addEventListener('click', handleConfirm);
    });
  }

  /**
   * Show confirmation modal (two buttons)
   * @param {string} message - Message to display
   * @param {string} title - Modal title (optional)
   */
  confirm(message, title = 'تأكيد') {
    return new Promise((resolve) => {
      const modal = document.getElementById('customModal');
      const titleEl = document.getElementById('modalTitle');
      const messageEl = document.getElementById('modalMessage');
      const confirmBtn = document.getElementById('modalConfirmBtn');
      const cancelBtn = document.getElementById('modalCancelBtn');

      titleEl.textContent = title;
      messageEl.textContent = message;
      confirmBtn.textContent = 'تأكيد';
      cancelBtn.textContent = 'إلغاء';
      cancelBtn.style.display = 'block';

      modal.style.display = 'flex';

      // Focus management
      setTimeout(() => confirmBtn.focus(), 100);

      const handleConfirm = () => {
        this.hide();
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        this.hide();
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
    });
  }

  hide() {
    const modal = document.getElementById('customModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

// Create singleton instance
const customModal = new CustomModal();

// Export for use in other modules
export default customModal;
