import userStore from '../state/user-store.js';
import customModal from '../components/custom-modal.js';

class ProfilePage {
  constructor() {
    this.hasUnsavedChanges = false;
    this.init();
  }

  async init() {
    if (!userStore.state.isAuthenticated) {
      window.location.href = '/login.html';
      return;
    }

    await userStore.actions.initialize(userStore.state);
    this.renderProfile();
    this.attachEventListeners();
  }

  renderProfile() {
    const user = userStore.state.user;
    const profile = userStore.state.profile;

    if (!user) return;

    document.getElementById('profileName').textContent = user.name || user.full_name || 'عضو';
    document.getElementById('profilePhone').textContent = user.phone || '-';
    document.getElementById('memberId').textContent = user.id || '-';
    document.getElementById('email').textContent = profile?.email || '-';
    document.getElementById('tribe').textContent = profile?.tribe || '-';
    document.getElementById('joinDate').textContent = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-SA') : '-';

    const prefs = userStore.state.preferences;
    // Update toggle switches with ARIA attributes
    const notifyEventsEl = document.getElementById('notifyEvents');
    const notifyPaymentsEl = document.getElementById('notifyPayments');
    const notifyCrisisEl = document.getElementById('notifyCrisis');

    notifyEventsEl.checked = prefs.notifications.events;
    notifyEventsEl.setAttribute('aria-checked', prefs.notifications.events);

    notifyPaymentsEl.checked = prefs.notifications.payments;
    notifyPaymentsEl.setAttribute('aria-checked', prefs.notifications.payments);

    notifyCrisisEl.checked = prefs.notifications.crisis;
    notifyCrisisEl.setAttribute('aria-checked', prefs.notifications.crisis);
  }

  attachEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });

    document.getElementById('editBtn').addEventListener('click', () => {
      this.toggleEditMode(true);
    });

    document.getElementById('cancelEditBtn').addEventListener('click', async () => {
      if (this.hasUnsavedChanges) {
        const confirmed = await customModal.confirm('لديك تغييرات غير محفوظة. هل تريد الإلغاء؟', 'تأكيد الإلغاء');
        if (confirmed) {
          this.hasUnsavedChanges = false;
          this.toggleEditMode(false);
        }
      } else {
        this.toggleEditMode(false);
      }
    });

    document.getElementById('saveEditBtn').addEventListener('click', () => {
      this.saveProfile();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      const confirmed = await customModal.confirm('هل أنت متأكد من تسجيل الخروج؟', 'تسجيل الخروج');
      if (confirmed) {
        userStore.actions.logout(userStore.state);
      }
    });

    ['notifyEvents', 'notifyPayments', 'notifyCrisis'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        // Update aria-checked attribute for accessibility
        e.target.setAttribute('aria-checked', e.target.checked);
        this.updatePreference(id, e.target.checked);
      });
    });
  }

  toggleEditMode(edit) {
    document.getElementById('profileInfoView').style.display = edit ? 'none' : 'block';
    document.getElementById('profileEditForm').style.display = edit ? 'block' : 'none';

    if (edit) {
      const user = userStore.state.user;
      const profile = userStore.state.profile;
      document.getElementById('editName').value = user.name || user.full_name || '';
      document.getElementById('editEmail').value = profile?.email || '';

      // Reset unsaved changes flag
      this.hasUnsavedChanges = false;

      // Add real-time email validation on blur
      const emailInput = document.getElementById('editEmail');
      emailInput.addEventListener('blur', this.validateEmail.bind(this));

      // Track changes to form inputs
      const nameInput = document.getElementById('editName');
      const markAsChanged = () => { this.hasUnsavedChanges = true; };

      nameInput.addEventListener('input', markAsChanged);
      emailInput.addEventListener('input', markAsChanged);

      // Add beforeunload event listener
      this.beforeUnloadHandler = (e) => {
        if (this.hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟';
          return e.returnValue;
        }
      };

      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    } else {
      // Remove beforeunload listener when exiting edit mode
      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
    }
  }

  validateEmail(e) {
    const email = e.target.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Remove any existing validation message
    const existingError = e.target.parentElement.querySelector('.validation-message');
    if (existingError) existingError.remove();

    if (email && !emailRegex.test(email)) {
      // Add error message
      const errorMsg = document.createElement('div');
      errorMsg.className = 'validation-message error';
      errorMsg.textContent = 'البريد الإلكتروني غير صحيح';
      errorMsg.style.color = '#ef4444';
      errorMsg.style.fontSize = '0.875rem';
      errorMsg.style.marginTop = '0.5rem';
      e.target.parentElement.appendChild(errorMsg);

      e.target.style.borderColor = '#ef4444';
    } else if (email) {
      // Add success indicator
      const successMsg = document.createElement('div');
      successMsg.className = 'validation-message success';
      successMsg.innerHTML = '✓ البريد الإلكتروني صحيح';
      successMsg.style.color = '#10b981';
      successMsg.style.fontSize = '0.875rem';
      successMsg.style.marginTop = '0.5rem';
      e.target.parentElement.appendChild(successMsg);

      e.target.style.borderColor = '#10b981';
    } else {
      e.target.style.borderColor = '';
    }
  }

  async saveProfile() {
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;

    try {
      await userStore.actions.updateProfile(userStore.state, { name, email });

      // Clear unsaved changes flag
      this.hasUnsavedChanges = false;

      this.renderProfile();
      this.toggleEditMode(false);
      await customModal.alert('تم حفظ التغييرات بنجاح', 'نجح الحفظ');
    } catch (error) {
      await customModal.alert('فشل حفظ التغييرات', 'خطأ');
    }
  }

  updatePreference(key, value) {
    const mapping = {
      notifyEvents: 'events',
      notifyPayments: 'payments',
      notifyCrisis: 'crisis'
    };
    userStore.state.preferences.notifications[mapping[key]] = value;
  }
}

new ProfilePage();
