import { supabase } from '../config/database.js';
import { log } from './logger.js';

export async function initializeTestData() {
  try {
    log.info('🚀 Initializing test data...');

    // Create test members first
    const { data: members, error: membersError } = await supabase
      .from('members')
      .insert([
        {
          full_name: 'أحمد الشعيل',
          email: 'ahmed@alshuail.com',
          phone: '+965 99999999',
          membership_number: 'AL001',
          is_active: true
        },
        {
          full_name: 'فاطمة الشعيل',
          email: 'fatima@alshuail.com',
          phone: '+965 88888888',
          membership_number: 'AL002',
          is_active: true
        }
      ])
      .select();

    if (membersError && !membersError.message.includes('duplicate')) {
      log.info('Members might already exist:', membersError.message);
    } else if (members) {
      log.info('✅ Test members created:', members.length);
    }

    // Get existing members to use their IDs
    const { data: existingMembers } = await supabase
      .from('members')
      .select('id')
      .limit(2);

    if (!existingMembers || existingMembers.length === 0) {
      throw new Error('No members found to create test data');
    }

    const memberId1 = existingMembers[0].id;
    const memberId2 = existingMembers[1]?.id || memberId1;

    // Create test occasions/events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .insert([
        {
          title: 'اجتماع العائلة الشهري',
          description: 'اجتماع دوري لمناقشة شؤون العائلة',
          start_date: '2025-10-15',
          start_time: '19:00',
          location: 'مقر العائلة الرئيسي',
          event_type: 'meeting',
          max_attendees: 50,
          current_attendees: 0,
          status: 'active',
          organizer: memberId1,
          fee_amount: 0
        },
        {
          title: 'حفل زفاف علي الشعيل',
          description: 'دعوة لحضور حفل زفاف ابن العائلة',
          start_date: '2025-11-20',
          start_time: '20:00',
          location: 'قاعة الأفراح الكبرى',
          event_type: 'celebration',
          max_attendees: 200,
          current_attendees: 0,
          status: 'active',
          organizer: memberId2,
          fee_amount: 25.00
        }
      ])
      .select();

    if (eventsError && !eventsError.message.includes('duplicate')) {
      log.info('Events creation error:', eventsError.message);
    } else if (events) {
      log.info('✅ Test events created:', events.length);
    }

    // Create test initiatives
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .insert([
        {
          title: 'مشروع كفالة الأيتام',
          description: 'مبادرة خيرية لكفالة الأطفال الأيتام',
          category: 'charity',
          target_amount: 10000.00,
          current_amount: 0,
          status: 'active',
          start_date: '2025-09-01',
          end_date: '2025-12-31',
          organizer_id: memberId1
        },
        {
          title: 'صندوق الطوارئ العائلي',
          description: 'صندوق لمساعدة أفراد العائلة في الحالات الطارئة',
          category: 'emergency',
          target_amount: 50000.00,
          current_amount: 0,
          status: 'active',
          organizer_id: memberId2
        }
      ])
      .select();

    if (activitiesError && !activitiesError.message.includes('duplicate')) {
      log.info('Activities creation error:', activitiesError.message);
    } else if (activities) {
      log.info('✅ Test activities created:', activities.length);
    }

    // Create test diyas
    const { data: diyas, error: diyasError } = await supabase
      .from('diyas')
      .insert([
        {
          title: 'دية حادث مروري',
          description: 'دية مطلوبة لحادث مروري تورط فيه أحد أفراد العائلة',
          amount: 15000.00,
          due_date: '2025-10-30',
          category: 'accident',
          status: 'pending',
          member_id: memberId1
        },
        {
          title: 'تعويض أضرار',
          description: 'تعويض عن أضرار حدثت في الملكية',
          amount: 5000.00,
          due_date: '2025-11-15',
          category: 'property',
          status: 'pending',
          member_id: memberId2
        }
      ])
      .select();

    if (diyasError && !diyasError.message.includes('duplicate')) {
      log.info('Diyas creation error:', diyasError.message);
    } else if (diyas) {
      log.info('✅ Test diyas created:', diyas.length);
    }

    // Create test notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .insert([
        {
          title: 'مرحباً بالأعضاء الجدد',
          message: 'نرحب بانضمام الأعضاء الجدد إلى نظام إدارة عائلة الشعيل',
          type: 'welcome',
          priority: 'normal',
          target_audience: 'all'
        },
        {
          title: 'تذكير بالاجتماع القادم',
          message: 'تذكير بالاجتماع الشهري المقرر يوم 15 أكتوبر',
          type: 'reminder',
          priority: 'high',
          target_audience: 'all'
        }
      ])
      .select();

    if (notificationsError && !notificationsError.message.includes('duplicate')) {
      log.info('Notifications creation error:', notificationsError.message);
    } else if (notifications) {
      log.info('✅ Test notifications created:', notifications.length);
    }

    log.info('✅ Test data initialization completed successfully!');
    return true;

  } catch (error) {
    log.error('❌ Error initializing test data:', error);
    return false;
  }
}