import { createClient } from '@supabase/supabase-js';
import { log } from '../utils/logger.js';
import { config } from './env.js';

// Use centralized configuration
const supabaseUrl = config.supabase.url;
const supabaseServiceKey = config.supabase.serviceKey;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const testConnection = async () => {
  try {
    const { data: _data, error } = await supabase
      .from('members')
      .select('*')
      .limit(1);

    if (error) {
      log.info('Database connection test - creating tables if needed...');
      await createTablesIfNotExist();
      return true;
    }

    log.info('Database connected successfully');
    return true;
  } catch (error) {
    log.error('Database connection failed', { error: error.message });
    return false;
  }
};

async function createTablesIfNotExist() {
  try {
    const { error: _membersError } = await supabase.rpc('create_members_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS members (
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
        )
      `
    }).single();

    const { error: _paymentsError } = await supabase.rpc('create_payments_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS payments (
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
        )
      `
    }).single();

    const { error: _subscriptionsError } = await supabase.rpc('create_subscriptions_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS subscriptions (
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
        )
      `
    }).single();

    // Events table for occasions
    const { error: _eventsError } = await supabase.rpc('create_events_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS events (
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
        )
      `
    }).single();

    // Event RSVPs table
    const { error: _rsvpsError } = await supabase.rpc('create_rsvps_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS event_rsvps (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          member_id UUID REFERENCES members(id),
          status VARCHAR(50) DEFAULT 'pending',
          response_date TIMESTAMP DEFAULT NOW(),
          notes TEXT,
          UNIQUE(event_id, member_id)
        )
      `
    }).single();

    // Activities table for initiatives
    const { error: _activitiesError } = await supabase.rpc('create_activities_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS activities (
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
        )
      `
    }).single();

    // Activity contributions table
    const { error: _contributionsError } = await supabase.rpc('create_contributions_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS activity_contributions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
          member_id UUID REFERENCES members(id),
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          reference_number VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
    }).single();

    // Diyas table
    const { error: _diyasError } = await supabase.rpc('create_diyas_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS diyas (
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
        )
      `
    }).single();

    // Notifications table
    const { error: _notificationsError } = await supabase.rpc('create_notifications_table_if_not_exists', {
      definition: `
        CREATE TABLE IF NOT EXISTS notifications (
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
        )
      `
    }).single();

    log.info('Tables created or verified successfully');
  } catch (error) {
    log.info('Note: Tables might already exist or will be created manually');
  }
}

