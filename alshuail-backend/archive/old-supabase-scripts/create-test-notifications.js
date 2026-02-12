// Create test notifications for verification
import { supabase } from './src/config/database.js';

const testNotifications = [
  {
    user_id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40', // ابراهيم فلاح العايد
    title: 'New Initiative Launch',
    title_ar: 'إطلاق مبادرة جديدة',
    message: 'Join our new charity initiative to help families in need',
    message_ar: 'انضم إلى مبادرتنا الخيرية الجديدة لمساعدة العائلات المحتاجة',
    type: 'initiative',
    priority: 'high',
    is_read: false,
    icon: '🤝',
    action_url: '/initiatives/123'
  },
  {
    user_id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40',
    title: 'Payment Received',
    title_ar: 'تم استلام الدفعة',
    message: 'Your payment of 500 SAR has been received',
    message_ar: 'تم استلام دفعتك البالغة 500 ريال سعودي',
    type: 'payment',
    priority: 'normal',
    is_read: false,
    icon: '💰',
    related_type: 'payment',
    related_id: 'pay_123'
  },
  {
    user_id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40',
    title: 'Important Announcement',
    title_ar: 'إعلان مهم',
    message: 'Family gathering scheduled for next Friday',
    message_ar: 'تجمع العائلة المقرر يوم الجمعة القادم',
    type: 'announcement',
    priority: 'high',
    is_read: false,
    icon: '📢'
  },
  {
    user_id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40',
    title: 'Urgent Diya Case',
    title_ar: 'حالة دية عاجلة',
    message: 'Urgent support needed for diya payment',
    message_ar: 'دعم عاجل مطلوب لدفع الدية',
    type: 'diya',
    priority: 'urgent',
    is_read: false,
    icon: '⚖️',
    action_url: '/diyas/456'
  },
  {
    user_id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40',
    title: 'Wedding Celebration',
    title_ar: 'حفل زفاف',
    message: 'You are invited to the wedding celebration',
    message_ar: 'أنت مدعو لحضور حفل الزفاف',
    type: 'wedding',
    priority: 'normal',
    is_read: true,
    read_at: new Date(Date.now() - 86400000).toISOString(), // Read yesterday
    icon: '🎉'
  }
];

async function createTestNotifications() {
  console.log('🔄 Creating test notifications...\n');

  for (const notification of testNotifications) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.log(`❌ Error creating notification "${notification.title}":`, error.message);
      } else {
        console.log(`✅ Created: ${notification.title_ar} (${notification.type})`);
      }
    } catch (err) {
      console.log(`❌ Exception:`, err.message);
    }
  }

  // Check total count
  const { data: count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', '3707d97e-7d2d-4849-8c5e-74fbc2766e40');

  console.log(`\n📊 Total notifications for test member: ${count || 0}`);
  console.log('✅ Test notifications created successfully!\n');

  process.exit(0);
}

createTestNotifications().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});