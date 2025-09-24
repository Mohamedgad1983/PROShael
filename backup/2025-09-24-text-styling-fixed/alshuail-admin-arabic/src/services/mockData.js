/**
 * Mock Database for Al-Shuail Family Admin Dashboard
 * Comprehensive mock data for Subscriptions Management System
 */

// Generate realistic Arabic names for family members
const arabicNames = [
  'أحمد الشعيل', 'فاطمة الشعيل', 'محمد الشعيل', 'عائشة الشعيل', 'عبدالله الشعيل',
  'نورا الشعيل', 'خالد الشعيل', 'هند الشعيل', 'سعد الشعيل', 'مريم الشعيل',
  'عمر الشعيل', 'زينب الشعيل', 'يوسف الشعيل', 'خديجة الشعيل', 'حسن الشعيل',
  'سارة الشعيل', 'علي الشعيل', 'رقية الشعيل', 'إبراهيم الشعيل', 'أم كلثوم الشعيل',
  'جاسم الشعيل', 'لطيفة الشعيل', 'حمد الشعيل', 'عبير الشعيل', 'ماجد الشعيل',
  'نجلاء الشعيل', 'بدر الشعيل', 'سلمى الشعيل', 'فهد الشعيل', 'نادية الشعيل'
];

// Generate phone numbers in Kuwait format
const generateKuwaitPhone = () => {
  const prefixes = ['965', '966', '967'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `+${prefix}${number}`;
};

// Generate email from Arabic name
const generateEmail = (name) => {
  const englishNames = [
    'ahmed', 'fatima', 'mohammed', 'aisha', 'abdullah',
    'nora', 'khalid', 'hind', 'saad', 'maryam',
    'omar', 'zainab', 'youssef', 'khadija', 'hassan',
    'sarah', 'ali', 'ruqaya', 'ibrahim', 'umkulthum',
    'jasim', 'latifa', 'hamad', 'abeer', 'majid',
    'najla', 'badr', 'salma', 'fahad', 'nadia'
  ];
  const randomName = englishNames[Math.floor(Math.random() * englishNames.length)];
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'alshuail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${randomName}${number}@${domain}`;
};

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Mock Database
export const mockDatabase = {
  // Subscription Plans
  plans: [
    {
      id: 1,
      name_ar: 'الاشتراك الأساسي',
      description_ar: 'اشتراك شهري أساسي للعائلة يشمل الخدمات الأساسية',
      price: 50,
      duration_months: 1,
      status: 'active',
      features: [
        'الوصول إلى النشاطات العائلية',
        'التقويم الشخصي',
        'الدعم الفني الأساسي'
      ],
      created_at: '2024-01-15',
      updated_at: '2024-09-01'
    },
    {
      id: 2,
      name_ar: 'الاشتراك المتميز',
      description_ar: 'اشتراك شهري متميز مع مزايا إضافية للعائلة',
      price: 100,
      duration_months: 1,
      status: 'active',
      features: [
        'جميع مزايا الاشتراك الأساسي',
        'نشاطات عائلية حصرية',
        'أولوية في الدعم الفني',
        'تقارير مفصلة شهرية'
      ],
      created_at: '2024-01-15',
      updated_at: '2024-09-01'
    },
    {
      id: 3,
      name_ar: 'الاشتراك السنوي',
      description_ar: 'اشتراك سنوي بخصم 20% مع جميع المزايا المتميزة',
      price: 1000,
      duration_months: 12,
      status: 'active',
      features: [
        'جميع مزايا الاشتراك المتميز',
        'خصم 20% على السعر الشهري',
        'استشارات عائلية مجانية',
        'دعوات لفعاليات العائلة الخاصة'
      ],
      created_at: '2024-01-15',
      updated_at: '2024-09-01'
    },
    {
      id: 4,
      name_ar: 'اشتراك مدى الحياة',
      description_ar: 'عضوية دائمة مع جميع المزايا الحصرية مدى الحياة',
      price: 5000,
      duration_months: -1, // -1 indicates lifetime
      status: 'active',
      features: [
        'جميع المزايا السابقة',
        'عضوية دائمة بلا تجديد',
        'مقعد دائم في مجلس العائلة',
        'أولوية في جميع الفعاليات',
        'دعم فني متاح على مدار الساعة'
      ],
      created_at: '2024-01-15',
      updated_at: '2024-09-01'
    },
    {
      id: 5,
      name_ar: 'اشتراك الطلاب',
      description_ar: 'اشتراك مخفض للطلاب من أفراد العائلة',
      price: 25,
      duration_months: 1,
      status: 'active',
      features: [
        'الوصول إلى النشاطات التعليمية',
        'التقويم الدراسي',
        'دعم الواجبات المنزلية',
        'خصم 50% للطلاب'
      ],
      created_at: '2024-03-01',
      updated_at: '2024-09-01'
    }
  ],

  // Family Members
  members: arabicNames.map((name, index) => ({
    id: index + 1,
    name,
    email: generateEmail(name),
    phone: generateKuwaitPhone(),
    status: Math.random() > 0.1 ? 'active' : 'inactive', // 90% active
    joined_date: randomDate(new Date('2020-01-01'), new Date('2024-08-01')).toISOString().split('T')[0],
    birth_date: randomDate(new Date('1950-01-01'), new Date('2010-01-01')).toISOString().split('T')[0],
    member_type: ['adult', 'child', 'elderly'][Math.floor(Math.random() * 3)],
    address: `الكويت، منطقة ${['الجهراء', 'حولي', 'الفروانية', 'مبارك الكبير', 'الأحمدي', 'العاصمة'][Math.floor(Math.random() * 6)]}`,
    emergency_contact: generateKuwaitPhone(),
    notes: index % 5 === 0 ? 'عضو مؤسس في العائلة' : '',
    created_at: randomDate(new Date('2020-01-01'), new Date('2024-08-01')).toISOString(),
    updated_at: randomDate(new Date('2024-01-01'), new Date()).toISOString()
  })),

  // Generate Subscriptions
  subscriptions: [],

  // Generate Payments
  payments: [],

  // Subscription History
  subscription_history: []
};

// Generate subscriptions for members
mockDatabase.subscriptions = mockDatabase.members
  .filter(member => member.status === 'active')
  .slice(0, 25) // 25 active subscriptions
  .map((member, index) => {
    const planId = Math.floor(Math.random() * 5) + 1;
    const plan = mockDatabase.plans.find(p => p.id === planId);
    const startDate = randomDate(new Date('2024-01-01'), new Date('2024-08-01'));
    let endDate;

    if (plan.duration_months === -1) {
      endDate = null; // Lifetime subscription
    } else {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.duration_months);
    }

    const statuses = ['active', 'expired', 'cancelled', 'suspended'];
    let status = 'active';

    // Set realistic status based on end date
    if (endDate && endDate < new Date()) {
      status = Math.random() > 0.3 ? 'expired' : 'active'; // Some might be renewed
    }

    return {
      id: index + 1,
      member_id: member.id,
      plan_id: planId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      status,
      auto_renew: Math.random() > 0.3, // 70% auto-renew
      payment_method: ['credit_card', 'bank_transfer', 'cash'][Math.floor(Math.random() * 3)],
      discount_applied: Math.random() > 0.8 ? Math.floor(Math.random() * 20) + 5 : 0, // 20% chance of discount
      notes: index % 7 === 0 ? 'اشتراك مع خصم عائلي خاص' : '',
      created_at: startDate.toISOString(),
      updated_at: randomDate(startDate, new Date()).toISOString()
    };
  });

// Generate Payments based on subscriptions
mockDatabase.subscriptions.forEach((subscription, subIndex) => {
  const plan = mockDatabase.plans.find(p => p.id === subscription.plan_id);
  const startDate = new Date(subscription.start_date);
  const endDate = subscription.end_date ? new Date(subscription.end_date) : new Date('2025-12-31');

  // Generate payments for each month/period
  let currentDate = new Date(startDate);
  let paymentId = mockDatabase.payments.length + 1;

  while (currentDate <= endDate && currentDate <= new Date()) {
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + 7); // Due 7 days after period start

    const paymentDate = Math.random() > 0.1 ? // 90% payment rate
      randomDate(currentDate, dueDate < new Date() ? dueDate : new Date()) : null;

    const finalAmount = plan.price * (1 - subscription.discount_applied / 100);

    mockDatabase.payments.push({
      id: paymentId++,
      subscription_id: subscription.id,
      amount: finalAmount,
      due_date: dueDate.toISOString().split('T')[0],
      status: paymentDate ? 'paid' : (dueDate < new Date() ? 'overdue' : 'pending'),
      payment_date: paymentDate ? paymentDate.toISOString().split('T')[0] : null,
      payment_method: subscription.payment_method,
      transaction_id: paymentDate ? `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
      late_fee: !paymentDate && dueDate < new Date() ? Math.floor(Math.random() * 20) + 5 : 0,
      notes: '',
      created_at: currentDate.toISOString(),
      updated_at: paymentDate ? paymentDate.toISOString() : currentDate.toISOString()
    });

    // Move to next payment period
    if (plan.duration_months === 1) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (plan.duration_months === 12) {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else if (plan.duration_months === -1) {
      break; // Lifetime - only one payment
    }
  }
});

// Generate Subscription History
mockDatabase.subscriptions.forEach(subscription => {
  const actions = ['created', 'activated', 'renewed', 'suspended', 'cancelled', 'reactivated'];
  const numActions = Math.floor(Math.random() * 3) + 1; // 1-3 actions per subscription

  for (let i = 0; i < numActions; i++) {
    const action = i === 0 ? 'created' : actions[Math.floor(Math.random() * actions.length)];
    const actionDate = i === 0 ?
      subscription.created_at :
      randomDate(new Date(subscription.created_at), new Date()).toISOString();

    mockDatabase.subscription_history.push({
      id: mockDatabase.subscription_history.length + 1,
      subscription_id: subscription.id,
      action,
      action_date: actionDate,
      notes: getActionNotes(action),
      performed_by: 'نظام إدارة الاشتراكات',
      created_at: actionDate
    });
  }
});

// Helper function for action notes
function getActionNotes(action) {
  const notes = {
    'created': 'تم إنشاء الاشتراك بنجاح',
    'activated': 'تم تفعيل الاشتراك',
    'renewed': 'تم تجديد الاشتراك تلقائياً',
    'suspended': 'تم تعليق الاشتراك مؤقتاً',
    'cancelled': 'تم إلغاء الاشتراك بناءً على طلب العضو',
    'reactivated': 'تم إعادة تفعيل الاشتراك'
  };
  return notes[action] || '';
}

// Enhanced subscription records with flexible amounts
export const flexibleSubscriptions = [
  {
    id: 101,
    member_id: 1,
    amount: 50,
    currency: 'SAR',
    duration: 'monthly',
    duration_months: 1,
    start_date: '2024-09-01',
    end_date: '2024-10-01',
    status: 'active',
    is_flexible: true,
    payment_method: 'credit_card',
    auto_renew: true,
    discount_applied: 0,
    notes: 'اشتراك مرن بمبلغ مخصص - 50 ريال شهرياً',
    created_at: '2024-09-01T00:00:00.000Z',
    updated_at: '2024-09-01T00:00:00.000Z'
  },
  {
    id: 102,
    member_id: 2,
    amount: 150,
    currency: 'SAR',
    duration: 'monthly',
    duration_months: 1,
    start_date: '2024-09-05',
    end_date: '2024-10-05',
    status: 'active',
    is_flexible: true,
    payment_method: 'bank_transfer',
    auto_renew: true,
    discount_applied: 0,
    notes: 'اشتراك مرن متميز - 150 ريال شهرياً',
    created_at: '2024-09-05T00:00:00.000Z',
    updated_at: '2024-09-05T00:00:00.000Z'
  },
  {
    id: 103,
    member_id: 3,
    amount: 1000,
    currency: 'SAR',
    duration: 'yearly',
    duration_months: 12,
    start_date: '2024-08-15',
    end_date: '2025-08-15',
    status: 'active',
    is_flexible: true,
    payment_method: 'credit_card',
    auto_renew: false,
    discount_applied: 10,
    notes: 'اشتراك مرن سنوي بخصم 10% - 1000 ريال سنوياً',
    created_at: '2024-08-15T00:00:00.000Z',
    updated_at: '2024-08-15T00:00:00.000Z'
  },
  {
    id: 104,
    member_id: 4,
    amount: 5000,
    currency: 'SAR',
    duration: 'lifetime',
    duration_months: -1,
    start_date: '2024-07-01',
    end_date: null,
    status: 'active',
    is_flexible: true,
    payment_method: 'bank_transfer',
    auto_renew: false,
    discount_applied: 0,
    notes: 'اشتراك مرن مدى الحياة - دفعة واحدة 5000 ريال',
    created_at: '2024-07-01T00:00:00.000Z',
    updated_at: '2024-07-01T00:00:00.000Z'
  },
  {
    id: 105,
    member_id: 5,
    amount: 250,
    currency: 'SAR',
    duration: 'monthly',
    duration_months: 1,
    start_date: '2024-09-10',
    end_date: '2024-10-10',
    status: 'overdue',
    is_flexible: true,
    payment_method: 'cash',
    auto_renew: true,
    discount_applied: 0,
    notes: 'اشتراك مرن عائلي - 250 ريال شهرياً - متأخر الدفع',
    created_at: '2024-09-10T00:00:00.000Z',
    updated_at: '2024-09-15T00:00:00.000Z'
  }
];

// Add flexible subscriptions to the main database
mockDatabase.subscriptions.push(...flexibleSubscriptions);

// Enhanced payment records for flexible subscriptions
export const flexiblePayments = [
  {
    id: 201,
    subscription_id: 101,
    amount: 50,
    due_date: '2024-09-01',
    status: 'paid',
    payment_date: '2024-09-01',
    payment_method: 'credit_card',
    transaction_id: 'TXN-FLEX001',
    late_fee: 0,
    notes: 'دفعة اشتراك مرن - 50 ريال',
    is_flexible_payment: true,
    created_at: '2024-09-01T00:00:00.000Z',
    updated_at: '2024-09-01T08:30:00.000Z'
  },
  {
    id: 202,
    subscription_id: 102,
    amount: 150,
    due_date: '2024-09-05',
    status: 'paid',
    payment_date: '2024-09-06',
    payment_method: 'bank_transfer',
    transaction_id: 'TXN-FLEX002',
    late_fee: 0,
    notes: 'دفعة اشتراك مرن - 150 ريال',
    is_flexible_payment: true,
    created_at: '2024-09-05T00:00:00.000Z',
    updated_at: '2024-09-06T10:15:00.000Z'
  },
  {
    id: 203,
    subscription_id: 103,
    amount: 900, // After 10% discount (1000 - 100)
    due_date: '2024-08-15',
    status: 'paid',
    payment_date: '2024-08-15',
    payment_method: 'credit_card',
    transaction_id: 'TXN-FLEX003',
    late_fee: 0,
    notes: 'دفعة اشتراك مرن سنوي بخصم 10%',
    is_flexible_payment: true,
    created_at: '2024-08-15T00:00:00.000Z',
    updated_at: '2024-08-15T14:20:00.000Z'
  },
  {
    id: 204,
    subscription_id: 104,
    amount: 5000,
    due_date: '2024-07-01',
    status: 'paid',
    payment_date: '2024-07-02',
    payment_method: 'bank_transfer',
    transaction_id: 'TXN-FLEX004',
    late_fee: 0,
    notes: 'دفعة اشتراك مرن مدى الحياة - دفعة واحدة',
    is_flexible_payment: true,
    created_at: '2024-07-01T00:00:00.000Z',
    updated_at: '2024-07-02T11:45:00.000Z'
  },
  {
    id: 205,
    subscription_id: 105,
    amount: 250,
    due_date: '2024-09-10',
    status: 'overdue',
    payment_date: null,
    payment_method: 'cash',
    transaction_id: null,
    late_fee: 25, // 10% late fee
    notes: 'دفعة اشتراك مرن - متأخرة 6 أيام',
    is_flexible_payment: true,
    created_at: '2024-09-10T00:00:00.000Z',
    updated_at: '2024-09-16T00:00:00.000Z'
  }
];

// Add flexible payments to the main database
mockDatabase.payments.push(...flexiblePayments);

// Enhanced subscription history for flexible subscriptions
export const flexibleSubscriptionHistory = [
  {
    id: 301,
    subscription_id: 101,
    action: 'created',
    action_date: '2024-09-01T00:00:00.000Z',
    notes: 'تم إنشاء اشتراك مرن بمبلغ 50 ريال سعودي',
    performed_by: 'نظام الاشتراكات المرنة',
    created_at: '2024-09-01T00:00:00.000Z'
  },
  {
    id: 302,
    subscription_id: 102,
    action: 'created',
    action_date: '2024-09-05T00:00:00.000Z',
    notes: 'تم إنشاء اشتراك مرن بمبلغ 150 ريال سعودي',
    performed_by: 'نظام الاشتراكات المرنة',
    created_at: '2024-09-05T00:00:00.000Z'
  },
  {
    id: 303,
    subscription_id: 103,
    action: 'created',
    action_date: '2024-08-15T00:00:00.000Z',
    notes: 'تم إنشاء اشتراك مرن سنوي بمبلغ 1000 ريال سعودي مع خصم 10%',
    performed_by: 'نظام الاشتراكات المرنة',
    created_at: '2024-08-15T00:00:00.000Z'
  },
  {
    id: 304,
    subscription_id: 104,
    action: 'created',
    action_date: '2024-07-01T00:00:00.000Z',
    notes: 'تم إنشاء اشتراك مرن مدى الحياة بمبلغ 5000 ريال سعودي',
    performed_by: 'نظام الاشتراكات المرنة',
    created_at: '2024-07-01T00:00:00.000Z'
  },
  {
    id: 305,
    subscription_id: 105,
    action: 'created',
    action_date: '2024-09-10T00:00:00.000Z',
    notes: 'تم إنشاء اشتراك مرن بمبلغ 250 ريال سعودي',
    performed_by: 'نظام الاشتراكات المرنة',
    created_at: '2024-09-10T00:00:00.000Z'
  },
  {
    id: 306,
    subscription_id: 105,
    action: 'payment_overdue',
    action_date: '2024-09-16T00:00:00.000Z',
    notes: 'الدفعة متأخرة 6 أيام - تم إضافة رسوم تأخير 25 ريال',
    performed_by: 'نظام إدارة الاشتراكات',
    created_at: '2024-09-16T00:00:00.000Z'
  }
];

// Add flexible subscription history to the main database
mockDatabase.subscription_history.push(...flexibleSubscriptionHistory);

// Export individual collections for easier access
export const {
  plans: mockPlans,
  members: mockMembers,
  subscriptions: mockSubscriptions,
  payments: mockPayments,
  subscription_history: mockSubscriptionHistory
} = mockDatabase;

// Utility functions for mock data
export const findMemberById = (id) => mockDatabase.members.find(m => m.id === parseInt(id));
export const findPlanById = (id) => mockDatabase.plans.find(p => p.id === parseInt(id));
export const findSubscriptionById = (id) => mockDatabase.subscriptions.find(s => s.id === parseInt(id));

// Statistics for analytics
export const getMockStats = () => {
  const activeSubscriptions = mockDatabase.subscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = mockDatabase.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const overduePayments = mockDatabase.payments.filter(p => p.status === 'overdue').length;

  return {
    activeSubscriptions,
    totalRevenue,
    overduePayments,
    totalMembers: mockDatabase.members.filter(m => m.status === 'active').length,
    totalPlans: mockDatabase.plans.filter(p => p.status === 'active').length
  };
};