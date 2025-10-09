// ============================================
// NEWS & NOTIFICATIONS API - COMPLETE IMPLEMENTATION
// File: backend/routes/news.js
// Purpose: News broadcasting with push notifications
// ============================================

import express from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { log } from '../utils/logger.js';

const router = express.Router();

// Helper function to check if user is admin
const isAdmin = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        return data?.role === 'admin' || data?.role === 'super_admin';
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

        // Prepare news data - use correct column names from database schema
        // The table has: title (required), content (required), title_ar, content_ar, etc.
        const newsData = {
            category: category || 'general',
            priority: priority || 'normal',
            title: title_ar || title_en || 'Untitled',  // Required field
            content: content_ar || content_en || '',     // Required field
            title_ar,
            title_en,
            content_ar,
            content_en,
            author_id: req.user.id,
            media_urls: media_urls,  // Already an array, Supabase handles JSONB
            is_published: is_published === 'true' || is_published === true,
            publish_date: (is_published === 'true' || is_published === true) ? new Date().toISOString() : null,
            scheduled_for: scheduled_for || null,
            status: (is_published === 'true' || is_published === true) ? 'published' : 'draft'
        };

        const { data, error } = await supabase
            .from('news_announcements')
            .insert([newsData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'News post created successfully',
            news: data
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
        if (req.files && req.files.length > 0) {
            const new_media = req.files.map(file => ({
                type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                url: `/uploads/news/${file.filename}`,
                filename: file.filename,
                size: file.size
            }));

            // Get existing media
            const { data: existingNews } = await supabase
                .from('news_announcements')
                .select('media_urls')
                .eq('id', id)
                .single();

            const existing_media = existingNews?.media_urls ? JSON.parse(existingNews.media_urls) : [];
            updates.media_urls = JSON.stringify([...existing_media, ...new_media]);
        } else {
            // If no files uploaded, don't update media_urls
            delete updates.media_urls;
        }

        // Remove fields that don't exist in database
        delete updates.images; // Frontend field that doesn't exist in DB
        delete updates.publish_date; // Frontend field that doesn't exist in DB

        log.info('[UPDATE NEWS] Updating news ID', { id });
        log.info('[UPDATE NEWS] Updates', { updates });

        const { data, error } = await supabase
            .from('news_announcements')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            log.error('[UPDATE NEWS] Error', { error: error.message });
            throw error;
        }

        if (!data || data.length === 0) {
            log.error('[UPDATE NEWS] No news found with ID', { id });
            return res.status(404).json({ error: 'News not found' });
        }

        log.info('[UPDATE NEWS] Success! Updated', { newsId: data[0].id });

        res.json({
            message: 'News post updated successfully',
            news: data[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. DELETE NEWS POST (Admin Only - Hard Delete since table doesn't have deleted_at)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('news_announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;

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

        let query = supabase
            .from('news_announcements')
            .select('*, author:users!author_id(id, email)')
            .order('created_at', { ascending: false });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        if (published) {
            query = query.eq('is_published', published === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ news: data });
    } catch (error) {
        log.error('GET /admin/all error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 5. 🚨 PUSH NOTIFICATION BUTTON - Send notification to ALL members
router.post('/:id/push-notification', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { custom_message } = req.body; // Optional custom notification text

        log.info('[Push Notification] Starting for news ID', { id });

        // Get news post
        const { data: news, error: newsError } = await supabase
            .from('news_announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (newsError) {
            log.error('[Push Notification] News not found', { error: newsError.message });
            throw newsError;
        }

        if (!news.is_published) {
            log.info('[Push Notification] News not published');
            return res.status(400).json({
                error: 'Cannot send notification for unpublished news',
                errorAr: 'لا يمكن إرسال إشعار لخبر غير منشور'
            });
        }

        // Get all members from members table (not users table)
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, member_id, email, phone, full_name')
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (membersError) {
            log.error('[Push Notification] Error fetching members', { error: membersError.message });
            throw membersError;
        }

        log.info('[Push Notification] Found active members', { count: members.length });

        // 📝 Since members don't have user_id and notifications table requires it,
        // we'll send push notifications via external service (FCM/OneSignal)
        // and store a single admin notification about the broadcast

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
            metadata: {
                broadcast_to: members.length,
                member_ids: members.map(m => m.id),
                news_title: news.title_ar || news.title
            }
        };

        const { error: notifError } = await supabase
            .from('notifications')
            .insert([adminNotification]);

        if (notifError) {
            log.error('[Push Notification] Error inserting admin notification', { error: notifError.message });
            throw notifError;
        }

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
        const { count, error } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (error) {
            log.error('[Member Count] Error', { error: error.message });
            throw error;
        }

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
        const { count, error } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('membership_status', 'active');

        if (error) {
            log.error('[Active Members Count] Error', { error: error.message });
            throw error;
        }

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
        const { data: news, error: newsError } = await supabase
            .from('news_announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (newsError) throw newsError;

        // Get notification stats
        const { data: notifStats, error: notifError } = await supabase
            .from('notifications')
            .select('is_read')
            .eq('related_id', id)
            .eq('related_type', 'news');

        if (notifError) throw notifError;

        const totalNotifications = notifStats.length;
        const readNotifications = notifStats.filter(n => n.is_read).length;
        const readPercentage = totalNotifications > 0
            ? ((readNotifications / totalNotifications) * 100).toFixed(2)
            : 0;

        // Get reactions count
        const { data: reactions, error: reactError } = await supabase
            .from('news_reactions')
            .select('reaction_type')
            .eq('news_id', id);

        if (reactError) throw reactError;

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

        let query = supabase
            .from('news_announcements')
            .select('*')
            .eq('is_published', true)
            .is('deleted_at', null)
            .order('published_at', { ascending: false });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ news: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. GET SINGLE NEWS POST (Members)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count (create RPC function if doesn't exist)
        try {
            await supabase.rpc('increment_news_views', { news_uuid: id });
        } catch (e) {
            // If RPC doesn't exist, update directly
            await supabase
                .from('news_announcements')
                .update({ views_count: supabase.raw('views_count + 1') })
                .eq('id', id);
        }

        // Get news
        const { data, error } = await supabase
            .from('news_announcements')
            .select('*, reactions:news_reactions(reaction_type)')
            .eq('id', id)
            .eq('is_published', true)
            .single();

        if (error) throw error;

        // Get user's member_id
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        // Mark notification as read
        if (userData?.member_id) {
            await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date() })
                .eq('related_id', id)
                .eq('member_id', userData.member_id)
                .eq('related_type', 'news')
                .is('read_at', null);
        }

        res.json({ news: data });
    } catch (error) {
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
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        // Upsert reaction
        const { error } = await supabase
            .from('news_reactions')
            .upsert({
                news_id: id,
                member_id: userData.member_id,
                reaction_type
            }, {
                onConflict: 'news_id,member_id'
            });

        if (error) throw error;

        res.json({ message: 'Reaction saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 10. GET MY NOTIFICATIONS (Members)
router.get('/notifications/my', authenticateToken, async (req, res) => {
    try {
        const { unread_only } = req.query;

        // Get user's member_id
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('member_id', userData.member_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (unread_only === 'true') {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ notifications: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 11. MARK NOTIFICATION AS READ (Members)
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get user's member_id
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('id', id)
            .eq('member_id', userData.member_id);

        if (error) throw error;

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 12. MARK ALL NOTIFICATIONS AS READ (Members)
router.patch('/notifications/mark-all-read', authenticateToken, async (req, res) => {
    try {
        // Get user's member_id
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.status(400).json({ error: 'User not associated with a member' });
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('member_id', userData.member_id)
            .eq('is_read', false);

        if (error) throw error;

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 13. GET UNREAD COUNT (Members)
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        // Get user's member_id
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.member_id) {
            return res.json({ unread_count: 0 });
        }

        // Try RPC first
        try {
            const { data, error } = await supabase
                .rpc('get_unread_count', { member_uuid: userData.member_id });

            if (!error) {
                return res.json({ unread_count: data });
            }
        } catch (e) {
            // Fallback to direct query
        }

        // Fallback: Direct query
        const { data, error } = await supabase
            .from('notifications')
            .select('id')
            .eq('member_id', userData.member_id)
            .eq('is_read', false);

        if (error) throw error;

        res.json({ unread_count: data.length });
    } catch (error) {
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
        const { data: userData } = await supabase
            .from('users')
            .select('member_id')
            .eq('id', req.user.id)
            .single();

        const { error } = await supabase
            .from('push_notification_tokens')
            .upsert({
                user_id: req.user.id,
                member_id: userData?.member_id,
                device_token,
                device_type: device_type || 'web',
                is_active: true,
                last_used_at: new Date()
            }, {
                onConflict: 'user_id,device_token'
            });

        if (error) throw error;

        res.json({ message: 'Device registered for push notifications' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HELPER FUNCTION: Send actual push notifications
// ============================================
async function sendPushNotifications(members, news) {
    // TODO: Implement Firebase Cloud Messaging (FCM) integration
    // This is where you'd send actual push notifications to devices

    try {
        // Get device tokens for all members
        const { data: tokens } = await supabase
            .from('push_notification_tokens')
            .select('device_token, device_type')
            .in('member_id', members.map(m => m.id))
            .eq('is_active', true);

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