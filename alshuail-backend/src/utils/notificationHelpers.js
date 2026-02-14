/**
 * Notification Helper Utilities
 * Shared functions for notification formatting and categorization
 * Consolidation from notificationController.js and notificationsController.js
 */

/**
 * Map notification types to categories
 * @param {string} type - Notification type
 * @returns {string} Category name
 */
export function getCategoryFromType(type) {
  const mapping = {
    // News
    'news': 'news',
    'announcement': 'news',
    'update': 'news',

    // Initiatives
    'initiative': 'initiatives',
    'charity': 'initiatives',
    'donation': 'initiatives',
    'fundraising': 'initiatives',

    // Diya
    'diya': 'diyas',
    'blood_money': 'diyas',
    'urgent_case': 'diyas',

    // Occasions
    'occasion': 'occasions',
    'event': 'occasions',
    'celebration': 'occasions',
    'wedding': 'occasions',
    'condolence': 'occasions',

    // Statements
    'statement': 'statements',
    'payment': 'statements',
    'subscription': 'statements',
    'financial': 'statements',
    'receipt': 'statements'
  };

  return mapping[type?.toLowerCase()] || 'other';
}

/**
 * Get default emoji icon for notification type
 * @param {string} type - Notification type
 * @returns {string} Emoji icon
 */
export function getDefaultIcon(type) {
  const icons = {
    news: '📰',
    announcement: '📢',
    initiative: '🤝',
    charity: '❤️',
    diya: '⚖️',
    occasion: '🎉',
    event: '📅',
    statement: '📊',
    payment: '💰',
    subscription: '💳'
  };

  return icons[type?.toLowerCase()] || '🔔';
}

/**
 * Format timestamp to Arabic relative time string
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted time string in Arabic
 */
export function formatTimeAgo(timestamp) {
  const now = new Date();
  const notifDate = new Date(timestamp);
  const diffMs = now - notifDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) { return 'الآن'; }
  if (diffMins < 60) { return `منذ ${diffMins} دقيقة`; }
  if (diffHours < 24) { return `منذ ${diffHours} ساعة`; }
  if (diffDays < 7) { return `منذ ${diffDays} يوم`; }

  // Format as date
  return notifDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Categorize and format multiple notifications
 * @param {Array} notifications - Array of notification objects
 * @returns {Object} Organized notifications by category
 */
export function organizeNotificationsByCategory(notifications) {
  const organized = {
    news: [],
    initiatives: [],
    diyas: [],
    occasions: [],
    statements: [],
    other: []
  };

  notifications.forEach(notif => {
    const category = getCategoryFromType(notif.type);
    const formattedNotif = {
      id: notif.id,
      title: notif.title_ar || notif.title,
      body: notif.message_ar || notif.message,
      time: formatTimeAgo(notif.created_at),
      timestamp: notif.created_at,
      icon: notif.icon || getDefaultIcon(notif.type),
      priority: notif.priority || 'normal',
      isRead: notif.is_read || false,
      category: category,
      actionUrl: notif.action_url,
      relatedId: notif.related_id,
      relatedType: notif.related_type
    };

    if (organized[category]) {
      organized[category].push(formattedNotif);
    } else {
      organized.other.push(formattedNotif);
    }
  });

  return organized;
}
