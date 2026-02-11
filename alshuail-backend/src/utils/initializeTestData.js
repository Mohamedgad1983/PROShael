import { query } from '../services/database.js';
import { log } from './logger.js';

export async function initializeTestData() {
  try {
    log.info('Initializing test data...');

    // Create test members first
    let members = null;
    try {
      const { rows } = await query(
        `INSERT INTO members (full_name, email, phone, membership_number, is_active)
         VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)
         RETURNING *`,
        [
          'أحمد الشعيل', 'ahmed@alshuail.com', '+965 99999999', 'AL001', true,
          'فاطمة الشعيل', 'fatima@alshuail.com', '+965 88888888', 'AL002', true
        ]
      );
      members = rows;
      log.info('Test members created:', members.length);
    } catch (insertErr) {
      if (!insertErr.message.includes('duplicate')) {
        log.info('Members might already exist:', insertErr.message);
      }
    }

    // Get existing members to use their IDs
    const { rows: existingMembers } = await query(
      'SELECT id FROM members LIMIT 2'
    );

    if (!existingMembers || existingMembers.length === 0) {
      throw new Error('No members found to create test data');
    }

    const memberId1 = existingMembers[0].id;
    const memberId2 = existingMembers[1]?.id || memberId1;

    // Create test occasions/events
    try {
      const { rows: events } = await query(
        `INSERT INTO events (title, description, start_date, start_time, location, event_type, max_attendees, current_attendees, status, organizer, fee_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
                ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         RETURNING *`,
        [
          'اجتماع العائلة الشهري', 'اجتماع دوري لمناقشة شؤون العائلة', '2025-10-15', '19:00',
          'مقر العائلة الرئيسي', 'meeting', 50, 0, 'active', memberId1, 0,
          'حفل زفاف علي الشعيل', 'دعوة لحضور حفل زفاف ابن العائلة', '2025-11-20', '20:00',
          'قاعة الأفراح الكبرى', 'celebration', 200, 0, 'active', memberId2, 25.00
        ]
      );
      log.info('Test events created:', events.length);
    } catch (insertErr) {
      if (!insertErr.message.includes('duplicate')) {
        log.info('Events creation error:', insertErr.message);
      }
    }

    // Create test initiatives
    try {
      const { rows: activities } = await query(
        `INSERT INTO activities (title, description, category, target_amount, current_amount, status, start_date, end_date, organizer_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9),
                ($10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          'مشروع كفالة الأيتام', 'مبادرة خيرية لكفالة الأطفال الأيتام', 'charity',
          10000.00, 0, 'active', '2025-09-01', '2025-12-31', memberId1,
          'صندوق الطوارئ العائلي', 'صندوق لمساعدة أفراد العائلة في الحالات الطارئة', 'emergency',
          50000.00, 0, 'active', null, null, memberId2
        ]
      );
      log.info('Test activities created:', activities.length);
    } catch (insertErr) {
      if (!insertErr.message.includes('duplicate')) {
        log.info('Activities creation error:', insertErr.message);
      }
    }

    // Create test diyas
    try {
      const { rows: diyas } = await query(
        `INSERT INTO diyas (title, description, amount, due_date, category, status, member_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7),
                ($8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          'دية حادث مروري', 'دية مطلوبة لحادث مروري تورط فيه أحد أفراد العائلة',
          15000.00, '2025-10-30', 'accident', 'pending', memberId1,
          'تعويض أضرار', 'تعويض عن أضرار حدثت في الملكية',
          5000.00, '2025-11-15', 'property', 'pending', memberId2
        ]
      );
      log.info('Test diyas created:', diyas.length);
    } catch (insertErr) {
      if (!insertErr.message.includes('duplicate')) {
        log.info('Diyas creation error:', insertErr.message);
      }
    }

    // Create test notifications
    try {
      const { rows: notifications } = await query(
        `INSERT INTO notifications (title, message, type, priority, target_audience)
         VALUES ($1, $2, $3, $4, $5),
                ($6, $7, $8, $9, $10)
         RETURNING *`,
        [
          'مرحباً بالأعضاء الجدد', 'نرحب بانضمام الأعضاء الجدد إلى نظام إدارة عائلة الشعيل',
          'welcome', 'normal', 'all',
          'تذكير بالاجتماع القادم', 'تذكير بالاجتماع الشهري المقرر يوم 15 أكتوبر',
          'reminder', 'high', 'all'
        ]
      );
      log.info('Test notifications created:', notifications.length);
    } catch (insertErr) {
      if (!insertErr.message.includes('duplicate')) {
        log.info('Notifications creation error:', insertErr.message);
      }
    }

    log.info('Test data initialization completed successfully!');
    return true;

  } catch (error) {
    log.error('Error initializing test data:', error);
    return false;
  }
}
