// ============================================
// NEWS & NOTIFICATIONS API - COMPLETE IMPLEMENTATION
// File: backend/routes/news.js
// Purpose: News broadcasting with push notifications
// ============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

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
router.post('/news', authMiddleware, adminOnly, upload.array('media', 10), async (req, res) => {
    try {
        const {
            category,
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

        const { data, error } = await supabase
            .from('news_announcements')
            .insert([{
                category: category || 'general',
                title_ar,
                title_en,
                content_ar,
                content_en,
                author_id: req.user.id,
                media_urls: JSON.stringify(media_urls),
                is_published: is_published === 'true' || is_published === true,
                published_at: (is_published === 'true' || is_published === true) ? new Date() : null,
                scheduled_for: scheduled_for || null
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'News post created successfully',
            news: data
        });
    } catch (error) {
        console.error('Create news error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. UPDATE NEWS POST (Admin Only)
router.put('/news/:id', authMiddleware, adminOnly, upload.array('media', 10), async (req, res) => {
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
        }

        // If publishing now
        if (updates.is_published === 'true' && !updates.published_at) {
            updates.published_at = new Date();
        }

        const { data, error } = await supabase
            .from('news_announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'News post updated successfully',
            news: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. DELETE NEWS POST (Admin Only - Soft Delete)
router.delete('/news/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('news_announcements')
            .update({ deleted_at: new Date() })
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'News post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. GET ALL NEWS (Admin - including unpublished)
router.get('/news/admin/all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { category, published } = req.query;

        let query = supabase
            .from('news_announcements')
            .select('*, author:users!author_id(id, email)')
            .is('deleted_at', null)
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
        res.status(500).json({ error: error.message });
    }
});

// 5. 🚨 PUSH NOTIFICATION BUTTON - Send notification to ALL members
router.post('/news/:id/push-notification', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { custom_message } = req.body; // Optional custom notification text

        // Get news post
        const { data: news, error: newsError } = await supabase
            .from('news_announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (newsError) throw newsError;

        if (!news.is_published) {
            return res.status(400).json({ error: 'Cannot send notification for unpublished news' });
        }

        // Get all active members
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id')
            .eq('is_active', true);

        if (membersError) throw membersError;

        // Create notifications for ALL members
        const notifications = members.map(member => ({
            member_id: member.id,
            type: 'news',
            title_ar: custom_message || news.title_ar,
            title_en: news.title_en,
            message_ar: `خبر جديد من عائلة الشعيل`,
            message_en: 'New news from Al-Shuail family',
            related_id: news.id,
            related_type: 'news',
            action_url: `/news/${news.id}`,
            push_sent: true,
            push_sent_at: new Date()
        }));

        const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (notifError) throw notifError;

        // Mark news as notification sent
        await supabase
            .from('news_announcements')
            .update({
                notification_sent: true,
                notification_sent_at: new Date(),
                notification_count: members.length
            })
            .eq('id', id);

        // 🔥 Send actual push notifications to devices
        await sendPushNotifications(members, news);

        res.json({
            message: `Notification sent to ${members.length} members successfully!`,
            recipient_count: members.length
        });
    } catch (error) {
        console.error('Push notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. GET NEWS STATISTICS (Admin)
router.get('/news/:id/stats', authMiddleware, adminOnly, async (req, res) => {
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
router.get('/news', authMiddleware, async (req, res) => {
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
router.get('/news/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await supabase.rpc('increment_news_views', { news_uuid: id });

        // Get news
        const { data, error } = await supabase
            .from('news_announcements')
            .select('*, reactions:news_reactions(reaction_type)')
            .eq('id', id)
            .eq('is_published', true)
            .single();

        if (error) throw error;

        // Mark notification as read
        await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('related_id', id)
            .eq('member_id', req.user.member_id)
            .eq('related_type', 'news')
            .is('read_at', null);

        res.json({ news: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. REACT TO NEWS (Members - Optional)
router.post('/news/:id/react', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { reaction_type } = req.body; // like, love, celebrate, support

        const validReactions = ['like', 'love', 'celebrate', 'support'];
        if (!validReactions.includes(reaction_type)) {
            return res.status(400).json({ error: 'Invalid reaction type' });
        }

        // Upsert reaction
        const { error } = await supabase
            .from('news_reactions')
            .upsert({
                news_id: id,
                member_id: req.user.member_id,
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
router.get('/notifications/my', authMiddleware, async (req, res) => {
    try {
        const { unread_only } = req.query;

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('member_id', req.user.member_id)
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
router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('id', id)
            .eq('member_id', req.user.member_id);

        if (error) throw error;

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 12. MARK ALL NOTIFICATIONS AS READ (Members)
router.patch('/notifications/mark-all-read', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('member_id', req.user.member_id)
            .eq('is_read', false);

        if (error) throw error;

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 13. GET UNREAD COUNT (Members)
router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .rpc('get_unread_count', { member_uuid: req.user.member_id });

        if (error) throw error;

        res.json({ unread_count: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 14. REGISTER PUSH NOTIFICATION TOKEN (Members - for real push)
router.post('/notifications/register-device', authMiddleware, async (req, res) => {
    try {
        const { device_token, device_type } = req.body;

        if (!device_token) {
            return res.status(400).json({ error: 'Device token required' });
        }

        const { error } = await supabase
            .from('push_notification_tokens')
            .upsert({
                user_id: req.user.id,
                member_id: req.user.member_id,
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
            console.log('No device tokens found for push notifications');
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

        console.log(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
        */

        console.log(`Would send push to ${tokens.length} devices`);
        return tokens.length;
    } catch (error) {
        console.error('Push notification sending error:', error);
        return 0;
    }
}

module.exports = router;
