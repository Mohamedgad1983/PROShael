// ============================================
// NEWS & NOTIFICATIONS API - COMPLETE IMPLEMENTATION
// File: backend/routes/news.js
// Purpose: News broadcasting with push notifications
// ============================================

import express from 'express';
import { query } from '../services/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { log } from '../utils/logger.js';

const router = express.Router();

// Helper function to check if user is admin
const isAdmin = async (userId) => {
    try {
        const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        return user?.role === 'admin' || user?.role === 'super_admin';
    } catch (error) {
        log.error('Error checking admin status', { error: error.message });
        return false;
    }
};

// Admin middleware
const adminOnly = async (req, res, next) => {
    const userId = req.user?.id;
    log.info('[adminOnly] Checking admin for user', { userId });

    if (!userId) {
        log.info('[adminOnly] No userId - Unauthorized');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await isAdmin(userId);
    log.info('[adminOnly] isAdmin result', { admin, userId });

    if (!admin) {
        log.info('[adminOnly] User is not admin - Forbidden', { userId });
        return res.status(403).json({ error: 'Admin access required' });
    }

    log.info('[adminOnly] Admin check passed, calling next', { userId });
    next();
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'news');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload configuration (for images/videos)
const storage = multer.diskStorage({
    destination: './uploads/news/',
    filename: (req, file, cb) => {
        cb(null, `news-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and videos allowed'));
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// 1. CREATE NEWS POST (Admin Only)
router.post('/', authenticateToken, adminOnly, upload.array('media', 10), async (req, res) => {
    try {
        const {
            category,
            priority,
            title_ar,
            title_en,
            content_ar,
            content_en,
            is_published,
            scheduled_for
        } = req.body;

        // Validation
        if (!title_ar || !content_ar) {
            return res.status(400).json({ error: 'Arabic title and content required' });
        }

        // Handle uploaded files
        const media_urls = req.files ? req.files.map(file => ({
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: `/uploads/news/${file.filename}`,
            filename: file.filename,
            size: file.size
        })) : [];

        // Prepare news data
        const publishedValue = is_published === 'true' || is_published === true;
        const publishDate = publishedValue ? new Date().toISOString() : null;
        const statusValue = publishedValue ? 'published' : 'draft';

        const result = await query(
            `INSERT INTO news_announcements
            (category, priority, title, content, title_ar, title_en, content_ar, content_en,
             author_id, media_urls, is_published, publish_date, scheduled_for, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                category || 'general',
                priority || 'normal',
                title_ar || title_en || 'Untitled',
                content_ar || content_en || '',
                title_ar,
                title_en,
                content_ar,
                content_en,
                req.user.id,
                JSON.stringify(media_urls),
                publishedValue,
                publishDate,
                scheduled_for || null,
                statusValue
            ]
        );

        res.status(201).json({
            message: 'News post created successfully',
            news: result.rows[0]
        });
    } catch (error) {
        log.error('Create news error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 2. UPDATE NEWS POST (Admin Only)
router.put('/:id', authenticateToken, adminOnly, upload.array('media', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Handle new media uploads
        let mediaUrlsValue = null;
        if (req.files && req.files.length > 0) {
            const new_media = req.files.map(file => ({
                type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                url: `/uploads/news/${file.filename}`,
                filename: file.filename,
                size: file.size
            }));

            // Get existing media
            const existingResult = await query(
                'SELECT media_urls FROM news_announcements WHERE id = $1',
                [id]
            );

            if (existingResult.rows.length > 0) {
                const existing_media = existingResult.rows[0].media_urls || [];
                mediaUrlsValue = JSON.stringify([...existing_media, ...new_media]);
            } else {
                mediaUrlsValue = JSON.stringify(new_media);
            }
        }

        // Remove fields that don't exist in database
        delete updates.images;
        delete updates.publish_date;

        log.info('[UPDATE NEWS] Updating news ID', { id });
        log.info('[UPDATE NEWS] Updates', { updates });

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        // Add media_urls if we have new files
        if (mediaUrlsValue !== null) {
            updateFields.push(`media_urls = $${paramIndex}`);
            updateValues.push(mediaUrlsValue);
            paramIndex++;
        }

        // Add other update fields
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'created_at' && key !== 'media_urls') {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        }

        // Add the id as the last parameter
        updateValues.push(id);

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updateQuery = `
            UPDATE news_announcements
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            log.error('[UPDATE NEWS] No news found with ID', { id });
            return res.status(404).json({ error: 'News not found' });
        }

        log.info('[UPDATE NEWS] Success! Updated', { newsId: result.rows[0].id });

        res.json({
            message: 'News post updated successfully',
            news: result.rows[0]
        });
    } catch (error) {
        log.error('[UPDATE NEWS] Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 3. DELETE NEWS POST (Admin Only - Hard Delete since table doesn't have deleted_at)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        await query('DELETE FROM news_announcements WHERE id = $1', [id]);

        res.json({ message: 'News post deleted successfully' });
    } catch (error) {
        log.error('DELETE news error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 4. GET ALL NEWS (Admin - including unpublished)
router.get('/admin/all', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { category, published } = req.query;

        let sqlQuery = `
            SELECT
                n.*,
                json_build_object('id', u.id, 'email', u.email) as author
            FROM news_announcements n
            LEFT JOIN users u ON n.author_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (category && category !== 'all') {
            sqlQuery += ` AND n.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (published) {
            sqlQuery += ` AND n.is_published = $${paramIndex}`;
            params.push(published === 'true');
            paramIndex++;
        }

        sqlQuery += ' ORDER BY n.created_at DESC';

        const result = await query(sqlQuery, params);

        res.json({ news: result.rows });
    } catch (error) {
        log.error('GET /admin/all error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 5. 🚨 PUSH NOTIFICATION BUTTON - Send notification to ALL members
router.post('/:id/push-notification', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { custom_message: _custom_message } = req.body; // Optional custom notification text

        log.info('[Push Notification] Starting for news ID', { id });

        // Get news post
        const newsResult = await query(
            'SELECT * FROM news_announcements WHERE id = $1',
            [id]
        );

        if (newsResult.rows.length === 0) {
            log.error('[Push Notification] News not found', { id });
            return res.status(404).json({ error: 'News not found' });
        }

        const news = newsResult.rows[0];

        if (!news.is_published) {
            log.info('[Push Notification] News not published');
            return res.status(400).json({
                error: 'Cannot send notification for unpublished news',
                errorAr: 'لا يمكن إرسال إشعار لخبر غير منشور'
            });
        }

        // Get all members from members table (not users table)
        const membersResult = await query(
            `SELECT id, member_id, email, phone, full_name
             FROM members
             WHERE is_active = true AND membership_status = 'active'`
        );

        const members = membersResult.rows;

        log.info('[Push Notification] Found active members', { count: members.length });

        // Create ONE notification for admin to track this broadcast
        const adminNotification = {
            user_id: req.user.id,  // Admin who sent the notification
            type: 'news_broadcast',
            priority: news.priority || 'normal',
            title: `تم إرسال إشعار لـ ${members.length} عضو`,
            title_ar: `تم إرسال إشعار لـ ${members.length} عضو`,
            message: `تم إرسال إشعار بالخبر "${news.title_ar || news.title}" إلى ${members.length} عضو من أعضاء العائلة`,
            message_ar: `تم إرسال إشعار بالخبر "${news.title_ar || news.title}" إلى ${members.length} عضو من أعضاء العائلة`,
            related_id: news.id,
            related_type: 'news',
            icon: '📢',
            action_url: `/admin/news`,
            is_read: false,
            metadata: JSON.stringify({
                broadcast_to: members.length,
                member_ids: members.map(m => m.id),
                news_title: news.title_ar || news.title
            })
        };

        await query(
            `INSERT INTO notifications
            (user_id, type, priority, title, title_ar, message, message_ar,
             related_id, related_type, icon, action_url, is_read, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                adminNotification.user_id,
                adminNotification.type,
                adminNotification.priority,
                adminNotification.title,
                adminNotification.title_ar,
                adminNotification.message,
                adminNotification.message_ar,
                adminNotification.related_id,
                adminNotification.related_type,
                adminNotification.icon,
                adminNotification.action_url,
                adminNotification.is_read,
                adminNotification.metadata
            ]
        );

        log.info('[Push Notification] Broadcast notification sent to members', { count: members.length });

        // 🔥 Send actual push notifications to devices (if configured)
        const devicesSent = await sendPushNotifications(members, news);

        res.json({
            success: true,
            message: `إشعار تم إرساله إلى ${members.length} عضو بنجاح!`,
            messageEn: `Notification sent to ${members.length} members successfully!`,
            recipient_count: members.length,
            devices_sent: devicesSent
        });
    } catch (error) {
        log.error('[Push Notification] Error', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
            errorAr: 'خطأ في إرسال الإشعارات'
        });
    }
});

// 5.1 GET MEMBER COUNT FOR NOTIFICATIONS (Admin)
router.get('/notification/member-count', authenticateToken, adminOnly, async (req, res) => {
    try {
        log.info('[Member Count] Fetching active member count');

        // Get all active members
        const result = await query(
            `SELECT COUNT(*) as count FROM members
             WHERE is_active = true AND membership_status = 'active'`
        );

        const count = parseInt(result.rows[0].count);

        log.info('[Member Count] Found active members', { count });

        res.json({
            success: true,
            count: count || 0,
            message: `${count} عضو نشط`,
            messageEn: `${count} active members`
        });
    } catch (error) {
        log.error('[Member Count] Error', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
            errorAr: 'خطأ في جلب عدد الأعضاء',
            count: 0
        });
    }
});

// 5b. GET ACTIVE MEMBERS COUNT (Simpler endpoint for UI)
router.get('/active-members-count', authenticateToken, adminOnly, async (req, res) => {
    try {
        log.info('[Active Members Count] Fetching count');

        // Get count of active members
        const result = await query(
            `SELECT COUNT(*) as count FROM members
             WHERE is_active = true AND membership_status = 'active'`
        );

        const count = parseInt(result.rows[0].count);

        log.info('[Active Members Count] Found active members', { count });

        res.json({
            count: count || 0,
            message: `${count} عضو نشط`
        });
    } catch (error) {
        log.error('[Active Members Count] Error', { error: error.message });
        res.status(500).json({
            error: error.message,
            errorAr: 'خطأ في جلب عدد الأعضاء',
            count: 0
        });
    }
});

// 6. GET NEWS STATISTICS (Admin)
router.get('/:id/stats', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        // Get news
        const newsResult = await query(
            'SELECT * FROM news_announcements WHERE id = $1',
            [id]
        );

        if (newsResult.rows.length === 0) {
            return res.status(404).json({ error: 'News not found' });
        }

        const news = newsResult.rows[0];

        // Get notification stats
        const notifStatsResult = await query(
            `SELECT is_read FROM notifications
             WHERE related_id = $1 AND related_type = 'news'`,
            [id]
        );

        const notifStats = notifStatsResult.rows;
        const totalNotifications = notifStats.length;
        const readNotifications = notifStats.filter(n => n.is_read).length;
        const readPercentage = totalNotifications > 0
            ? ((readNotifications / totalNotifications) * 100).toFixed(2)
            : 0;

        // Get reactions count
        const reactionsResult = await query(
            'SELECT reaction_type FROM news_reactions WHERE news_id = $1',
            [id]
        );

        const reactions = reactionsResult.rows;
        const reactionCounts = reactions.reduce((acc, r) => {
            acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            news,
            stats: {
                views: news.views_count,
                notificationsSent: totalNotifications,
                notificationsRead: readNotifications,
                readPercentage,
                reactions: reactionCounts,
                totalReactions: reactions.length
            }
        });
    } catch (error) {
        log.error('GET /:id/stats error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEMBER ENDPOINTS (Mobile App)
// ============================================

// 7. GET PUBLISHED NEWS (Members)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { category, limit } = req.query;

        let sqlQuery = `
            SELECT * FROM news_announcements
            WHERE is_published = true AND deleted_at IS NULL
        `;
        const params = [];
        let paramIndex = 1;

        if (category && category !== 'all') {
            sqlQuery += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        sqlQuery += ' ORDER BY published_at DESC';

        if (limit) {
            sqlQuery += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
        }

        const result = await query(sqlQuery, params);

        res.json({ news: result.rows });
    } catch (error) {
        log.error('GET / error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 8. GET SINGLE NEWS POST (Members)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        try {
            const rpcResult = await query('SELECT increment_news_views($1) as result', [id]);
            if (!rpcResult.rows[0]) {
                // If RPC doesn't exist, update directly
                await query(
                    'UPDATE news_announcements SET views_count = views_count + 1 WHERE id = $1',
                    [id]
                );
            }
        } catch (e) {
            // Fallback to direct update if RPC fails
            await query(
                'UPDATE news_announcements SET views_count = views_count + 1 WHERE id = $1',
                [id]
            );
        }

        // Get news with reactions
        const newsResult = await query(
            `SELECT
                n.*,
                COALESCE(
                    json_agg(
                        json_build_object('reaction_type', nr.reaction_type)
                    ) FILTER (WHERE nr.reaction_type IS NOT NULL),
                    '[]'
                ) as reactions
             FROM news_announcements n
             LEFT JOIN news_reactions nr ON n.id = nr.news_id
             WHERE n.id = $1 AND n.is_published = true
             GROUP BY n.id`,
            [id]
        );

        if (newsResult.rows.length === 0) {
            return res.status(404).json({ error: 'News not found' });
        }

        const news = newsResult.rows[0];

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        // Mark notification as read
        if (userResult.rows.length > 0 && userResult.rows[0].member_id) {
            await query(
                `UPDATE notifications
                 SET is_read = true, read_at = $1
                 WHERE related_id = $2
                   AND member_id = $3
                   AND related_type = 'news'
                   AND read_at IS NULL`,
                [new Date(), id, userResult.rows[0].member_id]
            );
        }

        res.json({ news });
    } catch (error) {
        log.error('GET /:id error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 9. REACT TO NEWS (Members - Optional)
router.post('/:id/react', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reaction_type } = req.body; // like, love, celebrate, support

        const validReactions = ['like', 'love', 'celebrate', 'support'];
        if (!validReactions.includes(reaction_type)) {
            return res.status(400).json({ error: 'Invalid reaction type' });
        }

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const member_id = userResult.rows[0].member_id;

        // Upsert reaction
        await query(
            `INSERT INTO news_reactions (news_id, member_id, reaction_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (news_id, member_id)
             DO UPDATE SET reaction_type = $3`,
            [id, member_id, reaction_type]
        );

        res.json({ message: 'Reaction saved successfully' });
    } catch (error) {
        log.error('POST /:id/react error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 10. GET MY NOTIFICATIONS (Members)
router.get('/notifications/my', authenticateToken, async (req, res) => {
    try {
        const { unread_only } = req.query;

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const member_id = userResult.rows[0].member_id;

        let sqlQuery = `
            SELECT * FROM notifications
            WHERE member_id = $1
        `;
        const params = [member_id];

        if (unread_only === 'true') {
            sqlQuery += ' AND is_read = false';
        }

        sqlQuery += ' ORDER BY created_at DESC LIMIT 50';

        const result = await query(sqlQuery, params);

        res.json({ notifications: result.rows });
    } catch (error) {
        log.error('GET /notifications/my error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 11. MARK NOTIFICATION AS READ (Members)
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const member_id = userResult.rows[0].member_id;

        await query(
            `UPDATE notifications
             SET is_read = true, read_at = $1
             WHERE id = $2 AND member_id = $3`,
            [new Date(), id, member_id]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        log.error('PATCH /notifications/:id/read error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 12. MARK ALL NOTIFICATIONS AS READ (Members)
router.patch('/notifications/mark-all-read', authenticateToken, async (req, res) => {
    try {
        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const member_id = userResult.rows[0].member_id;

        await query(
            `UPDATE notifications
             SET is_read = true, read_at = $1
             WHERE member_id = $2 AND is_read = false`,
            [new Date(), member_id]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        log.error('PATCH /notifications/mark-all-read error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 13. GET UNREAD COUNT (Members)
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].member_id) {
            return res.json({ unread_count: 0 });
        }

        const member_id = userResult.rows[0].member_id;

        // Try RPC first
        try {
            const rpcResult = await query(
                'SELECT get_unread_count($1) as count',
                [member_id]
            );

            if (rpcResult.rows.length > 0) {
                return res.json({ unread_count: rpcResult.rows[0].count });
            }
        } catch (e) {
            // Fallback to direct query
        }

        // Fallback: Direct query
        const result = await query(
            `SELECT COUNT(*) as count FROM notifications
             WHERE member_id = $1 AND is_read = false`,
            [member_id]
        );

        res.json({ unread_count: parseInt(result.rows[0].count) });
    } catch (error) {
        log.error('GET /notifications/unread-count error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 14. REGISTER PUSH NOTIFICATION TOKEN (Members - for real push)
router.post('/notifications/register-device', authenticateToken, async (req, res) => {
    try {
        const { device_token, device_type } = req.body;

        if (!device_token) {
            return res.status(400).json({ error: 'Device token required' });
        }

        // Get user's member_id
        const userResult = await query(
            'SELECT member_id FROM users WHERE id = $1',
            [req.user.id]
        );

        const member_id = userResult.rows.length > 0 ? userResult.rows[0].member_id : null;

        await query(
            `INSERT INTO push_notification_tokens
             (user_id, member_id, device_token, device_type, is_active, last_used_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, device_token)
             DO UPDATE SET
                device_type = $4,
                is_active = $5,
                last_used_at = $6`,
            [
                req.user.id,
                member_id,
                device_token,
                device_type || 'web',
                true,
                new Date()
            ]
        );

        res.json({ message: 'Device registered for push notifications' });
    } catch (error) {
        log.error('POST /notifications/register-device error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HELPER FUNCTION: Send actual push notifications
// ============================================
async function sendPushNotifications(members, _news) {
    // TODO: Implement Firebase Cloud Messaging (FCM) integration
    // This is where you'd send actual push notifications to devices

    try {
        // Get device tokens for all members
        const memberIds = members.map(m => m.id);
        const tokensResult = await query(
            `SELECT device_token, device_type
             FROM push_notification_tokens
             WHERE member_id = ANY($1) AND is_active = true`,
            [memberIds]
        );

        const tokens = tokensResult.rows;

        if (!tokens || tokens.length === 0) {
            log.info('No device tokens found for push notifications');
            return 0;
        }

        // Example FCM integration (uncomment when you set up Firebase)
        /*
        const admin = require('firebase-admin');

        const message = {
            notification: {
                title: news.title_ar,
                body: 'خبر جديد من عائلة الشعيل',
            },
            data: {
                news_id: news.id,
                action_url: `/news/${news.id}`,
                type: 'news'
            }
        };

        const response = await admin.messaging().sendMulticast({
            tokens: tokens.map(t => t.device_token),
            ...message
        });

        log.info('Push notifications sent', { successful: response.successCount, failed: response.failureCount });
        */

        log.info('Would send push to devices', { tokenCount: tokens.length });
        return tokens.length;
    } catch (error) {
        log.error('Push notification sending error', { error: error.message });
        return 0;
    }
}

export default router;
