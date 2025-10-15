/**
 * Notification Templates Service
 * Bilingual (Arabic/English) notification templates
 *
 * Ready for WhatsApp Business API, SMS, and Push Notifications
 */

/**
 * Event Invitation Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function eventInvitationTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: `دعوة: ${data.eventName}`,
      body: `السلام عليكم ${data.memberName},\n\nندعوك لحضور ${data.eventName}\n📅 التاريخ: ${data.eventDate}\n📍 المكان: ${data.eventLocation}\n\nنأمل تأكيد حضورك عبر التطبيق.\n\nعائلة الشعيل`,
      whatsappTemplate: 'event_invitation_ar',
      data: {
        member_name: data.memberName,
        event_name: data.eventName,
        event_date: data.eventDate,
        event_location: data.eventLocation
      }
    },
    en: {
      title: `Invitation: ${data.eventName}`,
      body: `Dear ${data.memberName},\n\nYou are invited to ${data.eventName}\n📅 Date: ${data.eventDate}\n📍 Location: ${data.eventLocation}\n\nPlease confirm your attendance via the app.\n\nAl-Shuail Family`,
      whatsappTemplate: 'event_invitation_en',
      data: {
        member_name: data.memberName,
        event_name: data.eventName,
        event_date: data.eventDate,
        event_location: data.eventLocation
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * Payment Receipt Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function paymentReceiptTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: 'إيصال دفع',
      body: `عزيزي ${data.memberName},\n\nتم استلام دفعتك بنجاح\n💰 المبلغ: ${data.amount} ريال\n📋 رقم المعاملة: ${data.transactionId}\n📅 التاريخ: ${data.date}\n\nشكراً لك\nعائلة الشعيل`,
      whatsappTemplate: 'payment_receipt_ar',
      data: {
        member_name: data.memberName,
        amount: data.amount,
        transaction_id: data.transactionId,
        date: data.date
      }
    },
    en: {
      title: 'Payment Receipt',
      body: `Dear ${data.memberName},\n\nYour payment has been received successfully\n💰 Amount: ${data.amount} SAR\n📋 Transaction ID: ${data.transactionId}\n📅 Date: ${data.date}\n\nThank you\nAl-Shuail Family`,
      whatsappTemplate: 'payment_receipt_en',
      data: {
        member_name: data.memberName,
        amount: data.amount,
        transaction_id: data.transactionId,
        date: data.date
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * Payment Reminder Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function paymentReminderTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: 'تذكير بالدفع',
      body: `عزيزي ${data.memberName},\n\nتذكير ودي بدفع الاشتراك السنوي\n💰 المبلغ المستحق: ${data.amountDue} ريال\n📅 تاريخ الاستحقاق: ${data.dueDate}\n\nيمكنك الدفع عبر التطبيق\n\nعائلة الشعيل`,
      whatsappTemplate: 'payment_reminder_ar',
      data: {
        member_name: data.memberName,
        amount_due: data.amountDue,
        due_date: data.dueDate
      }
    },
    en: {
      title: 'Payment Reminder',
      body: `Dear ${data.memberName},\n\nFriendly reminder for annual subscription payment\n💰 Amount Due: ${data.amountDue} SAR\n📅 Due Date: ${data.dueDate}\n\nYou can pay via the app\n\nAl-Shuail Family`,
      whatsappTemplate: 'payment_reminder_en',
      data: {
        member_name: data.memberName,
        amount_due: data.amountDue,
        due_date: data.dueDate
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * Crisis Alert Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function crisisAlertTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: '🚨 تنبيه طارئ',
      body: `${data.memberName},\n\n🚨 تنبيه طارئ من عائلة الشعيل\n\n${data.alertMessage}\n\nالرجاء تأكيد سلامتك عبر التطبيق فوراً.\n\nللطوارئ: ${data.emergencyContact}`,
      whatsappTemplate: 'crisis_alert_ar',
      data: {
        member_name: data.memberName,
        alert_message: data.alertMessage,
        emergency_contact: data.emergencyContact
      }
    },
    en: {
      title: '🚨 Emergency Alert',
      body: `${data.memberName},\n\n🚨 Emergency alert from Al-Shuail Family\n\n${data.alertMessage}\n\nPlease confirm your safety via the app immediately.\n\nEmergency: ${data.emergencyContact}`,
      whatsappTemplate: 'crisis_alert_en',
      data: {
        member_name: data.memberName,
        alert_message: data.alertMessage,
        emergency_contact: data.emergencyContact
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * General Announcement Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function generalAnnouncementTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: data.title,
      body: `عزيزي ${data.memberName},\n\n${data.message}\n\nعائلة الشعيل`,
      whatsappTemplate: 'general_announcement_ar',
      data: {
        member_name: data.memberName,
        title: data.title,
        message: data.message
      }
    },
    en: {
      title: data.title,
      body: `Dear ${data.memberName},\n\n${data.message}\n\nAl-Shuail Family`,
      whatsappTemplate: 'general_announcement_en',
      data: {
        member_name: data.memberName,
        title: data.title,
        message: data.message
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * RSVP Confirmation Template
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function rsvpConfirmationTemplate(data, lang = 'ar') {
  const templates = {
    ar: {
      title: 'تأكيد الحضور',
      body: `عزيزي ${data.memberName},\n\nشكراً لتأكيد ${data.rsvpStatus === 'yes' ? 'حضورك' : 'اعتذارك'} لحضور ${data.eventName}\n📅 ${data.eventDate}\n\n${data.rsvpStatus === 'yes' ? 'نتطلع لرؤيتك!' : 'نأمل رؤيتك في المناسبات القادمة'}\n\nعائلة الشعيل`,
      whatsappTemplate: 'rsvp_confirmation_ar',
      data: {
        member_name: data.memberName,
        rsvp_status: data.rsvpStatus,
        event_name: data.eventName,
        event_date: data.eventDate
      }
    },
    en: {
      title: 'RSVP Confirmation',
      body: `Dear ${data.memberName},\n\nThank you for ${data.rsvpStatus === 'yes' ? 'confirming your attendance' : 'your response'} to ${data.eventName}\n📅 ${data.eventDate}\n\n${data.rsvpStatus === 'yes' ? 'Looking forward to seeing you!' : 'Hope to see you at future events'}\n\nAl-Shuail Family`,
      whatsappTemplate: 'rsvp_confirmation_en',
      data: {
        member_name: data.memberName,
        rsvp_status: data.rsvpStatus,
        event_name: data.eventName,
        event_date: data.eventDate
      }
    }
  };

  return templates[lang] || templates.ar;
}

/**
 * Get template by notification type
 * @param {string} notificationType - Type of notification
 * @param {Object} data - Template variables
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {Object} - Formatted notification
 */
export function getTemplate(notificationType, data, lang = 'ar') {
  const templateMap = {
    'event_invitation': eventInvitationTemplate,
    'payment_receipt': paymentReceiptTemplate,
    'payment_reminder': paymentReminderTemplate,
    'crisis_alert': crisisAlertTemplate,
    'general_announcement': generalAnnouncementTemplate,
    'rsvp_confirmation': rsvpConfirmationTemplate
  };

  const templateFunction = templateMap[notificationType];

  if (!templateFunction) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }

  return templateFunction(data, lang);
}

export default {
  eventInvitationTemplate,
  paymentReceiptTemplate,
  paymentReminderTemplate,
  crisisAlertTemplate,
  generalAnnouncementTemplate,
  rsvpConfirmationTemplate,
  getTemplate
};
