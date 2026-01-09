// Mock data factories for generating test data with defaults

export function createMockMember(overrides = {}) {
  return {
    id: 1,
    membership_number: 'M001',
    full_name_ar: 'محمد أحمد الشعيل',
    full_name_en: 'Mohammed Ahmed Al-Shuail',
    phone: '96512345678',
    email: 'mohammed@example.com',
    branch_id: 1,
    branch_name_ar: 'فرع الشعيل الرئيسي',
    balance: '1500.00',
    current_balance: '1500.00',
    role: 'member',
    status: 'active',
    avatar_url: null,
    ...overrides
  }
}

export function createMockPayment(overrides = {}) {
  return {
    id: 1,
    member_id: 1,
    amount: '250.00',
    payment_type: 'subscription',
    status: 'completed',
    reference_number: 'PAY-2026-001',
    payment_method: 'cash',
    for_member_id: null,
    notes: null,
    created_at: '2026-01-09T00:00:00Z',
    ...overrides
  }
}

export function createMockSubscription(overrides = {}) {
  return {
    id: 1,
    member_id: 1,
    year: 2026,
    months_paid: 6,
    total_months: 12,
    amount_per_month: '25.00',
    status: 'active',
    paid_months: [1, 2, 3, 4, 5, 6],
    unpaid_months: [7, 8, 9, 10, 11, 12],
    ...overrides
  }
}

export function createMockNotification(overrides = {}) {
  return {
    id: 1,
    member_id: 1,
    title_ar: 'تذكير بالاشتراك',
    title_en: 'Subscription Reminder',
    body_ar: 'موعد سداد اشتراك شهر يناير',
    body_en: 'January subscription payment due',
    type: 'subscription_reminder',
    read: false,
    created_at: '2026-01-09T00:00:00Z',
    ...overrides
  }
}

export function createMockInitiative(overrides = {}) {
  return {
    id: 1,
    title_ar: 'مشروع بناء مسجد',
    title_en: 'Mosque Building Project',
    description_ar: 'المساهمة في بناء مسجد للعائلة',
    description_en: 'Contributing to building a family mosque',
    target_amount: '50000.00',
    collected_amount: '35000.00',
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    contributors: 50,
    ...overrides
  }
}

export function createMockNews(overrides = {}) {
  return {
    id: 1,
    title_ar: 'إعلان هام',
    title_en: 'Important Announcement',
    content_ar: 'محتوى الخبر باللغة العربية',
    content_en: 'News content in English',
    category: 'announcement',
    image_url: null,
    created_at: '2026-01-09T00:00:00Z',
    ...overrides
  }
}

export function createMockEvent(overrides = {}) {
  return {
    id: 1,
    title_ar: 'اجتماع العائلة السنوي',
    title_en: 'Annual Family Gathering',
    description_ar: 'اجتماع سنوي لجميع أفراد العائلة',
    description_en: 'Annual meeting for all family members',
    location_ar: 'قاعة الشعيل',
    location_en: 'Al-Shuail Hall',
    event_date: '2026-06-15T18:00:00Z',
    rsvp_deadline: '2026-06-01T23:59:59Z',
    max_attendees: 500,
    current_attendees: 250,
    ...overrides
  }
}

export function createMockAuthResponse(overrides = {}) {
  return {
    success: true,
    token: 'mock-jwt-token',
    user: createMockMember(),
    ...overrides
  }
}
