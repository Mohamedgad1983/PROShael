# 📰 NEWS SYSTEM - API GUIDE (Perfect Fit)

## For: Backend Developer (Agent 1)
## Date: October 7, 2025
## Database: Compatible with YOUR notifications table structure

---

## ✅ YOUR NOTIFICATIONS TABLE STRUCTURE

Your `notifications` table already has perfect structure:
```sql
✅ user_id          -- User who receives notification
✅ title            -- English title
✅ title_ar         -- Arabic title
✅ message          -- English message
✅ message_ar       -- Arabic message
✅ type             -- Type (news, payment, etc.)
✅ priority         -- Priority level
✅ category         -- Category
✅ related_id       -- News ID
✅ related_type     -- 'news'
✅ icon             -- Icon name
✅ color            -- Color code
✅ action_url       -- Deep link URL
✅ metadata         -- Extra data (JSONB)
✅ is_read          -- Read status
✅ read_at          -- When read
✅ created_at       -- Created timestamp
✅ updated_at       -- Updated timestamp
✅ expires_at       -- Expiration
✅ deleted_at       -- Soft delete
```

**This is EXCELLENT!** All the fields we need are already there!

---

## 🎯 API ENDPOINTS

### 1. CREATE NEWS
**Endpoint:** `POST /api/news`

**Request Body:**
```json
{
  "title": "Important Announcement",
  "title_ar": "إعلان مهم",
  "title_en": "Important Announcement",
  "content": "Full content here...",
  "content_ar": "المحتوى الكامل هنا...",
  "content_en": "Full content here...",
  "summary": "Brief summary",
  "category": "general",
  "priority": "high",
  "target_audience": "all",
  "status": "draft",
  "image_url": "https://...",
  "author_id": "user-uuid"
}
```

**Implementation:**
```javascript
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, title_ar, title_en,
      content, content_ar, content_en,
      summary, category, priority,
      target_audience, status, image_url, author_id
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO news_announcements (
        title, title_ar, title_en,
        content, content_ar, content_en,
        summary, category, priority,
        target_audience, status, image_url, author_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [title, title_ar, title_en, content, content_ar, content_en,
       summary, category, priority, target_audience, status, image_url, author_id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 2. GET ALL NEWS
**Endpoint:** `GET /api/news?limit=10&offset=0&category=general`

**Implementation:**
```javascript
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, category, priority } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM get_latest_news($1, $2, $3, $4)',
      [limit, offset, category || null, priority || null]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 3. PUBLISH NEWS & SEND NOTIFICATIONS ⭐
**Endpoint:** `PATCH /api/news/:id/publish`

**This is the IMPORTANT one - sends notifications to all members!**

**Implementation:**
```javascript
router.patch('/:id/publish', authenticateToken, async (req, res) => {
  try {
    // 1. Publish the news
    const newsResult = await pool.query(
      `UPDATE news_announcements 
       SET status = 'published', 
           publish_date = COALESCE(publish_date, NOW())
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    
    const news = newsResult.rows[0];
    
    // 2. Get target users based on target_audience
    let targetUsers;
    if (news.target_audience === 'all') {
      // Get all active users
      const usersResult = await pool.query(
        'SELECT id FROM users WHERE is_active = true'
      );
      targetUsers = usersResult.rows;
    } else {
      // Get users from specific families
      const usersResult = await pool.query(
        `SELECT DISTINCT u.id 
         FROM users u
         INNER JOIN members m ON m.id = u.member_id
         WHERE m.family_id = ANY($1)
         AND u.is_active = true`,
        [news.target_families || []]
      );
      targetUsers = usersResult.rows;
    }
    
    // 3. Create notification for each user using YOUR notifications table
    for (const user of targetUsers) {
      await pool.query(
        `INSERT INTO notifications (
          user_id, 
          title, title_ar,
          message, message_ar,
          type, priority, category,
          related_id, related_type,
          icon, color, action_url,
          is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          user.id,
          news.title_en || news.title,          // title
          news.title_ar || news.title,          // title_ar
          news.summary || news.content,         // message
          news.summary || news.content,         // message_ar
          'news',                               // type
          news.priority || 'normal',            // priority
          'announcement',                       // category
          news.id,                              // related_id
          'news',                               // related_type
          'newspaper',                          // icon
          '#3B82F6',                            // color (blue)
          `/news/${news.id}`,                   // action_url
          false                                 // is_read
        ]
      );
      
      // 4. Send push notification (if user has tokens)
      await sendPushNotification(user.id, {
        title: news.title_ar || news.title,
        body: news.summary,
        image: news.image_url,
        data: {
          type: 'news',
          newsId: news.id,
          category: news.category
        }
      });
    }
    
    // 5. Update notification count
    await pool.query(
      `UPDATE news_announcements 
       SET notification_sent = true, 
           notification_sent_at = NOW(),
           notification_count = $1
       WHERE id = $2`,
      [targetUsers.length, news.id]
    );
    
    res.json({ 
      success: true, 
      data: news, 
      notifications_sent: targetUsers.length 
    });
    
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 4. TRACK NEWS VIEW
**Endpoint:** `POST /api/news/:id/view`

**Request Body:**
```json
{
  "member_id": "member-uuid",
  "user_id": "user-uuid"
}
```

**Implementation:**
```javascript
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const { member_id, user_id } = req.body;
    
    await pool.query(
      'SELECT increment_news_views($1, $2, $3)',
      [req.params.id, member_id, user_id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 5. TOGGLE REACTION (Like)
**Endpoint:** `POST /api/news/:id/react`

**Request Body:**
```json
{
  "member_id": "member-uuid",
  "reaction_type": "like"
}
```

**Implementation:**
```javascript
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { member_id, reaction_type = 'like' } = req.body;
    
    const result = await pool.query(
      'SELECT toggle_news_reaction($1, $2, $3)',
      [req.params.id, member_id, reaction_type]
    );
    
    const added = result.rows[0].toggle_news_reaction;
    
    res.json({ 
      success: true, 
      action: added ? 'added' : 'removed',
      reaction_type 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 6. GET USER NOTIFICATIONS
**Endpoint:** `GET /api/notifications?limit=20&offset=0&unread_only=false`

**Using YOUR notifications table:**

**Implementation:**
```javascript
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread_only = false } = req.query;
    const user_id = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM get_user_notifications($1, $2, $3, $4)',
      [user_id, limit, offset, unread_only === 'true']
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "title": "Important News",
      "title_ar": "خبر مهم",
      "message": "Check out the latest announcement",
      "message_ar": "تحقق من آخر إعلان",
      "type": "news",
      "priority": "high",
      "category": "announcement",
      "related_id": "news-uuid",
      "related_type": "news",
      "icon": "newspaper",
      "color": "#3B82F6",
      "action_url": "/news/123",
      "is_read": false,
      "created_at": "2025-10-07T10:00:00Z"
    }
  ]
}
```

---

### 7. MARK NOTIFICATION AS READ
**Endpoint:** `PATCH /api/notifications/:id/read`

**Implementation:**
```javascript
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'SELECT mark_notification_read($1)',
      [req.params.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 8. MARK ALL AS READ
**Endpoint:** `PATCH /api/notifications/read-all`

**Implementation:**
```javascript
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT mark_all_notifications_read($1)',
      [req.user.id]
    );
    
    const count = result.rows[0].mark_all_notifications_read;
    
    res.json({ success: true, marked_count: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 9. GET UNREAD COUNT
**Endpoint:** `GET /api/notifications/unread-count`

**Implementation:**
```javascript
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT get_unread_notifications_count($1)',
      [req.user.id]
    );
    
    res.json({ 
      success: true, 
      unread_count: result.rows[0].get_unread_notifications_count 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 10. REGISTER PUSH TOKEN
**Endpoint:** `POST /api/push/register`

**Request Body:**
```json
{
  "member_id": "member-uuid",
  "user_id": "user-uuid",
  "device_token": "fcm-token-here",
  "device_type": "android",
  "device_info": {
    "model": "Samsung Galaxy S21",
    "os_version": "Android 13"
  }
}
```

**Implementation:**
```javascript
router.post('/push/register', authenticateToken, async (req, res) => {
  try {
    const { member_id, user_id, device_token, device_type, device_info } = req.body;
    
    const result = await pool.query(
      'SELECT register_push_token($1, $2, $3, $4, $5)',
      [member_id, user_id, device_token, device_type, device_info || {}]
    );
    
    res.json({ success: true, token_id: result.rows[0].register_push_token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔔 PUSH NOTIFICATION SERVICE

### Complete Implementation:

```javascript
// services/pushNotification.js
const admin = require('firebase-admin');
const { pool } = require('../config/database');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

async function sendPushNotification(userId, notification) {
  try {
    // Get user's device tokens
    const result = await pool.query(
      'SELECT * FROM get_user_push_tokens($1)',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log('No push tokens for user:', userId);
      return { success: false, reason: 'no_tokens' };
    }
    
    const tokens = result.rows.map(row => row.device_token);
    
    // Prepare FCM message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || null
      },
      data: {
        type: 'news',
        ...notification.data
      },
      tokens: tokens
    };
    
    // Send to FCM
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`✅ Push sent to user ${userId}: ${response.successCount}/${tokens.length} delivered`);
    
    return {
      success: true,
      total: tokens.length,
      delivered: response.successCount,
      failed: response.failureCount
    };
    
  } catch (error) {
    console.error('❌ Push notification error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPushNotification };
```

---

## 📱 FLUTTER INTEGRATION

### 1. News List Screen

```dart
class NewsListScreen extends StatefulWidget {
  @override
  _NewsListScreenState createState() => _NewsListScreenState();
}

class _NewsListScreenState extends State<NewsListScreen> {
  List<News> newsList = [];
  bool isLoading = true;
  int unreadCount = 0;

  @override
  void initState() {
    super.initState();
    fetchNews();
    fetchUnreadCount();
  }

  Future<void> fetchNews() async {
    final response = await http.get(
      Uri.parse('$API_BASE/api/news?limit=20'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        newsList = (data['data'] as List)
            .map((json) => News.fromJson(json))
            .toList();
        isLoading = false;
      });
    }
  }

  Future<void> fetchUnreadCount() async {
    final response = await http.get(
      Uri.parse('$API_BASE/api/notifications/unread-count'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        unreadCount = data['unread_count'];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('الأخبار والإعلانات'),
        actions: [
          // Notification bell with badge
          Stack(
            children: [
              IconButton(
                icon: Icon(Icons.notifications),
                onPressed: () {
                  Navigator.pushNamed(context, '/notifications');
                },
              ),
              if (unreadCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$unreadCount',
                      style: TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: fetchNews,
              child: ListView.builder(
                itemCount: newsList.length,
                itemBuilder: (context, index) {
                  return NewsCard(
                    news: newsList[index],
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => NewsDetailScreen(
                            newsId: newsList[index].id,
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
    );
  }
}
```

### 2. Notifications Screen

```dart
class NotificationsScreen extends StatefulWidget {
  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> notifications = [];

  @override
  void initState() {
    super.initState();
    fetchNotifications();
  }

  Future<void> fetchNotifications() async {
    final response = await http.get(
      Uri.parse('$API_BASE/api/notifications?limit=50'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        notifications = (data['data'] as List)
            .map((json) => AppNotification.fromJson(json))
            .toList();
      });
    }
  }

  Future<void> markAsRead(String notificationId) async {
    await http.patch(
      Uri.parse('$API_BASE/api/notifications/$notificationId/read'),
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  Future<void> markAllAsRead() async {
    final response = await http.patch(
      Uri.parse('$API_BASE/api/notifications/read-all'),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (response.statusCode == 200) {
      fetchNotifications();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('الإشعارات'),
        actions: [
          TextButton(
            child: Text('تحديد الكل كمقروء'),
            onPressed: markAllAsRead,
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: notifications.length,
        itemBuilder: (context, index) {
          final notif = notifications[index];
          return ListTile(
            leading: Icon(
              _getIcon(notif.icon),
              color: Color(int.parse(notif.color.replaceFirst('#', '0xFF'))),
            ),
            title: Text(notif.titleAr ?? notif.title),
            subtitle: Text(notif.messageAr ?? notif.message),
            trailing: notif.isRead ? null : CircleAvatar(
              radius: 4,
              backgroundColor: Colors.blue,
            ),
            onTap: () {
              if (!notif.isRead) {
                markAsRead(notif.id);
              }
              
              // Navigate to news detail
              if (notif.relatedType == 'news') {
                Navigator.pushNamed(
                  context,
                  '/news/${notif.relatedId}',
                );
              }
            },
          );
        },
      ),
    );
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'newspaper':
        return Icons.article;
      case 'payment':
        return Icons.payment;
      case 'event':
        return Icons.event;
      default:
        return Icons.notifications;
    }
  }
}
```

---

## ✅ TESTING CHECKLIST

### Database Setup:
- [ ] Run `02_NEWS_SYSTEM_PERFECT_FIT.sql`
- [ ] Verify: `SELECT * FROM get_latest_news(5);`
- [ ] Check: `SELECT * FROM get_news_stats();`

### API Endpoints:
- [ ] POST /api/news - Create news
- [ ] PATCH /api/news/:id/publish - Publish & send notifications
- [ ] GET /api/notifications - Get user notifications
- [ ] PATCH /api/notifications/:id/read - Mark as read
- [ ] GET /api/notifications/unread-count - Get unread count
- [ ] POST /api/push/register - Register device token

### Push Notifications:
- [ ] Device token registered successfully
- [ ] Publish news → notification created in database
- [ ] Push received on device
- [ ] Tap push → opens correct news

### Mobile App:
- [ ] News list loads
- [ ] Notifications screen works
- [ ] Unread badge shows correct count
- [ ] Mark as read works
- [ ] Deep links work

---

## 🎯 SUCCESS!

Your notifications table structure is **PERFECT** for this system!

**Everything you need:**
- ✅ Bilingual support (title_ar, message_ar)
- ✅ Priority levels
- ✅ Categories
- ✅ Related content (related_id, related_type)
- ✅ Visual elements (icon, color)
- ✅ Deep links (action_url)
- ✅ Read tracking (is_read, read_at)
- ✅ Metadata for extra info
- ✅ Soft delete & expiration

**You're ready to build! 🚀**
