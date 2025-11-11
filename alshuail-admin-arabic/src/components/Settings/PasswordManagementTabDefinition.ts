/**
 * Password Management Tab Definition
 * NUCLEAR APPROACH: Force preservation through multiple side-effects
 */

import { KeyIcon } from '@heroicons/react/24/outline';

// STRATEGY 1: Create tab with observable side-effects
const createPasswordTab = () => {
  const tab = {
    id: 'password-management',
    label: 'إدارة كلمات المرور',
    icon: KeyIcon,
    requiredRole: ['super_admin'],
    description: 'إنشاء وإعادة تعيين كلمات المرور للمستخدمين'
  };

  // Side-effect: Store in window
  if (typeof window !== 'undefined') {
    (window as any).__PASSWORD_TAB_DEFINITION__ = tab;
    (window as any).__PASSWORD_TAB_ID__ = tab.id;
    console.log('[PasswordTab] Tab definition created:', tab.id);
  }

  return tab;
};

// STRATEGY 2: Execute immediately
export const PASSWORD_MANAGEMENT_TAB = createPasswordTab();

// STRATEGY 3: Multiple side-effect markers
if (typeof window !== 'undefined') {
  (window as any).__PASSWORD_TAB_MODULE_LOADED__ = true;
  (window as any).__PASSWORD_TAB_EXPORTS__ = { PASSWORD_MANAGEMENT_TAB };
}

// STRATEGY 4: Symbol-based marker
export const PASSWORD_TAB_SYMBOL = Symbol.for('password-management-tab');

// STRATEGY 5: Export loaded flag
export const PASSWORD_TAB_LOADED = true;

// STRATEGY 6: Runtime assertion
if (process.env.NODE_ENV === 'production') {
  if (!PASSWORD_MANAGEMENT_TAB.id) {
    throw new Error('PASSWORD_MANAGEMENT_TAB not properly initialized');
  }
}
