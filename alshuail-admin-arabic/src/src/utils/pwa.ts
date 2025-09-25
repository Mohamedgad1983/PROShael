// PWA utilities for Al-Shuail application
// Handles installation, offline detection, and PWA-specific features

// PWA installation interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// PWA state management
class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;
  private listeners: { [key: string]: Function[] } = {};

  constructor() {
    this.init();
  }

  private init() {
    // Check if already installed
    this.checkInstallationStatus();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', this.handleInstallPrompt.bind(this) as EventListener);

    // Listen for app installation
    window.addEventListener('appinstalled', this.handleAppInstalled.bind(this) as EventListener);

    // Listen for online/offline changes
    window.addEventListener('online', this.handleOnlineChange.bind(this));
    window.addEventListener('offline', this.handleOfflineChange.bind(this));

    // Check for PWA updates
    this.checkForUpdates();
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Installation status check
  private checkInstallationStatus() {
    // Check if running in standalone mode (installed PWA)
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');

    console.log('PWA Installation Status:', this.isInstalled ? 'Installed' : 'Not Installed');
  }

  // Handle install prompt
  private handleInstallPrompt(e: Event) {
    console.log('PWA install prompt available');
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    this.emit('installAvailable', e);
  }

  // Handle app installation
  private handleAppInstalled(e: Event) {
    console.log('PWA installed successfully');
    this.isInstalled = true;
    this.deferredPrompt = null;
    this.emit('installed');
  }

  // Handle online status change
  private handleOnlineChange() {
    console.log('📶 Back online');
    this.isOnline = true;
    this.emit('online');
    this.showConnectionStatus('متصل بالإنترنت', 'success');
  }

  private handleOfflineChange() {
    console.log('📵 Gone offline');
    this.isOnline = false;
    this.emit('offline');
    this.showConnectionStatus('غير متصل بالإنترنت', 'warning');
  }

  // Public methods
  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log('Install prompt outcome:', outcome);

      if (outcome === 'accepted') {
        this.emit('installAccepted');
        return true;
      } else {
        this.emit('installDismissed');
        return false;
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return false;
    }
  }

  public isInstallAvailable(): boolean {
    return this.deferredPrompt !== null;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public isAppOnline(): boolean {
    return this.isOnline;
  }

  // Show install prompt UI
  public showInstallPrompt() {
    if (!this.isInstallAvailable() || this.isAppInstalled()) {
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem('pwa-install-dismissed')) {
      return;
    }

    const prompt = this.createInstallPromptUI();
    document.body.appendChild(prompt);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        this.hideInstallPrompt(prompt);
      }
    }, 10000);
  }

  private createInstallPromptUI(): HTMLElement {
    const prompt = document.createElement('div');
    prompt.id = 'pwa-install-prompt';
    prompt.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 15px 35px rgba(0, 122, 255, 0.4);
      backdrop-filter: blur(20px);
      z-index: 10000;
      max-width: 320px;
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      text-align: center;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    prompt.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-size: 2rem; margin-bottom: 10px;">📱</div>
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">
          تثبيت تطبيق الشعيل
        </div>
        <div style="font-size: 0.9rem; opacity: 0.9; line-height: 1.4;">
          احصل على تجربة أفضل وأسرع مع إمكانية الوصول دون اتصال
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="pwa-install-yes" style="
          background: white;
          color: #007AFF;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          flex: 1;
        ">تثبيت الآن</button>

        <button id="pwa-install-no" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 12px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          flex: 1;
        ">لاحقاً</button>
      </div>
    `;

    // Animate in
    setTimeout(() => {
      prompt.style.transform = 'translateY(0)';
      prompt.style.opacity = '1';
    }, 100);

    // Handle buttons
    const installBtn = prompt.querySelector('#pwa-install-yes');
    const dismissBtn = prompt.querySelector('#pwa-install-no');

    installBtn?.addEventListener('click', () => {
      this.installApp().then(success => {
        if (success) {
          this.hideInstallPrompt(prompt);
        }
      });
    });

    dismissBtn?.addEventListener('click', () => {
      localStorage.setItem('pwa-install-dismissed', 'true');
      this.hideInstallPrompt(prompt);
    });

    return prompt;
  }

  private hideInstallPrompt(prompt: HTMLElement) {
    prompt.style.transform = 'translateY(100px)';
    prompt.style.opacity = '0';
    setTimeout(() => {
      prompt.remove();
    }, 400);
  }

  // Connection status notification
  private showConnectionStatus(message: string, type: 'success' | 'warning') {
    // Remove existing status if any
    const existing = document.getElementById('connection-status');
    if (existing) {
      existing.remove();
    }

    const status = document.createElement('div');
    status.id = 'connection-status';
    status.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : '#f59e0b'};
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: 'Cairo', sans-serif;
      font-weight: 600;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      direction: rtl;
    `;

    status.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${type === 'success' ? '✅' : '⚠️'}</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(status);

    // Animate in
    setTimeout(() => {
      status.style.transform = 'translateX(0)';
    }, 100);

    // Auto-hide
    setTimeout(() => {
      status.style.transform = 'translateX(100%)';
      setTimeout(() => status.remove(), 300);
    }, 3000);
  }

  // Check for updates
  private async checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.addEventListener('updatefound', () => {
            console.log('SW update found');
            this.emit('updateAvailable');
          });

          // Check for updates every 30 minutes
          setInterval(() => {
            registration.update();
          }, 30 * 60 * 1000);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  }

  // Share functionality
  public async shareApp(data?: ShareData): Promise<boolean> {
    const shareData: ShareData = {
      title: 'الشعيل - إدارة الأسرة',
      text: 'نظام إدارة شامل لأسرة الشعيل',
      url: window.location.href,
      ...data
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url || window.location.href);
        this.showConnectionStatus('تم نسخ الرابط', 'success');
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
  }

  // Get PWA info
  public getPWAInfo() {
    return {
      isInstalled: this.isAppInstalled(),
      isInstallAvailable: this.isInstallAvailable(),
      isOnline: this.isAppOnline(),
      supportsShare: !!navigator.share,
      supportsNotifications: 'Notification' in window,
      supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
    };
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Utility functions
export const PWAUtils = {
  // Check if running as PWA
  isPWA: () => pwaManager.isAppInstalled(),

  // Check if install is available
  canInstall: () => pwaManager.isInstallAvailable(),

  // Install the app
  install: () => pwaManager.installApp(),

  // Share content
  share: (data?: ShareData) => pwaManager.shareApp(data),

  // Get connection status
  isOnline: () => pwaManager.isAppOnline(),

  // Show install prompt
  showInstallPrompt: () => pwaManager.showInstallPrompt(),

  // Add event listeners
  addEventListener: (event: string, callback: Function) => pwaManager.on(event, callback),

  // Remove event listeners
  removeEventListener: (event: string, callback: Function) => pwaManager.off(event, callback),

  // Get PWA capabilities
  getCapabilities: () => pwaManager.getPWAInfo()
};

export default PWAUtils;