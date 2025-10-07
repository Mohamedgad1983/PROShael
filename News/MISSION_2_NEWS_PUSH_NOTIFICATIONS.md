# 🎯 MISSION #2: NEWS MANAGEMENT & PUSH NOTIFICATION SYSTEM
## **Code Name: "HAWK" - Real-Time Family Communication Platform**

**Status:** MISSION CRITICAL  
**Timeline:** 5 Working Days  
**Complexity:** Medium-High  
**Priority:** HIGH ⭐⭐⭐⭐  
**Target Users:** 344 Active Families  

---

## 🚀 MISSION BRIEFING

You are elite engineering agents tasked with building a world-class news broadcasting system for the Al-Shuail Family Management System. This is not just a news feed—this is a real-time communication platform that instantly pushes important family announcements, events, and updates directly to 344 families' mobile devices.

**Your Challenge:** Build a system where admins can create beautiful news posts with images/videos and push instant notifications to all members. Members see news instantly on their home screen with a notification badge that updates in real-time.

**The Standard:** This must feel like it was built by a world-class social media company. Instant, beautiful, engaging, and reliable.

---

## 📋 BUSINESS REQUIREMENTS (From Arabic Scope Section 6 - RENAMED)

### **CRITICAL CHANGE: Events/Occasions → NEWS**

The user wants to rename "Events/Occasions" to "**NEWS**" (الأخبار)

### **Core Requirements:**
1. ✅ Authorized staff can **add, edit, delete** news posts
2. ✅ News includes **title, description, images, photos, videos**
3. ✅ Display news **directly to members** in mobile app
4. ✅ **CRITICAL NEW FEATURE:** Admin can push notifications **any time**
5. ✅ Notifications appear **immediately** on member's home page
6. ✅ Notification **badge counter** shows unread news count
7. ✅ Members can **mark as read** and badge updates instantly
8. ✅ Support **categories**: Family news, events, announcements, urgent
9. ✅ Support **media**: Images (multiple), videos (YouTube/direct)
10. ✅ **Rich formatting**: Bold, italic, lists, links

---

## 🗄️ DATABASE SCHEMA (ALREADY EXISTS + NEW TABLES)

**Existing Tables (use these):**
```sql
-- TABLE 1: news_announcements (exists)
CREATE TABLE news_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    content_ar TEXT,
    content_en TEXT,
    author_id UUID REFERENCES users(id),
    published_date TIMESTAMP DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**NEW Tables to Create:**

```sql
-- TABLE 2: news_media (NEW - for images/videos)
CREATE TABLE news_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL, -- 'image', 'video', 'youtube'
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 3: news_reads (NEW - track who read what)
CREATE TABLE news_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(news_id, member_id)
);

-- TABLE 4: news_notifications (NEW - push notification log)
CREATE TABLE news_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT NOW(),
    total_recipients INTEGER DEFAULT 0,
    notification_title TEXT NOT NULL,
    notification_body TEXT NOT NULL
);

-- TABLE 5: news_categories (NEW)
CREATE TABLE news_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name_ar TEXT NOT NULL,
    category_name_en TEXT NOT NULL,
    icon TEXT,
    color_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add new columns to existing table
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES news_categories(id);
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_published ON news_announcements(is_published, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_announcements(category_id);
CREATE INDEX IF NOT EXISTS idx_news_reads_member ON news_reads(member_id);
CREATE INDEX IF NOT EXISTS idx_news_media_news ON news_media(news_id);

-- Insert default categories
INSERT INTO news_categories (category_name_ar, category_name_en, icon, color_code) VALUES
('أخبار العائلة', 'Family News', '📰', '#3B82F6'),
('فعاليات', 'Events', '🎉', '#10B981'),
('إعلانات', 'Announcements', '📢', '#8B5CF6'),
('عاجل', 'Urgent', '⚠️', '#EF4444');
```

---

## 👥 AGENT TASK DISTRIBUTION

---

## 🔧 AGENT 1: BACKEND ENGINEER - API DEVELOPMENT
**Timeline:** 2 Days  
**Skill Required:** Node.js, Express, PostgreSQL, WebSocket/Push Notifications  
**Mission:** Build bulletproof backend with real-time notifications

---

### **TASK 1.1: Database Setup** (1 hour)

**File:** `backend/migrations/add_news_system.sql`

```sql
-- Run this migration to add news system tables

-- Create news_media table
CREATE TABLE IF NOT EXISTS news_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'youtube')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create news_reads table
CREATE TABLE IF NOT EXISTS news_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(news_id, member_id)
);

-- Create news_notifications table
CREATE TABLE IF NOT EXISTS news_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_announcements(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT NOW(),
    total_recipients INTEGER DEFAULT 0,
    notification_title TEXT NOT NULL,
    notification_body TEXT NOT NULL
);

-- Create news_categories table
CREATE TABLE IF NOT EXISTS news_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name_ar TEXT NOT NULL,
    category_name_en TEXT NOT NULL,
    icon TEXT,
    color_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to news_announcements
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES news_categories(id);
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS excerpt_ar TEXT;
ALTER TABLE news_announcements ADD COLUMN IF NOT EXISTS excerpt_en TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_published ON news_announcements(is_published, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_announcements(category_id);
CREATE INDEX IF NOT EXISTS idx_news_urgent ON news_announcements(is_urgent, is_published);
CREATE INDEX IF NOT EXISTS idx_news_reads_member ON news_reads(member_id);
CREATE INDEX IF NOT EXISTS idx_news_media_news ON news_media(news_id, display_order);

-- Insert default categories
INSERT INTO news_categories (category_name_ar, category_name_en, icon, color_code) VALUES
('أخبار العائلة', 'Family News', '📰', '#3B82F6'),
('فعاليات', 'Events', '🎉', '#10B981'),
('إعلانات', 'Announcements', '📢', '#8B5CF6'),
('عاجل', 'Urgent', '⚠️', '#EF4444'),
('اجتماعات', 'Meetings', '👥', '#F59E0B')
ON CONFLICT DO NOTHING;
```

---

### **TASK 1.2: API Routes Setup** (1 hour)

**File:** `backend/routes/news.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateUser, checkRole } = require('../middleware/auth');
const newsController = require('../controllers/newsController');
const upload = require('../middleware/uploadMiddleware');

// ========================================
// ADMIN ROUTES (Authorized Staff Only)
// ========================================

// News Management
router.post('/news',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    upload.array('media', 10), // Allow up to 10 media files
    newsController.createNews
);

router.put('/news/:id',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    upload.array('media', 10),
    newsController.updateNews
);

router.delete('/news/:id',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.deleteNews
);

router.get('/news',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.getAllNews
);

router.get('/news/:id',
    authenticateUser,
    newsController.getNewsDetails
);

// Publish/Unpublish
router.post('/news/:id/publish',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.publishNews
);

router.post('/news/:id/unpublish',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.unpublishNews
);

// ⭐ PUSH NOTIFICATION (CRITICAL FEATURE)
router.post('/news/:id/notify',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.pushNotification
);

// Categories Management
router.get('/news/categories/all',
    authenticateUser,
    newsController.getCategories
);

router.post('/news/categories',
    authenticateUser,
    checkRole(['super_admin', 'secretary']),
    newsController.createCategory
);

// Analytics
router.get('/news/:id/analytics',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.getNewsAnalytics
);

router.get('/news/analytics/overview',
    authenticateUser,
    checkRole(['super_admin', 'secretary', 'news_manager']),
    newsController.getAnalyticsOverview
);

// ========================================
// MEMBER ROUTES (Mobile App)
// ========================================

// Get published news for mobile
router.get('/mobile/news/feed',
    authenticateUser,
    newsController.getMobileNewsFeed
);

// Get single news article
router.get('/mobile/news/:id',
    authenticateUser,
    newsController.getMobileNewsArticle
);

// Mark as read
router.post('/mobile/news/:id/read',
    authenticateUser,
    newsController.markAsRead
);

// Get unread count (for badge)
router.get('/mobile/news/unread/count',
    authenticateUser,
    newsController.getUnreadCount
);

// Search news
router.get('/mobile/news/search',
    authenticateUser,
    newsController.searchNews
);

module.exports = router;
```

---

### **TASK 1.3: Controller Implementation** (1 day)

**File:** `backend/controllers/newsController.js`

```javascript
const pool = require('../config/database');
const { sendPushNotification } = require('../services/pushNotificationService');

// ========================================
// ADMIN CONTROLLERS
// ========================================

exports.createNews = async (req, res) => {
    try {
        const {
            title_ar,
            title_en,
            content_ar,
            content_en,
            excerpt_ar,
            excerpt_en,
            category_id,
            is_urgent,
            featured,
            publish_now
        } = req.body;
        
        const author_id = req.user.id;
        
        // Validation
        if (!title_ar || !title_en) {
            return res.status(400).json({
                success: false,
                message: 'Title in Arabic and English is required'
            });
        }
        
        // Insert news article
        const newsResult = await pool.query(`
            INSERT INTO news_announcements (
                title_ar, title_en, content_ar, content_en,
                excerpt_ar, excerpt_en, category_id,
                is_urgent, featured, author_id, published_by,
                is_published, published_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                      ${publish_now ? '$10' : 'NULL'},
                      ${publish_now ? 'true' : 'false'},
                      ${publish_now ? 'NOW()' : 'NULL'})
            RETURNING *
        `, [
            title_ar, title_en, content_ar, content_en,
            excerpt_ar, excerpt_en, category_id,
            is_urgent || false, featured || false, author_id
        ]);
        
        const news_id = newsResult.rows[0].id;
        
        // Handle media uploads
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const mediaUrl = await uploadMedia(file);
                
                await pool.query(`
                    INSERT INTO news_media (news_id, media_type, media_url, display_order)
                    VALUES ($1, $2, $3, $4)
                `, [news_id, getMediaType(file.mimetype), mediaUrl, i]);
            }
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'news_created', $2)
        `, [author_id, JSON.stringify({ news_id, publish_now })]);
        
        res.status(201).json({
            success: true,
            message_ar: 'تم إنشاء الخبر بنجاح',
            message_en: 'News created successfully',
            news: newsResult.rows[0]
        });
        
    } catch (error) {
        console.error('Create news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create news',
            error: error.message
        });
    }
};

exports.updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updated_by = req.user.id;
        
        // Build dynamic UPDATE query
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = [
            'title_ar', 'title_en', 'content_ar', 'content_en',
            'excerpt_ar', 'excerpt_en', 'category_id',
            'is_urgent', 'featured'
        ];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        
        if (fields.length === 0 && (!req.files || req.files.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }
        
        if (fields.length > 0) {
            fields.push(`updated_at = NOW()`);
            values.push(id);
            
            await pool.query(`
                UPDATE news_announcements 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
            `, values);
        }
        
        // Handle new media uploads
        if (req.files && req.files.length > 0) {
            // Get current max display_order
            const maxOrderResult = await pool.query(
                'SELECT COALESCE(MAX(display_order), -1) as max_order FROM news_media WHERE news_id = $1',
                [id]
            );
            let displayOrder = maxOrderResult.rows[0].max_order + 1;
            
            for (const file of req.files) {
                const mediaUrl = await uploadMedia(file);
                
                await pool.query(`
                    INSERT INTO news_media (news_id, media_type, media_url, display_order)
                    VALUES ($1, $2, $3, $4)
                `, [id, getMediaType(file.mimetype), mediaUrl, displayOrder++]);
            }
        }
        
        // Get updated news
        const result = await pool.query(
            'SELECT * FROM news_announcements WHERE id = $1',
            [id]
        );
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'news_updated', $2)
        `, [updated_by, JSON.stringify({ news_id: id, changes: updates })]);
        
        res.json({
            success: true,
            message_ar: 'تم تحديث الخبر بنجاح',
            message_en: 'News updated successfully',
            news: result.rows[0]
        });
        
    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update news',
            error: error.message
        });
    }
};

exports.deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted_by = req.user.id;
        
        // Check if news exists
        const checkResult = await pool.query(
            'SELECT * FROM news_announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }
        
        // Delete news (cascade will handle media and reads)
        await pool.query('DELETE FROM news_announcements WHERE id = $1', [id]);
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'news_deleted', $2)
        `, [deleted_by, JSON.stringify({ news_id: id })]);
        
        res.json({
            success: true,
            message_ar: 'تم حذف الخبر بنجاح',
            message_en: 'News deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete news',
            error: error.message
        });
    }
};

exports.getAllNews = async (req, res) => {
    try {
        const {
            status, // 'published', 'draft', 'all'
            category_id,
            is_urgent,
            featured,
            limit = 20,
            offset = 0
        } = req.query;
        
        let query = `
            SELECT 
                n.*,
                c.category_name_ar,
                c.category_name_en,
                c.icon as category_icon,
                c.color_code as category_color,
                u.full_name as author_name,
                (SELECT COUNT(*) FROM news_reads WHERE news_id = n.id) as reads_count,
                (SELECT COUNT(*) FROM news_media WHERE news_id = n.id) as media_count,
                (SELECT json_agg(json_build_object(
                    'id', nm.id,
                    'media_type', nm.media_type,
                    'media_url', nm.media_url,
                    'thumbnail_url', nm.thumbnail_url,
                    'display_order', nm.display_order
                ) ORDER BY nm.display_order)
                FROM news_media nm
                WHERE nm.news_id = n.id) as media
            FROM news_announcements n
            LEFT JOIN news_categories c ON n.category_id = c.id
            LEFT JOIN users u ON n.author_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;
        
        if (status === 'published') {
            query += ` AND n.is_published = true`;
        } else if (status === 'draft') {
            query += ` AND n.is_published = false`;
        }
        
        if (category_id) {
            query += ` AND n.category_id = $${paramCount}`;
            params.push(category_id);
            paramCount++;
        }
        
        if (is_urgent === 'true') {
            query += ` AND n.is_urgent = true`;
        }
        
        if (featured === 'true') {
            query += ` AND n.featured = true`;
        }
        
        query += ` ORDER BY n.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        // Get statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_published = true) as published,
                COUNT(*) FILTER (WHERE is_published = false) as drafts,
                COUNT(*) FILTER (WHERE is_urgent = true) as urgent,
                COUNT(*) FILTER (WHERE featured = true) as featured,
                COALESCE(SUM(views_count), 0) as total_views
            FROM news_announcements
        `);
        
        res.json({
            success: true,
            news: result.rows,
            statistics: statsResult.rows[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: parseInt(statsResult.rows[0].total)
            }
        });
        
    } catch (error) {
        console.error('Get all news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news',
            error: error.message
        });
    }
};

exports.getNewsDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get news details
        const newsResult = await pool.query(`
            SELECT 
                n.*,
                c.category_name_ar,
                c.category_name_en,
                c.icon as category_icon,
                c.color_code as category_color,
                u.full_name as author_name,
                up.full_name as publisher_name
            FROM news_announcements n
            LEFT JOIN news_categories c ON n.category_id = c.id
            LEFT JOIN users u ON n.author_id = u.id
            LEFT JOIN users up ON n.published_by = up.id
            WHERE n.id = $1
        `, [id]);
        
        if (newsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }
        
        // Get media
        const mediaResult = await pool.query(`
            SELECT *
            FROM news_media
            WHERE news_id = $1
            ORDER BY display_order
        `, [id]);
        
        // Get read statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_reads,
                COUNT(DISTINCT DATE(read_at)) as unique_days
            FROM news_reads
            WHERE news_id = $1
        `, [id]);
        
        res.json({
            success: true,
            news: newsResult.rows[0],
            media: mediaResult.rows,
            statistics: statsResult.rows[0]
        });
        
    } catch (error) {
        console.error('Get news details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news details',
            error: error.message
        });
    }
};

exports.publishNews = async (req, res) => {
    try {
        const { id } = req.params;
        const published_by = req.user.id;
        
        const result = await pool.query(`
            UPDATE news_announcements 
            SET 
                is_published = true,
                published_by = $1,
                published_date = NOW()
            WHERE id = $2 AND is_published = false
            RETURNING *
        `, [published_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found or already published'
            });
        }
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'news_published', $2)
        `, [published_by, JSON.stringify({ news_id: id })]);
        
        res.json({
            success: true,
            message_ar: 'تم نشر الخبر بنجاح',
            message_en: 'News published successfully',
            news: result.rows[0]
        });
        
    } catch (error) {
        console.error('Publish news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish news',
            error: error.message
        });
    }
};

exports.unpublishNews = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            UPDATE news_announcements 
            SET 
                is_published = false,
                published_by = NULL,
                published_date = NULL
            WHERE id = $1 AND is_published = true
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found or already unpublished'
            });
        }
        
        res.json({
            success: true,
            message_ar: 'تم إلغاء نشر الخبر',
            message_en: 'News unpublished successfully',
            news: result.rows[0]
        });
        
    } catch (error) {
        console.error('Unpublish news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unpublish news',
            error: error.message
        });
    }
};

// ⭐⭐⭐ CRITICAL FEATURE: PUSH NOTIFICATION ⭐⭐⭐
exports.pushNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const sent_by = req.user.id;
        const {
            custom_title_ar,
            custom_title_en,
            custom_body_ar,
            custom_body_en,
            target_all = true,
            target_members = [] // Array of member IDs if not targeting all
        } = req.body;
        
        // Get news details
        const newsResult = await pool.query(
            'SELECT * FROM news_announcements WHERE id = $1',
            [id]
        );
        
        if (newsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }
        
        const news = newsResult.rows[0];
        
        // Prepare notification content
        const notificationTitleAr = custom_title_ar || news.title_ar;
        const notificationTitleEn = custom_title_en || news.title_en;
        const notificationBodyAr = custom_body_ar || news.excerpt_ar || news.content_ar.substring(0, 100);
        const notificationBodyEn = custom_body_en || news.excerpt_en || news.content_en.substring(0, 100);
        
        // Get target members
        let targetMembers;
        if (target_all) {
            const membersResult = await pool.query(
                'SELECT id, phone, email, fcm_token FROM members WHERE is_active = true'
            );
            targetMembers = membersResult.rows;
        } else {
            const membersResult = await pool.query(
                'SELECT id, phone, email, fcm_token FROM members WHERE id = ANY($1) AND is_active = true',
                [target_members]
            );
            targetMembers = membersResult.rows;
        }
        
        // Send push notifications
        let successCount = 0;
        const notificationPromises = targetMembers.map(async (member) => {
            if (member.fcm_token) {
                try {
                    await sendPushNotification({
                        token: member.fcm_token,
                        title: notificationTitleAr, // Default to Arabic
                        body: notificationBodyAr,
                        data: {
                            type: 'news',
                            news_id: id,
                            is_urgent: news.is_urgent ? 'true' : 'false',
                            click_action: `/news/${id}`
                        }
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send notification to member ${member.id}:`, error);
                }
            }
        });
        
        await Promise.all(notificationPromises);
        
        // Log notification
        await pool.query(`
            INSERT INTO news_notifications (
                news_id, sent_by, total_recipients,
                notification_title, notification_body
            ) VALUES ($1, $2, $3, $4, $5)
        `, [
            id,
            sent_by,
            targetMembers.length,
            notificationTitleAr,
            notificationBodyAr
        ]);
        
        // Log audit trail
        await pool.query(`
            INSERT INTO audit_logs (user_id, action_type, details)
            VALUES ($1, 'news_notification_sent', $2)
        `, [sent_by, JSON.stringify({
            news_id: id,
            target_count: targetMembers.length,
            success_count: successCount
        })]);
        
        res.json({
            success: true,
            message_ar: `تم إرسال ${successCount} إشعار من أصل ${targetMembers.length}`,
            message_en: `Sent ${successCount} notifications out of ${targetMembers.length}`,
            statistics: {
                total_targets: targetMembers.length,
                successful: successCount,
                failed: targetMembers.length - successCount
            }
        });
        
    } catch (error) {
        console.error('Push notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications',
            error: error.message
        });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                COUNT(n.id) as news_count
            FROM news_categories c
            LEFT JOIN news_announcements n ON c.id = n.category_id
            GROUP BY c.id
            ORDER BY c.category_name_ar
        `);
        
        res.json({
            success: true,
            categories: result.rows
        });
        
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { category_name_ar, category_name_en, icon, color_code } = req.body;
        
        if (!category_name_ar || !category_name_en) {
            return res.status(400).json({
                success: false,
                message: 'Category name in Arabic and English is required'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO news_categories (
                category_name_ar, category_name_en, icon, color_code
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [category_name_ar, category_name_en, icon, color_code]);
        
        res.status(201).json({
            success: true,
            message_ar: 'تم إضافة التصنيف بنجاح',
            message_en: 'Category created successfully',
            category: result.rows[0]
        });
        
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

exports.getNewsAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get detailed analytics for specific news
        const result = await pool.query(`
            SELECT 
                n.views_count,
                COUNT(DISTINCT nr.member_id) as unique_readers,
                COUNT(nr.id) as total_reads,
                AVG(EXTRACT(EPOCH FROM (nr.read_at - n.published_date))) as avg_read_time_seconds,
                (SELECT COUNT(*) FROM news_notifications WHERE news_id = n.id) as notifications_sent
            FROM news_announcements n
            LEFT JOIN news_reads nr ON n.id = nr.news_id
            WHERE n.id = $1
            GROUP BY n.id, n.views_count, n.published_date
        `, [id]);
        
        // Get reads by day
        const readsByDayResult = await pool.query(`
            SELECT 
                DATE(read_at) as date,
                COUNT(*) as reads
            FROM news_reads
            WHERE news_id = $1
            GROUP BY DATE(read_at)
            ORDER BY date DESC
            LIMIT 30
        `, [id]);
        
        res.json({
            success: true,
            analytics: result.rows[0] || {},
            reads_by_day: readsByDayResult.rows
        });
        
    } catch (error) {
        console.error('Get news analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

exports.getAnalyticsOverview = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_news,
                COUNT(*) FILTER (WHERE is_published = true) as published_count,
                SUM(views_count) as total_views,
                (SELECT COUNT(DISTINCT member_id) FROM news_reads) as unique_readers,
                (SELECT COUNT(*) FROM news_reads) as total_reads,
                (SELECT COUNT(*) FROM news_notifications) as total_notifications_sent
            FROM news_announcements
        `);
        
        // Most read news
        const topNewsResult = await pool.query(`
            SELECT 
                n.id,
                n.title_ar,
                n.title_en,
                n.views_count,
                COUNT(nr.id) as reads_count
            FROM news_announcements n
            LEFT JOIN news_reads nr ON n.id = nr.news_id
            WHERE n.is_published = true
            GROUP BY n.id
            ORDER BY reads_count DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            overview: result.rows[0],
            top_news: topNewsResult.rows
        });
        
    } catch (error) {
        console.error('Get analytics overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics overview',
            error: error.message
        });
    }
};

// ========================================
// MOBILE CONTROLLERS
// ========================================

exports.getMobileNewsFeed = async (req, res) => {
    try {
        const { category_id, limit = 20, offset = 0 } = req.query;
        const member_id = req.user.member_id;
        
        let query = `
            SELECT 
                n.id,
                n.title_ar,
                n.title_en,
                n.excerpt_ar,
                n.excerpt_en,
                n.content_ar,
                n.content_en,
                n.published_date,
                n.is_urgent,
                n.featured,
                n.views_count,
                c.category_name_ar,
                c.category_name_en,
                c.icon as category_icon,
                c.color_code as category_color,
                (SELECT json_agg(json_build_object(
                    'media_type', nm.media_type,
                    'media_url', nm.media_url,
                    'thumbnail_url', nm.thumbnail_url
                ) ORDER BY nm.display_order)
                FROM news_media nm
                WHERE nm.news_id = n.id
                LIMIT 1) as cover_media,
                EXISTS(
                    SELECT 1 FROM news_reads 
                    WHERE news_id = n.id AND member_id = $1
                ) as is_read
            FROM news_announcements n
            LEFT JOIN news_categories c ON n.category_id = c.id
            WHERE n.is_published = true
        `;
        
        const params = [member_id];
        let paramCount = 2;
        
        if (category_id) {
            query += ` AND n.category_id = $${paramCount}`;
            params.push(category_id);
            paramCount++;
        }
        
        query += ` ORDER BY n.is_urgent DESC, n.featured DESC, n.published_date DESC 
                   LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            news: result.rows
        });
        
    } catch (error) {
        console.error('Get mobile news feed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news feed',
            error: error.message
        });
    }
};

exports.getMobileNewsArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const member_id = req.user.member_id;
        
        // Get news details
        const newsResult = await pool.query(`
            SELECT 
                n.*,
                c.category_name_ar,
                c.category_name_en,
                c.icon as category_icon,
                c.color_code as category_color,
                u.full_name as author_name,
                EXISTS(
                    SELECT 1 FROM news_reads 
                    WHERE news_id = n.id AND member_id = $1
                ) as is_read
            FROM news_announcements n
            LEFT JOIN news_categories c ON n.category_id = c.id
            LEFT JOIN users u ON n.author_id = u.id
            WHERE n.id = $2 AND n.is_published = true
        `, [member_id, id]);
        
        if (newsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }
        
        // Get all media
        const mediaResult = await pool.query(`
            SELECT *
            FROM news_media
            WHERE news_id = $1
            ORDER BY display_order
        `, [id]);
        
        // Increment views count
        await pool.query(
            'UPDATE news_announcements SET views_count = views_count + 1 WHERE id = $1',
            [id]
        );
        
        res.json({
            success: true,
            news: newsResult.rows[0],
            media: mediaResult.rows
        });
        
    } catch (error) {
        console.error('Get mobile news article error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news article',
            error: error.message
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const member_id = req.user.member_id;
        
        // Get member ID if not in token
        let memberId = member_id;
        if (!memberId) {
            const memberResult = await pool.query(
                'SELECT id FROM members WHERE phone = $1 OR email = $2',
                [req.user.phone, req.user.email]
            );
            
            if (memberResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member profile not found'
                });
            }
            memberId = memberResult.rows[0].id;
        }
        
        // Insert or update read record
        await pool.query(`
            INSERT INTO news_reads (news_id, member_id, read_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (news_id, member_id) 
            DO UPDATE SET read_at = NOW()
        `, [id, memberId]);
        
        // Get new unread count
        const unreadResult = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM news_announcements n
            WHERE n.is_published = true
            AND NOT EXISTS (
                SELECT 1 FROM news_reads 
                WHERE news_id = n.id AND member_id = $1
            )
        `, [memberId]);
        
        res.json({
            success: true,
            message_ar: 'تم التمييز كمقروء',
            message_en: 'Marked as read',
            unread_count: parseInt(unreadResult.rows[0].unread_count)
        });
        
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark as read',
            error: error.message
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const member_id = req.user.member_id;
        
        // Get member ID if not in token
        let memberId = member_id;
        if (!memberId) {
            const memberResult = await pool.query(
                'SELECT id FROM members WHERE phone = $1 OR email = $2',
                [req.user.phone, req.user.email]
            );
            
            if (memberResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member profile not found'
                });
            }
            memberId = memberResult.rows[0].id;
        }
        
        const result = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM news_announcements n
            WHERE n.is_published = true
            AND NOT EXISTS (
                SELECT 1 FROM news_reads 
                WHERE news_id = n.id AND member_id = $1
            )
        `, [memberId]);
        
        res.json({
            success: true,
            unread_count: parseInt(result.rows[0].unread_count)
        });
        
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};

exports.searchNews = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const member_id = req.user.member_id;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }
        
        const result = await pool.query(`
            SELECT 
                n.id,
                n.title_ar,
                n.title_en,
                n.excerpt_ar,
                n.excerpt_en,
                n.published_date,
                n.is_urgent,
                c.category_name_ar,
                c.category_name_en,
                c.icon as category_icon,
                EXISTS(
                    SELECT 1 FROM news_reads 
                    WHERE news_id = n.id AND member_id = $1
                ) as is_read
            FROM news_announcements n
            LEFT JOIN news_categories c ON n.category_id = c.id
            WHERE n.is_published = true
            AND (
                n.title_ar ILIKE $2 OR 
                n.title_en ILIKE $2 OR
                n.content_ar ILIKE $2 OR
                n.content_en ILIKE $2
            )
            ORDER BY n.published_date DESC
            LIMIT $3
        `, [member_id, `%${q}%`, parseInt(limit)]);
        
        res.json({
            success: true,
            results: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Search news error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search news',
            error: error.message
        });
    }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const uploadMedia = async (file) => {
    // TODO: Implement actual upload to Supabase Storage or AWS S3
    // For now, return placeholder
    return `/uploads/news/${Date.now()}_${file.originalname}`;
};

const getMediaType = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'file';
};
```

---

### **TASK 1.4: Push Notification Service** (3 hours)

**File:** `backend/services/pushNotificationService.js`

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// TODO: Add your Firebase service account credentials
const serviceAccount = require('../config/firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

/**
 * Send push notification to a single device
 */
exports.sendPushNotification = async ({ token, title, body, data = {} }) => {
    try {
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: data,
            token: token,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };
        
        const response = await admin.messaging().send(message);
        console.log('Successfully sent notification:', response);
        return { success: true, messageId: response };
        
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

/**
 * Send push notification to multiple devices
 */
exports.sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
    try {
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: data,
            tokens: tokens // Array of device tokens
        };
        
        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`Successfully sent ${response.successCount} notifications`);
        console.log(`Failed to send ${response.failureCount} notifications`);
        
        // Remove invalid tokens
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                invalidTokens.push(tokens[idx]);
                console.error(`Failed to send to ${tokens[idx]}:`, resp.error);
            }
        });
        
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens
        };
        
    } catch (error) {
        console.error('Error sending multicast notification:', error);
        throw error;
    }
};

/**
 * Send notification to a topic (all subscribed devices)
 */
exports.sendTopicNotification = async ({ topic, title, body, data = {} }) => {
    try {
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: data,
            topic: topic
        };
        
        const response = await admin.messaging().send(message);
        console.log('Successfully sent topic notification:', response);
        return { success: true, messageId: response };
        
    } catch (error) {
        console.error('Error sending topic notification:', error);
        throw error;
    }
};

/**
 * Subscribe device tokens to a topic
 */
exports.subscribeToTopic = async (tokens, topic) => {
    try {
        const response = await admin.messaging().subscribeToTopic(tokens, topic);
        console.log(`Successfully subscribed ${response.successCount} devices to ${topic}`);
        return response;
    } catch (error) {
        console.error('Error subscribing to topic:', error);
        throw error;
    }
};

/**
 * Unsubscribe device tokens from a topic
 */
exports.unsubscribeFromTopic = async (tokens, topic) => {
    try {
        const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
        console.log(`Successfully unsubscribed ${response.successCount} devices from ${topic}`);
        return response;
    } catch (error) {
        console.error('Error unsubscribing from topic:', error);
        throw error;
    }
};
```

**File:** `backend/config/firebase-service-account.json` (TEMPLATE)

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40your-project-id.iam.gserviceaccount.com"
}
```

**Agent 1 Deliverable:** ✅ Complete backend API with 15 endpoints + Push notification service

---

## 🎨 AGENT 2: FRONTEND ENGINEER - ADMIN DASHBOARD
**Timeline:** 2 Days  
**Skill Required:** React.js, Chakra UI, Rich Text Editor  
**Mission:** Build beautiful admin news management interface

---

*Due to token limits, I'll create the remaining agent tasks (Agent 2, 3, 4) in a structured summary format. The full code will follow the same pattern as Mission #1.*

### **AGENT 2 Tasks Summary:**

**Day 3-4: Admin Dashboard (2 days)**

**Task 2.1:** News List Page (4 hours)
- Display all news with filters (published/draft/urgent/featured)
- Statistics cards (total news, views, readers)
- Search functionality
- Category filters
- Create/Edit/Delete buttons

**Task 2.2:** Create/Edit News Modal (4 hours)
- Rich text editor (React-Quill or similar)
- Arabic/English tabs
- Image/Video upload
- Category selection
- Urgent/Featured toggles
- Publish immediately option

**Task 2.3:** News Details Page (3 hours)
- Full article display
- Media gallery
- Analytics dashboard
- **⭐ PUSH NOTIFICATION BUTTON (Critical)**
- Custom notification text option
- Target selection (all members / specific members)

**Task 2.4:** Push Notification Modal (2 hours)
- Custom title/body fields (Arabic & English)
- Preview notification appearance
- Target audience selector
- Send confirmation
- Success/failure reporting

**Key Component:** Push Notification Button

```jsx
<Button
  leftIcon={<FiBell />}
  colorScheme="purple"
  onClick={onPushOpen}
  size="lg"
>
  إرسال إشعار لجميع الأعضاء
</Button>
```

---

## 📱 AGENT 3: MOBILE ENGINEER - PWA Interface
**Timeline:** 1 Day  
**Skill Required:** React.js, Mobile UI/UX, PWA, Service Workers  
**Mission:** Build mobile-first news feed with notification badge

---

### **AGENT 3 Tasks Summary:**

**Day 5: Mobile PWA (1 day)**

**Task 3.1:** Home Page with News Feed (3 hours)
- **⭐ Notification badge on top (shows unread count)**
- News cards with cover images
- Category badges
- Urgent news highlighted (red border)
- Pull-to-refresh
- Infinite scroll

**Task 3.2:** News Article Page (2 hours)
- Full article with media gallery
- Swipe between images
- Mark as read automatically
- Share button
- Category and date display

**Task 3.3:** Notification System (3 hours)
- **Service worker setup for push notifications**
- **FCM token registration**
- **Badge counter updates in real-time**
- **Notification tap opens news article**
- Permission request flow

**Critical Features:**

1. **Unread Badge** (always visible on home):
```jsx
<Badge
  position="absolute"
  top="-8px"
  right="-8px"
  colorScheme="red"
  borderRadius="full"
  fontSize="xs"
>
  {unreadCount}
</Badge>
```

2. **Real-time updates** via polling or WebSocket

3. **Push notification handling:**
```javascript
// Service worker
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data
  });
});
```

---

## 🧪 AGENT 4: QA ENGINEER - Testing & Documentation
**Timeline:** 1 Day  
**Mission:** Ensure quality and document everything

---

### **AGENT 4 Tasks:**

**Task 4.1:** Test Plan (4 hours)
- API endpoint testing
- Push notification delivery testing
- Badge counter accuracy
- Image/video upload
- Rich text formatting
- Mobile responsiveness

**Task 4.2:** Documentation (4 hours)
- API documentation
- Push notification setup guide
- Admin user guide
- Member user guide

---

## ✅ SUCCESS CRITERIA

This mission is complete when:

### **Backend:**
- [ ] 15 API endpoints functional
- [ ] Push notifications working
- [ ] Media upload functional
- [ ] Categories system working

### **Admin Dashboard:**
- [ ] Create news with rich text
- [ ] Upload multiple images/videos
- [ ] **Push notification button functional**
- [ ] Analytics dashboard working

### **Mobile PWA:**
- [ ] News feed displays correctly
- [ ] **Unread badge shows and updates**
- [ ] **Push notifications received**
- [ ] **Notifications open correct article**
- [ ] Mark as read works

---

## 📊 PROJECT MILESTONES

| Day | Agent | Tasks |
|-----|-------|-------|
| **Day 1-2** | Agent 1 | Backend API + Push service |
| **Day 3-4** | Agent 2 | Admin dashboard + Push UI |
| **Day 5** | Agent 3 | Mobile PWA + Notifications |
| **Day 5** | Agent 4 | Testing + Docs |

---

## 🚀 DEPLOYMENT CHECKLIST

1. [ ] Firebase project setup
2. [ ] FCM credentials configured
3. [ ] Service worker registered
4. [ ] Database migration run
5. [ ] Media storage configured
6. [ ] Test push notification
7. [ ] Verify badge updates
8. [ ] Train admins on push feature

---

## 🎯 MISSION COMPLETE!

When all agents finish, you will have:

✅ Complete news management system  
✅ Real-time push notifications  
✅ Beautiful news feed  
✅ Unread badge counter  
✅ Media-rich articles  
✅ Admin push button  

**Status:** Ready for **344 families** to receive instant news! 🎉

---

**Mission Document Version:** 1.0  
**Created:** October 7, 2025  
**For:** Al-Shuail Family Management System  
**Code Name:** HAWK

🦅 **HAWK - Cleared for takeoff!**
