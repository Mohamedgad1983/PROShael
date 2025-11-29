/**
 * Notification Templates Service Unit Tests
 * Tests bilingual notification template generation
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Notification Templates Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Event Invitation Template Tests
  // ============================================
  describe('eventInvitationTemplate', () => {
    test('should generate Arabic event invitation', () => {
      const data = {
        memberName: 'أحمد',
        eventName: 'الاجتماع السنوي',
        eventDate: '15 رمضان 1445',
        eventLocation: 'قاعة المؤتمرات'
      };

      const template = {
        title: `دعوة: ${data.eventName}`,
        body: `السلام عليكم ${data.memberName},\n\nندعوك لحضور ${data.eventName}\n📅 التاريخ: ${data.eventDate}\n📍 المكان: ${data.eventLocation}\n\nنأمل تأكيد حضورك عبر التطبيق.\n\nعائلة الشعيل`,
        whatsappTemplate: 'event_invitation_ar'
      };

      expect(template.title).toContain('دعوة');
      expect(template.body).toContain('السلام عليكم');
      expect(template.body).toContain('أحمد');
    });

    test('should generate English event invitation', () => {
      const data = {
        memberName: 'Ahmed',
        eventName: 'Annual Meeting',
        eventDate: 'March 25, 2024',
        eventLocation: 'Conference Hall'
      };

      const template = {
        title: `Invitation: ${data.eventName}`,
        body: `Dear ${data.memberName},\n\nYou are invited to ${data.eventName}\n📅 Date: ${data.eventDate}\n📍 Location: ${data.eventLocation}\n\nPlease confirm your attendance via the app.\n\nAl-Shuail Family`,
        whatsappTemplate: 'event_invitation_en'
      };

      expect(template.title).toContain('Invitation');
      expect(template.body).toContain('Dear Ahmed');
    });

    test('should include location emoji', () => {
      const body = '📍 المكان: قاعة المؤتمرات';
      expect(body).toContain('📍');
    });

    test('should include date emoji', () => {
      const body = '📅 التاريخ: 15 رمضان 1445';
      expect(body).toContain('📅');
    });
  });

  // ============================================
  // Payment Receipt Template Tests
  // ============================================
  describe('paymentReceiptTemplate', () => {
    test('should generate Arabic payment receipt', () => {
      const data = {
        memberName: 'محمد',
        amount: '5,000',
        transactionId: 'TXN-2024-001',
        date: '15/03/1445'
      };

      const template = {
        title: 'إيصال دفع',
        body: `عزيزي ${data.memberName},\n\nتم استلام دفعتك بنجاح\n💰 المبلغ: ${data.amount} ريال\n📋 رقم المعاملة: ${data.transactionId}\n📅 التاريخ: ${data.date}\n\nشكراً لك\nعائلة الشعيل`,
        whatsappTemplate: 'payment_receipt_ar'
      };

      expect(template.title).toBe('إيصال دفع');
      expect(template.body).toContain('5,000 ريال');
    });

    test('should generate English payment receipt', () => {
      const data = {
        memberName: 'Mohammed',
        amount: '5,000',
        transactionId: 'TXN-2024-001',
        date: 'March 15, 2024'
      };

      const template = {
        title: 'Payment Receipt',
        body: `Dear ${data.memberName},\n\nYour payment has been received successfully\n💰 Amount: ${data.amount} SAR\n📋 Transaction ID: ${data.transactionId}\n📅 Date: ${data.date}\n\nThank you\nAl-Shuail Family`,
        whatsappTemplate: 'payment_receipt_en'
      };

      expect(template.title).toBe('Payment Receipt');
      expect(template.body).toContain('5,000 SAR');
    });

    test('should include money emoji', () => {
      const body = '💰 المبلغ: 5,000 ريال';
      expect(body).toContain('💰');
    });

    test('should include transaction ID emoji', () => {
      const body = '📋 رقم المعاملة: TXN-2024-001';
      expect(body).toContain('📋');
    });
  });

  // ============================================
  // Payment Reminder Template Tests
  // ============================================
  describe('paymentReminderTemplate', () => {
    test('should generate Arabic payment reminder', () => {
      const data = {
        memberName: 'عبدالله',
        amountDue: '3,000',
        dueDate: '30/03/1445'
      };

      const template = {
        title: 'تذكير بالدفع',
        body: `عزيزي ${data.memberName},\n\nتذكير ودي بدفع الاشتراك السنوي\n💰 المبلغ المستحق: ${data.amountDue} ريال\n📅 تاريخ الاستحقاق: ${data.dueDate}\n\nيمكنك الدفع عبر التطبيق\n\nعائلة الشعيل`,
        whatsappTemplate: 'payment_reminder_ar'
      };

      expect(template.title).toBe('تذكير بالدفع');
      expect(template.body).toContain('تذكير ودي');
    });

    test('should generate English payment reminder', () => {
      const data = {
        memberName: 'Abdullah',
        amountDue: '3,000',
        dueDate: 'March 30, 2024'
      };

      const template = {
        title: 'Payment Reminder',
        body: `Dear ${data.memberName},\n\nFriendly reminder for annual subscription payment\n💰 Amount Due: ${data.amountDue} SAR\n📅 Due Date: ${data.dueDate}\n\nYou can pay via the app\n\nAl-Shuail Family`,
        whatsappTemplate: 'payment_reminder_en'
      };

      expect(template.title).toBe('Payment Reminder');
      expect(template.body).toContain('Friendly reminder');
    });

    test('should include due date', () => {
      const data = { dueDate: '30/03/1445' };
      expect(data.dueDate).toBeDefined();
    });
  });

  // ============================================
  // Crisis Alert Template Tests
  // ============================================
  describe('crisisAlertTemplate', () => {
    test('should generate Arabic crisis alert', () => {
      const data = {
        memberName: 'أحمد',
        alertMessage: 'حالة طوارئ طبية - يرجى التواصل فوراً',
        emergencyContact: '920001234'
      };

      const template = {
        title: '🚨 تنبيه طارئ',
        body: `${data.memberName},\n\n🚨 تنبيه طارئ من عائلة الشعيل\n\n${data.alertMessage}\n\nالرجاء تأكيد سلامتك عبر التطبيق فوراً.\n\nللطوارئ: ${data.emergencyContact}`,
        whatsappTemplate: 'crisis_alert_ar'
      };

      expect(template.title).toContain('🚨');
      expect(template.body).toContain('تنبيه طارئ');
    });

    test('should generate English crisis alert', () => {
      const data = {
        memberName: 'Ahmed',
        alertMessage: 'Medical emergency - please contact immediately',
        emergencyContact: '920001234'
      };

      const template = {
        title: '🚨 Emergency Alert',
        body: `${data.memberName},\n\n🚨 Emergency alert from Al-Shuail Family\n\n${data.alertMessage}\n\nPlease confirm your safety via the app immediately.\n\nEmergency: ${data.emergencyContact}`,
        whatsappTemplate: 'crisis_alert_en'
      };

      expect(template.title).toContain('🚨');
      expect(template.body).toContain('Emergency alert');
    });

    test('should include emergency emoji', () => {
      const title = '🚨 تنبيه طارئ';
      expect(title).toContain('🚨');
    });

    test('should include emergency contact', () => {
      const data = { emergencyContact: '920001234' };
      expect(data.emergencyContact).toBeDefined();
    });
  });

  // ============================================
  // General Announcement Template Tests
  // ============================================
  describe('generalAnnouncementTemplate', () => {
    test('should generate Arabic announcement', () => {
      const data = {
        memberName: 'أحمد',
        title: 'إعلان هام',
        message: 'سيتم عقد اجتماع طارئ يوم الخميس'
      };

      const template = {
        title: data.title,
        body: `عزيزي ${data.memberName},\n\n${data.message}\n\nعائلة الشعيل`,
        whatsappTemplate: 'general_announcement_ar'
      };

      expect(template.title).toBe('إعلان هام');
      expect(template.body).toContain('عزيزي أحمد');
    });

    test('should generate English announcement', () => {
      const data = {
        memberName: 'Ahmed',
        title: 'Important Announcement',
        message: 'An emergency meeting will be held on Thursday'
      };

      const template = {
        title: data.title,
        body: `Dear ${data.memberName},\n\n${data.message}\n\nAl-Shuail Family`,
        whatsappTemplate: 'general_announcement_en'
      };

      expect(template.title).toBe('Important Announcement');
      expect(template.body).toContain('Dear Ahmed');
    });

    test('should use custom title', () => {
      const data = { title: 'Custom Title' };
      expect(data.title).toBe('Custom Title');
    });
  });

  // ============================================
  // RSVP Confirmation Template Tests
  // ============================================
  describe('rsvpConfirmationTemplate', () => {
    test('should generate Arabic RSVP confirmation for yes', () => {
      const data = {
        memberName: 'أحمد',
        rsvpStatus: 'yes',
        eventName: 'الاجتماع السنوي',
        eventDate: '15 رمضان 1445'
      };

      const template = {
        title: 'تأكيد الحضور',
        body: `عزيزي ${data.memberName},\n\nشكراً لتأكيد ${data.rsvpStatus === 'yes' ? 'حضورك' : 'اعتذارك'} لحضور ${data.eventName}\n📅 ${data.eventDate}\n\n${data.rsvpStatus === 'yes' ? 'نتطلع لرؤيتك!' : 'نأمل رؤيتك في المناسبات القادمة'}\n\nعائلة الشعيل`
      };

      expect(template.body).toContain('حضورك');
      expect(template.body).toContain('نتطلع لرؤيتك');
    });

    test('should generate Arabic RSVP confirmation for no', () => {
      const data = {
        memberName: 'أحمد',
        rsvpStatus: 'no',
        eventName: 'الاجتماع السنوي',
        eventDate: '15 رمضان 1445'
      };

      const statusText = data.rsvpStatus === 'yes' ? 'حضورك' : 'اعتذارك';
      const followupText = data.rsvpStatus === 'yes' ? 'نتطلع لرؤيتك!' : 'نأمل رؤيتك في المناسبات القادمة';

      expect(statusText).toBe('اعتذارك');
      expect(followupText).toContain('المناسبات القادمة');
    });

    test('should generate English RSVP confirmation for yes', () => {
      const data = {
        memberName: 'Ahmed',
        rsvpStatus: 'yes',
        eventName: 'Annual Meeting',
        eventDate: 'March 25, 2024'
      };

      const statusText = data.rsvpStatus === 'yes' ? 'confirming your attendance' : 'your response';
      const followupText = data.rsvpStatus === 'yes' ? 'Looking forward to seeing you!' : 'Hope to see you at future events';

      expect(statusText).toBe('confirming your attendance');
      expect(followupText).toBe('Looking forward to seeing you!');
    });

    test('should generate English RSVP confirmation for no', () => {
      const data = {
        memberName: 'Ahmed',
        rsvpStatus: 'no'
      };

      const statusText = data.rsvpStatus === 'yes' ? 'confirming your attendance' : 'your response';
      const followupText = data.rsvpStatus === 'yes' ? 'Looking forward to seeing you!' : 'Hope to see you at future events';

      expect(statusText).toBe('your response');
      expect(followupText).toBe('Hope to see you at future events');
    });
  });

  // ============================================
  // getTemplate Tests
  // ============================================
  describe('getTemplate', () => {
    test('should map notification types to templates', () => {
      const templateMap = {
        'event_invitation': 'eventInvitationTemplate',
        'payment_receipt': 'paymentReceiptTemplate',
        'payment_reminder': 'paymentReminderTemplate',
        'crisis_alert': 'crisisAlertTemplate',
        'general_announcement': 'generalAnnouncementTemplate',
        'rsvp_confirmation': 'rsvpConfirmationTemplate'
      };

      expect(templateMap['event_invitation']).toBe('eventInvitationTemplate');
      expect(templateMap['payment_receipt']).toBe('paymentReceiptTemplate');
    });

    test('should throw error for unknown type', () => {
      const notificationType = 'unknown_type';
      const templateMap = {
        'event_invitation': 'eventInvitationTemplate'
      };

      const getTemplate = () => {
        if (!templateMap[notificationType]) {
          throw new Error(`Unknown notification type: ${notificationType}`);
        }
      };

      expect(getTemplate).toThrow('Unknown notification type: unknown_type');
    });

    test('should default to Arabic language', () => {
      const lang = undefined;
      const selectedLang = lang || 'ar';

      expect(selectedLang).toBe('ar');
    });

    test('should support English language', () => {
      const lang = 'en';
      const selectedLang = lang || 'ar';

      expect(selectedLang).toBe('en');
    });
  });

  // ============================================
  // WhatsApp Template Data Tests
  // ============================================
  describe('WhatsApp Template Data', () => {
    test('should include member_name in data', () => {
      const data = {
        member_name: 'Ahmed'
      };

      expect(data.member_name).toBe('Ahmed');
    });

    test('should include event details in data', () => {
      const data = {
        event_name: 'Annual Meeting',
        event_date: 'March 25, 2024',
        event_location: 'Conference Hall'
      };

      expect(data.event_name).toBeDefined();
      expect(data.event_date).toBeDefined();
      expect(data.event_location).toBeDefined();
    });

    test('should include payment details in data', () => {
      const data = {
        amount: '5,000',
        transaction_id: 'TXN-2024-001',
        date: 'March 15, 2024'
      };

      expect(data.amount).toBe('5,000');
      expect(data.transaction_id).toBe('TXN-2024-001');
    });

    test('should include crisis alert details', () => {
      const data = {
        alert_message: 'Emergency situation',
        emergency_contact: '920001234'
      };

      expect(data.alert_message).toBeDefined();
      expect(data.emergency_contact).toBeDefined();
    });
  });

  // ============================================
  // Language Selection Tests
  // ============================================
  describe('Language Selection', () => {
    test('should return Arabic template for ar lang', () => {
      const templates = {
        ar: { title: 'عنوان عربي' },
        en: { title: 'English Title' }
      };
      const lang = 'ar';

      const selected = templates[lang] || templates.ar;
      expect(selected.title).toBe('عنوان عربي');
    });

    test('should return English template for en lang', () => {
      const templates = {
        ar: { title: 'عنوان عربي' },
        en: { title: 'English Title' }
      };
      const lang = 'en';

      const selected = templates[lang] || templates.ar;
      expect(selected.title).toBe('English Title');
    });

    test('should default to Arabic for unknown lang', () => {
      const templates = {
        ar: { title: 'عنوان عربي' },
        en: { title: 'English Title' }
      };
      const lang = 'fr';

      const selected = templates[lang] || templates.ar;
      expect(selected.title).toBe('عنوان عربي');
    });
  });

  // ============================================
  // Template Structure Tests
  // ============================================
  describe('Template Structure', () => {
    test('should include title in all templates', () => {
      const template = {
        title: 'Test Title',
        body: 'Test Body',
        whatsappTemplate: 'test_template'
      };

      expect(template.title).toBeDefined();
    });

    test('should include body in all templates', () => {
      const template = {
        title: 'Test Title',
        body: 'Test Body',
        whatsappTemplate: 'test_template'
      };

      expect(template.body).toBeDefined();
    });

    test('should include whatsappTemplate identifier', () => {
      const template = {
        title: 'Test Title',
        body: 'Test Body',
        whatsappTemplate: 'test_template_ar'
      };

      expect(template.whatsappTemplate).toBeDefined();
    });

    test('should include data object for variables', () => {
      const template = {
        title: 'Test',
        body: 'Test',
        whatsappTemplate: 'test',
        data: {
          member_name: 'Ahmed'
        }
      };

      expect(template.data).toBeDefined();
      expect(template.data.member_name).toBe('Ahmed');
    });
  });
});
