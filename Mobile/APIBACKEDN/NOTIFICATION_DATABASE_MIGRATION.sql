-- ===============================================
-- NOTIFICATIONS TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- ===============================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content (bilingual)
  title VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200),
  message TEXT NOT NULL,
  message_ar TEXT,
  
  -- Classification
  type VARCHAR(50) NOT NULL, -- 'news', 'initiative', 'diya', 'occasion', 'statement', etc.
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  category VARCHAR(50), -- Additional categorization
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Related entities (optional)
  related_id UUID, -- ID of related entity (activity, payment, etc.)
  related_type VARCHAR(50), -- 'activity', 'payment', 'event', 'diya', etc.
  
  -- Visual
  icon VARCHAR(10), -- Emoji or icon identifier
  color VARCHAR(20), -- Hex color code
  action_url TEXT, -- Deep link or URL to navigate to
  
  -- Metadata
  metadata JSONB, -- Additional flexible data
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Optional expiration
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- INSERT SAMPLE NOTIFICATIONS FOR TESTING
-- ===============================================

-- Get test member ID (replace with actual member ID from your database)
DO $$
DECLARE
  test_member_id UUID;
BEGIN
  -- Find a test member (adjust query to match your data)
  SELECT id INTO test_member_id FROM users WHERE phone = '0555555555' LIMIT 1;
  
  IF test_member_id IS NULL THEN
    RAISE NOTICE 'No test member found. Please update the query with a valid member ID.';
    RETURN;
  END IF;

  -- Insert sample notifications
  INSERT INTO notifications (user_id, title, title_ar, message, message_ar, type, priority, icon, is_read) VALUES
  
  -- News notifications
  (test_member_id, 
   'Important Announcement', 
   'إعلان هام من إدارة الصندوق',
   'The annual general meeting will be held next Friday at 7 PM',
   'يسر إدارة صندوق عائلة الشعيل أن تعلن عن موعد الاجتماع السنوي العام يوم الجمعة القادم الساعة 7 مساءً',
   'news', 
   'high', 
   '📰',
   FALSE),
   
  (test_member_id,
   'System Update',
   'تحديث النظام',
   'New features have been added to the mobile app',
   'تم إضافة ميزات جديدة لتطبيق الجوال. يرجى التحديث للإصدار الأحدث',
   'news',
   'normal',
   '🔔',
   FALSE),
  
  -- Initiative notifications
  (test_member_id,
   'New Charity Initiative',
   'مبادرة خيرية جديدة',
   'A new initiative to help needy families has been launched',
   'تم إطلاق مبادرة لمساعدة الأسر المتعففة. المساهمة متاحة للجميع',
   'initiative',
   'normal',
   '🤝',
   FALSE),
   
  (test_member_id,
   'Initiative Goal Reached',
   'تم الوصول لهدف المبادرة',
   'The fundraising goal of 100,000 SAR has been reached. Thank you!',
   'تم الوصول لهدف جمع التبرعات بمبلغ 100,000 ريال. شكراً لكم جميعاً',
   'initiative',
   'high',
   '🎯',
   TRUE),
  
  -- Diya notifications
  (test_member_id,
   'Urgent Diya Case',
   'حالة دية عاجلة',
   'An urgent diya case requires your contribution. Amount needed: 50,000 SAR',
   'تحتاج إلى مساهمة عاجلة لدعم حالة دية. المبلغ المطلوب: 50,000 ريال',
   'diya',
   'urgent',
   '⚖️',
   FALSE),
  
  -- Occasion notifications
  (test_member_id,
   'Family Wedding Invitation',
   'دعوة زفاف',
   'You are invited to attend the wedding ceremony next Friday',
   'دعوة لحضور حفل زفاف أحد أفراد العائلة يوم الجمعة القادم',
   'occasion',
   'normal',
   '💒',
   FALSE),
   
  (test_member_id,
   'Condolences',
   'تعزية',
   'Please join us in offering condolences to the family',
   'نتقدم بخالص التعازي والمواساة. الدفن سيكون يوم الغد',
   'occasion',
   'high',
   '🕊️',
   FALSE),
  
  -- Statement notifications
  (test_member_id,
   'Monthly Statement Available',
   'كشف الحساب الشهري',
   'Your October statement is now available for download',
   'تم رفع كشف الحساب لشهر أكتوبر. يمكنك الاطلاع عليه الآن',
   'statement',
   'normal',
   '📊',
   FALSE),
   
  (test_member_id,
   'Payment Reminder',
   'تذكير بالدفع',
   'Your monthly subscription payment is due in 3 days',
   'اشتراكك الشهري مستحق خلال 3 أيام. المبلغ: 500 ريال',
   'statement',
   'high',
   '💰',
   FALSE),
   
  (test_member_id,
   'Payment Received',
   'تم استلام الدفعة',
   'Your payment of 500 SAR has been received. Thank you!',
   'تم استلام دفعتك بمبلغ 500 ريال. شكراً لك',
   'statement',
   'normal',
   '✅',
   TRUE),
   
  (test_member_id,
   'Receipt Available',
   'الإيصال متاح',
   'Your payment receipt is ready for download',
   'إيصال دفعتك جاهز للتحميل',
   'statement',
   'normal',
   '📄',
   FALSE);

  RAISE NOTICE 'Successfully inserted 11 sample notifications for member: %', test_member_id;
END $$;

-- ===============================================
-- QUERY TO VERIFY
-- ===============================================

-- Check if notifications were created
SELECT 
  type as notification_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count
FROM notifications
GROUP BY type
ORDER BY type;

-- View recent notifications
SELECT 
  title_ar as title,
  type,
  priority,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
