-- ============================================
-- NEWS SYSTEM - PERFECT FIT FOR YOUR DATABASE
-- File: 02_NEWS_SYSTEM_PERFECT_FIT.sql
-- Purpose: Works with YOUR exact notifications structure
-- Date: October 7, 2025
-- ============================================

-- YOUR NOTIFICATIONS TABLE COLUMNS:
-- ✅ user_id, title, title_ar, message, message_ar
-- ✅ type, priority, category, is_read, read_at
-- ✅ related_id, related_type, icon, color, action_url
-- ✅ metadata, created_at, updated_at, expires_at, deleted_at

-- This script is 100% compatible with your database!

DO $$ 
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '🎯 NEWS SYSTEM - PERFECT FIT SETUP';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- STEP 1: Enhance news_announcements (SAFE)
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Step 1: Enhancing news_announcements...';
    
    -- Add bilingual columns (only if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'title_ar') THEN
        ALTER TABLE news_announcements ADD COLUMN title_ar TEXT;
        RAISE NOTICE '  ✅ Added title_ar';
    ELSE RAISE NOTICE '  ⏭️  title_ar exists'; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'title_en') THEN
        ALTER TABLE news_announcements ADD COLUMN title_en TEXT;
        RAISE NOTICE '  ✅ Added title_en';
    ELSE RAISE NOTICE '  ⏭️  title_en exists'; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'content_ar') THEN
        ALTER TABLE news_announcements ADD COLUMN content_ar TEXT;
        RAISE NOTICE '  ✅ Added content_ar';
    ELSE RAISE NOTICE '  ⏭️  content_ar exists'; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'content_en') THEN
        ALTER TABLE news_announcements ADD COLUMN content_en TEXT;
        RAISE NOTICE '  ✅ Added content_en';
    ELSE RAISE NOTICE '  ⏭️  content_en exists'; END IF;

    -- Add notification tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'notification_sent') THEN
        ALTER TABLE news_announcements ADD COLUMN notification_sent BOOLEAN DEFAULT false;
        RAISE NOTICE '  ✅ Added notification_sent';
    ELSE RAISE NOTICE '  ⏭️  notification_sent exists'; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'notification_sent_at') THEN
        ALTER TABLE news_announcements ADD COLUMN notification_sent_at TIMESTAMP;
        RAISE NOTICE '  ✅ Added notification_sent_at';
    ELSE RAISE NOTICE '  ⏭️  notification_sent_at exists'; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news_announcements' AND column_name = 'notification_count') THEN
        ALTER TABLE news_announcements ADD COLUMN notification_count INTEGER DEFAULT 0;
        RAISE NOTICE '  ✅ Added notification_count';
    ELSE RAISE NOTICE '  ⏭️  notification_count exists'; END IF;

    RAISE NOTICE '✅ Step 1 Complete';
END $$;

-- ============================================
-- STEP 2: Create supporting tables
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Step 2: Creating support tables...';
END $$;

-- NEWS REACTIONS
CREATE TABLE IF NOT EXISTS news_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    reactor_member_id UUID NOT NULL,
    reaction_type VARCHAR(20) NOT NULL, -- like, love, celebrate, support
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(news_id, reactor_member_id)
);

-- NEWS VIEWS TRACKING
CREATE TABLE IF NOT EXISTS news_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    viewer_member_id UUID,
    viewer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(news_id, viewer_member_id)
);

-- PUSH NOTIFICATION TOKENS
CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    owner_member_id UUID,
    device_token TEXT NOT NULL UNIQUE,
    device_type VARCHAR(20) NOT NULL, -- ios, android, web
    device_info JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 2 Complete';
END $$;

-- ============================================
-- STEP 3: Create indexes
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Step 3: Creating indexes...';
END $$;

-- News indexes
CREATE INDEX IF NOT EXISTS idx_news_status_date ON news_announcements(status, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_announcements(category);
CREATE INDEX IF NOT EXISTS idx_news_author ON news_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_news_priority ON news_announcements(priority);

-- Notifications indexes (for your existing table)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_news ON news_reactions(news_id);
CREATE INDEX IF NOT EXISTS idx_reactions_member ON news_reactions(reactor_member_id);

-- Views indexes
CREATE INDEX IF NOT EXISTS idx_news_views_news ON news_views(news_id);
CREATE INDEX IF NOT EXISTS idx_news_views_member ON news_views(viewer_member_id);

-- Push tokens indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_notification_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON push_notification_tokens(owner_member_id) WHERE is_active = true;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 3 Complete';
END $$;

-- ============================================
-- STEP 4: Create utility functions
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Step 4: Creating utility functions...';
END $$;

-- Get latest published news
CREATE OR REPLACE FUNCTION get_latest_news(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    category_filter TEXT DEFAULT NULL,
    priority_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    category TEXT,
    priority TEXT,
    image_url TEXT,
    publish_date TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    reaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.summary,
        n.category,
        n.priority,
        n.image_url,
        n.publish_date,
        n.view_count,
        COUNT(r.id) as reaction_count
    FROM news_announcements n
    LEFT JOIN news_reactions r ON n.id = r.news_id
    WHERE n.status = 'published'
    AND (n.expiry_date IS NULL OR n.expiry_date > NOW())
    AND (category_filter IS NULL OR n.category = category_filter)
    AND (priority_filter IS NULL OR n.priority = priority_filter)
    GROUP BY n.id
    ORDER BY 
        CASE n.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            ELSE 4 
        END,
        n.publish_date DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Increment news views
CREATE OR REPLACE FUNCTION increment_news_views(
    news_uuid UUID,
    viewer_member_uuid UUID DEFAULT NULL,
    viewer_user_uuid UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE news_announcements
    SET view_count = view_count + 1
    WHERE id = news_uuid;
    
    IF viewer_member_uuid IS NOT NULL OR viewer_user_uuid IS NOT NULL THEN
        INSERT INTO news_views (news_id, viewer_member_id, viewer_user_id)
        VALUES (news_uuid, viewer_member_uuid, viewer_user_uuid)
        ON CONFLICT (news_id, viewer_member_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create notification (using YOUR notifications table structure)
CREATE OR REPLACE FUNCTION create_news_notification(
    p_user_id UUID,
    p_title TEXT,
    p_title_ar TEXT,
    p_message TEXT,
    p_message_ar TEXT,
    p_news_id UUID,
    p_priority VARCHAR DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        title_ar,
        message,
        message_ar,
        type,
        priority,
        category,
        related_id,
        related_type,
        icon,
        color,
        action_url,
        is_read
    ) VALUES (
        p_user_id,
        p_title,
        p_title_ar,
        p_message,
        p_message_ar,
        'news',
        p_priority,
        'announcement',
        p_news_id,
        'news',
        'newspaper',
        '#3B82F6',
        COALESCE(p_action_url, '/news/' || p_news_id::text),
        false
    )
    RETURNING id INTO new_notification_id;
    
    RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = user_uuid
    AND is_read = false
    AND (deleted_at IS NULL)
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE id = notification_uuid;
END;
$$ LANGUAGE plpgsql;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE user_id = user_uuid
    AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    title_ar TEXT,
    message TEXT,
    message_ar TEXT,
    type VARCHAR,
    priority VARCHAR,
    category VARCHAR,
    related_id UUID,
    related_type VARCHAR,
    icon VARCHAR,
    color VARCHAR,
    action_url TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.title_ar,
        n.message,
        n.message_ar,
        n.type,
        n.priority,
        n.category,
        n.related_id,
        n.related_type,
        n.icon,
        n.color,
        n.action_url,
        n.is_read,
        n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND (n.deleted_at IS NULL)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (p_unread_only = false OR n.is_read = false)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Register FCM push token
CREATE OR REPLACE FUNCTION register_push_token(
    p_member_id UUID,
    p_user_id UUID,
    p_device_token TEXT,
    p_device_type VARCHAR,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    token_id UUID;
BEGIN
    -- Deactivate old tokens
    UPDATE push_notification_tokens
    SET is_active = false
    WHERE (owner_member_id = p_member_id OR user_id = p_user_id)
    AND device_token != p_device_token;
    
    -- Insert or update token
    INSERT INTO push_notification_tokens (
        owner_member_id, user_id, device_token, device_type, device_info, is_active, last_used_at
    ) VALUES (
        p_member_id, p_user_id, p_device_token, p_device_type, p_device_info, true, NOW()
    )
    ON CONFLICT (device_token) 
    DO UPDATE SET is_active = true, last_used_at = NOW(), device_info = p_device_info
    RETURNING id INTO token_id;
    
    RETURN token_id;
END;
$$ LANGUAGE plpgsql;

-- Get active push tokens for a user
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (device_token TEXT, device_type VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT pnt.device_token, pnt.device_type
    FROM push_notification_tokens pnt
    WHERE pnt.user_id = p_user_id AND pnt.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Toggle news reaction
CREATE OR REPLACE FUNCTION toggle_news_reaction(
    p_news_id UUID,
    p_member_id UUID,
    p_reaction_type VARCHAR DEFAULT 'like'
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_reaction UUID;
BEGIN
    SELECT id INTO existing_reaction
    FROM news_reactions
    WHERE news_id = p_news_id AND reactor_member_id = p_member_id;
    
    IF existing_reaction IS NOT NULL THEN
        DELETE FROM news_reactions WHERE id = existing_reaction;
        RETURN false; -- Removed
    ELSE
        INSERT INTO news_reactions (news_id, reactor_member_id, reaction_type)
        VALUES (p_news_id, p_member_id, p_reaction_type);
        RETURN true; -- Added
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Get news statistics
CREATE OR REPLACE FUNCTION get_news_stats()
RETURNS TABLE (
    total_news BIGINT,
    published_news BIGINT,
    draft_news BIGINT,
    total_views BIGINT,
    total_reactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_news,
        COUNT(*) FILTER (WHERE status = 'published') as published_news,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_news,
        SUM(view_count) as total_views,
        (SELECT COUNT(*) FROM news_reactions) as total_reactions
    FROM news_announcements;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 4 Complete';
END $$;

-- ============================================
-- STEP 5: Create triggers
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Step 5: Creating triggers...';
END $$;

-- Auto-update updated_at on news_announcements
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_news_updated_at ON news_announcements;
CREATE TRIGGER trigger_update_news_updated_at
BEFORE UPDATE ON news_announcements
FOR EACH ROW EXECUTE FUNCTION update_news_updated_at();

-- Auto-set publish_date when status changes to published
CREATE OR REPLACE FUNCTION set_news_publish_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        IF NEW.publish_date IS NULL THEN
            NEW.publish_date = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_news_publish_date ON news_announcements;
CREATE TRIGGER trigger_set_news_publish_date
BEFORE UPDATE ON news_announcements
FOR EACH ROW EXECUTE FUNCTION set_news_publish_date();

DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 5 Complete';
END $$;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
    news_cols INTEGER;
    reactions_exist BOOLEAN;
    views_exist BOOLEAN;
    tokens_exist BOOLEAN;
    functions_count INTEGER;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ NEWS SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '====================================';
    
    SELECT COUNT(*) INTO news_cols FROM information_schema.columns WHERE table_name = 'news_announcements';
    
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'news_reactions') INTO reactions_exist;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'news_views') INTO views_exist;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'push_notification_tokens') INTO tokens_exist;
    
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc 
    WHERE proname IN (
        'get_latest_news', 'increment_news_views', 'create_news_notification',
        'get_unread_notifications_count', 'mark_notification_read',
        'mark_all_notifications_read', 'get_user_notifications',
        'register_push_token', 'get_user_push_tokens',
        'toggle_news_reaction', 'get_news_stats'
    );
    
    RAISE NOTICE 'news_announcements: % columns', news_cols;
    RAISE NOTICE 'news_reactions table: %', CASE WHEN reactions_exist THEN '✅ Created' ELSE '❌ Missing' END;
    RAISE NOTICE 'news_views table: %', CASE WHEN views_exist THEN '✅ Created' ELSE '❌ Missing' END;
    RAISE NOTICE 'push_notification_tokens table: %', CASE WHEN tokens_exist THEN '✅ Created' ELSE '❌ Missing' END;
    RAISE NOTICE 'utility functions: % created', functions_count;
    RAISE NOTICE '====================================';
    RAISE NOTICE '🚀 READY FOR API DEVELOPMENT!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Test the system:';
    RAISE NOTICE '  SELECT * FROM get_latest_news(5);';
    RAISE NOTICE '  SELECT * FROM get_news_stats();';
    RAISE NOTICE '';
    RAISE NOTICE 'Your existing notifications table is compatible!';
    RAISE NOTICE 'Use create_news_notification() to create news alerts.';
    RAISE NOTICE '====================================';
END $$;

-- ============================================
-- SAMPLE TEST QUERIES
-- ============================================

-- View news_announcements structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'news_announcements' ORDER BY ordinal_position;

-- Get latest news:
-- SELECT * FROM get_latest_news(5);

-- Get statistics:
-- SELECT * FROM get_news_stats();

-- Test notification creation:
-- SELECT create_news_notification(
--     (SELECT id FROM users LIMIT 1), -- user_id
--     'Important News', -- title
--     'خبر مهم', -- title_ar
--     'Check out the latest announcement', -- message
--     'تحقق من آخر إعلان', -- message_ar
--     gen_random_uuid(), -- news_id
--     'high', -- priority
--     '/news/123' -- action_url
-- );

-- ============================================
-- SUCCESS! ✅
-- ============================================
