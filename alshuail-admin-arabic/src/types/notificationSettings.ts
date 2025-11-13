/**
 * Notification Settings Type Definitions
 * Complete type-safe structure for user notification preferences
 *
 * Database Storage: users.notification_settings JSONB field
 * Last Modified: 2025-11-13
 */

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'email' | 'sms' | 'push';

/**
 * Available notification types in the system
 */
export type NotificationType =
  | 'system'          // System updates and maintenance
  | 'security'        // Security alerts and warnings
  | 'members'         // Member activities and changes
  | 'finance'         // Financial transactions and updates
  | 'family_tree';    // Family tree updates and additions

/**
 * Notification delivery frequency
 */
export type NotificationFrequency =
  | 'instant'         // Immediate delivery
  | 'daily'           // Once per day digest
  | 'weekly';         // Once per week digest

/**
 * Time format for quiet hours (24-hour format HH:MM)
 */
export type TimeString = string; // Format: "HH:MM" (e.g., "22:00", "08:00")

/**
 * Quiet hours configuration
 * Defines when notifications should be suppressed
 */
export interface QuietHours {
  /**
   * Start time in 24-hour format (HH:MM)
   * @example "22:00"
   */
  start: TimeString;

  /**
   * End time in 24-hour format (HH:MM)
   * @example "08:00"
   */
  end: TimeString;

  /**
   * Whether quiet hours span across midnight
   * @example true for 22:00 - 08:00
   */
  overnight?: boolean;
}

/**
 * Complete notification settings structure
 * Stored in users.notification_settings JSONB field
 */
export interface NotificationSettings {
  /**
   * Enable/disable email notifications
   * @default true
   */
  email_enabled: boolean;

  /**
   * Enable/disable SMS notifications
   * @default false
   */
  sms_enabled: boolean;

  /**
   * Enable/disable push notifications
   * @default true
   */
  push_enabled: boolean;

  /**
   * Array of enabled notification types
   * At least one type must be selected
   * @default ["system", "security"]
   */
  types: NotificationType[];

  /**
   * Notification delivery frequency
   * @default "instant"
   */
  frequency: NotificationFrequency;

  /**
   * Quiet hours configuration
   * Notifications will be held during these hours
   * @default { start: "22:00", end: "08:00", overnight: true }
   */
  quiet_hours: QuietHours;

  /**
   * Last updated timestamp (ISO 8601)
   * Auto-updated on every settings change
   */
  updated_at?: string;
}

/**
 * Default notification settings for new users
 * Applied when notification_settings is null or missing
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  types: ['system', 'security'],
  frequency: 'instant',
  quiet_hours: {
    start: '22:00',
    end: '08:00',
    overnight: true
  }
};

/**
 * Validation helper: Check if time string is valid HH:MM format
 */
export function isValidTimeString(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validation helper: Check if notification types array is valid
 */
export function isValidNotificationTypes(types: unknown): types is NotificationType[] {
  if (!Array.isArray(types)) return false;
  if (types.length === 0) return false;

  const validTypes: NotificationType[] = ['system', 'security', 'members', 'finance', 'family_tree'];
  return types.every(type => validTypes.includes(type as NotificationType));
}

/**
 * Validation helper: Check if frequency is valid
 */
export function isValidFrequency(frequency: unknown): frequency is NotificationFrequency {
  const validFrequencies: NotificationFrequency[] = ['instant', 'daily', 'weekly'];
  return validFrequencies.includes(frequency as NotificationFrequency);
}

/**
 * Validation helper: Validate entire notification settings object
 */
export function validateNotificationSettings(settings: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return { valid: false, errors: ['Settings must be an object'] };
  }

  const s = settings as Partial<NotificationSettings>;

  // Validate booleans
  if (typeof s.email_enabled !== 'boolean') {
    errors.push('email_enabled must be a boolean');
  }
  if (typeof s.sms_enabled !== 'boolean') {
    errors.push('sms_enabled must be a boolean');
  }
  if (typeof s.push_enabled !== 'boolean') {
    errors.push('push_enabled must be a boolean');
  }

  // Validate types array
  if (!isValidNotificationTypes(s.types)) {
    errors.push('types must be a non-empty array of valid notification types');
  }

  // Validate frequency
  if (!isValidFrequency(s.frequency)) {
    errors.push('frequency must be one of: instant, daily, weekly');
  }

  // Validate quiet hours
  if (!s.quiet_hours || typeof s.quiet_hours !== 'object') {
    errors.push('quiet_hours must be an object');
  } else {
    if (!isValidTimeString(s.quiet_hours.start)) {
      errors.push('quiet_hours.start must be in HH:MM format');
    }
    if (!isValidTimeString(s.quiet_hours.end)) {
      errors.push('quiet_hours.end must be in HH:MM format');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Bilingual labels for notification types
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { ar: string; en: string }> = {
  system: {
    ar: 'تحديثات النظام',
    en: 'System Updates'
  },
  security: {
    ar: 'تنبيهات الأمان',
    en: 'Security Alerts'
  },
  members: {
    ar: 'أنشطة الأعضاء',
    en: 'Member Activities'
  },
  finance: {
    ar: 'المعاملات المالية',
    en: 'Financial Transactions'
  },
  family_tree: {
    ar: 'شجرة العائلة',
    en: 'Family Tree Updates'
  }
};

/**
 * Bilingual labels for notification frequency
 */
export const FREQUENCY_LABELS: Record<NotificationFrequency, { ar: string; en: string }> = {
  instant: {
    ar: 'فوري',
    en: 'Instant'
  },
  daily: {
    ar: 'ملخص يومي',
    en: 'Daily Digest'
  },
  weekly: {
    ar: 'ملخص أسبوعي',
    en: 'Weekly Digest'
  }
};

/**
 * Bilingual labels for notification channels
 */
export const CHANNEL_LABELS: Record<NotificationChannel, { ar: string; en: string }> = {
  email: {
    ar: 'البريد الإلكتروني',
    en: 'Email'
  },
  sms: {
    ar: 'الرسائل النصية',
    en: 'SMS'
  },
  push: {
    ar: 'الإشعارات الفورية',
    en: 'Push Notifications'
  }
};
