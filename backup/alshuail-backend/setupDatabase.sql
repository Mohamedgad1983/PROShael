-- Al-Shuail Family Admin Dashboard Database Schema
-- Phase 4B: Complete Integration Setup

-- Drop and recreate tables with correct schema

DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS activity_contributions CASCADE;
DROP TABLE IF EXISTS diyas CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- Members table
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  membership_number VARCHAR(50) UNIQUE,
  family_id UUID,
  is_active BOOLEAN DEFAULT true,
  joined_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  reference_number VARCHAR(50) UNIQUE,
  notes TEXT,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  plan_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  duration_months INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Events table (for occasions)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  event_type VARCHAR(100),
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  organizer UUID REFERENCES members(id),
  fee_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event RSVPs table
CREATE TABLE event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  status VARCHAR(50) DEFAULT 'pending',
  response_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(event_id, member_id)
);

-- Activities table (for initiatives)
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  target_amount DECIMAL(10,2),
  current_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  organizer_id UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity contributions table
CREATE TABLE activity_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  reference_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Diyas table
CREATE TABLE diyas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  category VARCHAR(100) DEFAULT 'general',
  status VARCHAR(50) DEFAULT 'pending',
  member_id UUID REFERENCES members(id),
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'normal',
  target_audience VARCHAR(50) DEFAULT 'all',
  member_id UUID REFERENCES members(id),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO members (full_name, email, phone, membership_number, is_active) VALUES
('أحمد الشعيل', 'ahmed@alshuail.com', '+965 99999999', 'AL001', true),
('فاطمة الشعيل', 'fatima@alshuail.com', '+965 88888888', 'AL002', true),
('محمد الشعيل', 'mohammed@alshuail.com', '+965 77777777', 'AL003', true);

-- Get member IDs for foreign key references
INSERT INTO events (title, description, start_date, start_time, location, event_type, max_attendees, organizer, fee_amount)
SELECT
  'اجتماع العائلة الشهري',
  'اجتماع دوري لمناقشة شؤون العائلة',
  '2025-10-15',
  '19:00',
  'مقر العائلة الرئيسي',
  'meeting',
  50,
  id,
  0
FROM members WHERE membership_number = 'AL001'
LIMIT 1;

INSERT INTO events (title, description, start_date, start_time, location, event_type, max_attendees, organizer, fee_amount)
SELECT
  'حفل زفاف علي الشعيل',
  'دعوة لحضور حفل زفاف ابن العائلة',
  '2025-11-20',
  '20:00',
  'قاعة الأفراح الكبرى',
  'celebration',
  200,
  id,
  25.00
FROM members WHERE membership_number = 'AL002'
LIMIT 1;

INSERT INTO activities (title, description, category, target_amount, current_amount, status, start_date, end_date, organizer_id)
SELECT
  'مشروع كفالة الأيتام',
  'مبادرة خيرية لكفالة الأطفال الأيتام',
  'charity',
  10000.00,
  0,
  'active',
  '2025-09-01',
  '2025-12-31',
  id
FROM members WHERE membership_number = 'AL001'
LIMIT 1;

INSERT INTO activities (title, description, category, target_amount, current_amount, status, organizer_id)
SELECT
  'صندوق الطوارئ العائلي',
  'صندوق لمساعدة أفراد العائلة في الحالات الطارئة',
  'emergency',
  50000.00,
  0,
  'active',
  id
FROM members WHERE membership_number = 'AL002'
LIMIT 1;

INSERT INTO diyas (title, description, amount, due_date, category, status, member_id)
SELECT
  'دية حادث مروري',
  'دية مطلوبة لحادث مروري تورط فيه أحد أفراد العائلة',
  15000.00,
  '2025-10-30',
  'accident',
  'pending',
  id
FROM members WHERE membership_number = 'AL001'
LIMIT 1;

INSERT INTO diyas (title, description, amount, due_date, category, status, member_id)
SELECT
  'تعويض أضرار',
  'تعويض عن أضرار حدثت في الملكية',
  5000.00,
  '2025-11-15',
  'property',
  'pending',
  id
FROM members WHERE membership_number = 'AL002'
LIMIT 1;

INSERT INTO notifications (title, message, type, priority, target_audience) VALUES
('مرحباً بالأعضاء الجدد', 'نرحب بانضمام الأعضاء الجدد إلى نظام إدارة عائلة الشعيل', 'welcome', 'normal', 'all'),
('تذكير بالاجتماع القادم', 'تذكير بالاجتماع الشهري المقرر يوم 15 أكتوبر', 'reminder', 'high', 'all'),
('دية مطلوبة عاجل', 'يرجى المساهمة في دية الحادث المروري المطلوبة', 'urgent', 'high', 'all');

-- Create some activity contributions
INSERT INTO activity_contributions (activity_id, member_id, amount, payment_method, status)
SELECT
  a.id,
  m.id,
  100.00,
  'bank_transfer',
  'completed'
FROM activities a, members m
WHERE a.title = 'مشروع كفالة الأيتام' AND m.membership_number = 'AL003'
LIMIT 1;

-- Update current amounts based on contributions
UPDATE activities
SET current_amount = (
  SELECT COALESCE(SUM(amount), 0)
  FROM activity_contributions
  WHERE activity_id = activities.id AND status = 'completed'
);

-- Create indexes for better performance
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_organizer ON events(organizer);
CREATE INDEX idx_activities_organizer ON activities(organizer_id);
CREATE INDEX idx_diyas_member ON diyas(member_id);
CREATE INDEX idx_notifications_member ON notifications(member_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Create RLS policies (Row Level Security) if needed
-- Note: For admin dashboard, we might want to disable RLS or create admin-level policies