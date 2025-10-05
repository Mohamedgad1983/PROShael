-- Insert Test Notifications for User: 147b3021-a6a3-4cd7-af2c-67ad11734aa0 (سارة الشعيل)
-- This creates sample notifications to test the notification API endpoints

-- Delete existing test notifications for this user
DELETE FROM notifications WHERE user_id = '147b3021-a6a3-4cd7-af2c-67ad11734aa0';

-- Insert 8 test notifications (3 news, 3 initiatives, 2 diyas)

-- News Notifications (3 total, 2 unread)
INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'news_urgent', 'إعلان هام', 'إجتماع عائلي عاجل يوم الجمعة القادمة', false, NOW()),
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'news_general', 'أخبار العائلة', 'تهنئة بمناسبة نجاح الطلاب', false, NOW() - INTERVAL '1 day'),
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'news_announcement', 'تحديث النظام', 'تم تحديث نظام إدارة العائلة', true, NOW() - INTERVAL '2 days');

-- Initiative Notifications (3 total, 2 unread)
INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'initiative_new', 'مبادرة جديدة', 'مبادرة دعم الطلاب المتفوقين 2025', false, NOW()),
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'initiative_update', 'تحديث المبادرة', 'تم تحديث مبادرة بناء المسجد', false, NOW() - INTERVAL '6 hours'),
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'initiative_completed', 'إكتمال مبادرة', 'تم إكتمال مبادرة الإفطار الجماعي', true, NOW() - INTERVAL '3 days');

-- Diya Notifications (2 total, 1 unread)
INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'diya_pending', 'دية معلقة', 'دية جديدة تحتاج للدفع: 50,000 ريال', false, NOW()),
('147b3021-a6a3-4cd7-af2c-67ad11734aa0', 'diya_completed', 'إكتمال دية', 'تم إكمال دفع الدية - شكراً لمساهمتك', true, NOW() - INTERVAL '5 days');

-- Verify insertion
SELECT
    type,
    COUNT(*) as total,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread
FROM notifications
WHERE user_id = '147b3021-a6a3-4cd7-af2c-67ad11734aa0'
GROUP BY type
ORDER BY type;

-- Show all notifications for this user
SELECT id, type, title, is_read, created_at
FROM notifications
WHERE user_id = '147b3021-a6a3-4cd7-af2c-67ad11734aa0'
ORDER BY created_at DESC;
