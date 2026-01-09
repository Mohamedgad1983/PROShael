# 🚀 EXECUTE NOW: Complete Supabase Features on VPS

## 🎯 YOUR MISSION

Implement ALL Supabase features missing on Al-Shuail VPS. Execute each feature in order.

**VPS Access:**
```
IP: 213.199.62.185
User: root
Backend: /var/www/PROShael/alshuail-backend
Database: alshuail_db (PostgreSQL 15)
```

---

# ═══════════════════════════════════════════════════════════════
# 🔥 FEATURE 1: pgAdmin (Database Dashboard) - 10 minutes
# ═══════════════════════════════════════════════════════════════

## Execute these commands on VPS:

```bash
# 1. SSH to VPS
ssh root@213.199.62.185

# 2. Install pgAdmin
curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg

echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list

apt update
apt install pgadmin4-web -y

# 3. Configure pgAdmin (will ask for email/password)
/usr/pgadmin4/bin/setup-web.sh

# When prompted enter:
# Email: admin@alshailfund.com
# Password: AlShuail@2025!
```

## 4. Configure Nginx for pgAdmin:

```bash
cat > /etc/nginx/sites-available/pgadmin << 'NGINX_EOF'
server {
    listen 80;
    server_name db.alshailfund.com;

    location / {
        proxy_pass http://127.0.0.1/pgadmin4;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Script-Name /pgadmin4;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/pgadmin /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 5. Test pgAdmin:
```bash
# Access at: http://213.199.62.185/pgadmin4
# Or after DNS: https://db.alshailfund.com
```

## ✅ CHECKPOINT 1: Verify pgAdmin works before continuing

---

# ═══════════════════════════════════════════════════════════════
# ⚡ FEATURE 2: Socket.io (Real-time Updates) - 15 minutes
# ═══════════════════════════════════════════════════════════════

## 1. Install Socket.io:

```bash
cd /var/www/PROShael/alshuail-backend
npm install socket.io socket.io-client
```

## 2. Create Socket Service:

```bash
mkdir -p /var/www/PROShael/alshuail-backend/src/services

cat > /var/www/PROShael/alshuail-backend/src/services/socketService.js << 'EOF'
/**
 * Socket.io Real-time Service
 * بديل Supabase Real-time
 */

const { Server } = require('socket.io');
let io = null;

// Initialize Socket.io
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'https://alshailfund.com',
        'https://app.alshailfund.com',
        'http://localhost:3000',
        'http://localhost:3002'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ [Socket.io] متصل: ${socket.id}`);

    // انضمام لغرفة
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`📥 ${socket.id} انضم للغرفة: ${room}`);
    });

    // انضمام لغرفة العضو
    socket.on('join-member-room', (memberId) => {
      socket.join(`member-${memberId}`);
      console.log(`👤 ${socket.id} انضم لغرفة العضو: ${memberId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ [Socket.io] انقطع: ${socket.id}`);
    });
  });

  console.log('🚀 [Socket.io] Real-time server initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// إرسال للكل
const emitToAll = (event, data) => {
  if (io) io.emit(event, { ...data, timestamp: new Date().toISOString() });
};

// إرسال لغرفة
const emitToRoom = (room, event, data) => {
  if (io) io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// إرسال لعضو محدد
const emitToMember = (memberId, event, data) => {
  if (io) io.to(`member-${memberId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// ═══════════════════════════════════════
// أحداث Real-time (مثل Supabase)
// ═══════════════════════════════════════

// تغيير في الأعضاء
const notifyMemberChange = (action, member) => {
  emitToAll('member-change', { action, data: member });
  console.log(`📡 Member ${action}: ${member.id || member.full_name_ar}`);
};

// تغيير في المدفوعات
const notifyPaymentChange = (action, payment) => {
  emitToAll('payment-change', { action, data: payment });
  if (payment.member_id) {
    emitToMember(payment.member_id, 'my-payment-update', { action, data: payment });
  }
};

// تغيير في الاشتراكات
const notifySubscriptionChange = (action, subscription) => {
  emitToAll('subscription-change', { action, data: subscription });
  if (subscription.member_id) {
    emitToMember(subscription.member_id, 'my-subscription-update', { action, data: subscription });
  }
};

// تغيير في الفعاليات
const notifyActivityChange = (action, activity) => {
  emitToAll('activity-change', { action, data: activity });
};

// إشعار جديد لعضو
const notifyNewNotification = (memberId, notification) => {
  emitToMember(memberId, 'new-notification', { data: notification });
};

// إعلان عام للجميع
const broadcastAnnouncement = (announcement) => {
  emitToAll('announcement', { data: announcement });
};

// تحديث Dashboard
const notifyDashboardUpdate = () => {
  emitToRoom('admins', 'dashboard-update', { refresh: true });
};

module.exports = {
  initializeSocket,
  getIO,
  emitToAll,
  emitToRoom,
  emitToMember,
  notifyMemberChange,
  notifyPaymentChange,
  notifySubscriptionChange,
  notifyActivityChange,
  notifyNewNotification,
  broadcastAnnouncement,
  notifyDashboardUpdate
};
EOF
```

## 3. Update server.js to use Socket.io:

```bash
# Backup first
cp /var/www/PROShael/alshuail-backend/server.js /var/www/PROShael/alshuail-backend/server.js.backup.$(date +%Y%m%d)

# Check current server.js structure
head -50 /var/www/PROShael/alshuail-backend/server.js
```

## 4. Add Socket.io to server.js:

Find where `app.listen` is and replace with:

```javascript
// Add at top of file
const http = require('http');
const { initializeSocket } = require('./src/services/socketService');

// Replace app.listen with:
const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('⚡ Socket.io Real-time enabled');
});
```

## 5. Create Socket.io test endpoint:

```bash
cat >> /var/www/PROShael/alshuail-backend/src/routes/health.routes.js << 'EOF'

// Socket.io test endpoint
router.get('/socket-test', (req, res) => {
  const { getIO } = require('../services/socketService');
  try {
    const io = getIO();
    res.json({
      status: 'ok',
      socketio: 'connected',
      clients: io.sockets.sockets.size
    });
  } catch (error) {
    res.json({
      status: 'ok',
      socketio: 'not initialized',
      error: error.message
    });
  }
});
EOF
```

## 6. Restart and test:

```bash
cd /var/www/PROShael/alshuail-backend
pm2 restart all
pm2 logs --lines 30

# Should see: "Socket.io Real-time server initialized"
```

## ✅ CHECKPOINT 2: Verify Socket.io initialized in logs

---

# ═══════════════════════════════════════════════════════════════
# 📁 FEATURE 3: Storage System (File Uploads) - 15 minutes
# ═══════════════════════════════════════════════════════════════

## 1. Install packages:

```bash
cd /var/www/PROShael/alshuail-backend
npm install multer sharp uuid mime-types
```

## 2. Create Storage Service:

```bash
cat > /var/www/PROShael/alshuail-backend/src/services/storageService.js << 'EOF'
/**
 * Storage Service - بديل Supabase Storage
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const STORAGE_BASE = process.env.STORAGE_PATH || '/var/www/alshuail/storage';
const PUBLIC_URL = process.env.STORAGE_URL || 'https://api.alshailfund.com/uploads';

// Buckets مثل Supabase
const BUCKETS = {
  members: 'members',       // صور الأعضاء
  documents: 'documents',   // المستندات
  photos: 'photos',         // صور عامة
  receipts: 'receipts',     // إيصالات الدفع
  avatars: 'avatars',       // صور البروفايل
  temp: 'temp'              // ملفات مؤقتة
};

// إنشاء مجلد Bucket
const ensureBucket = async (bucket) => {
  const bucketPath = path.join(STORAGE_BASE, bucket);
  if (!fsSync.existsSync(bucketPath)) {
    await fs.mkdir(bucketPath, { recursive: true });
  }
  return bucketPath;
};

// التحقق من نوع الملف
const isImage = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
};

// تحويل الحجم للقراءة
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * رفع ملف
 */
const uploadFile = async (bucket, filename, fileBuffer, options = {}) => {
  try {
    const bucketPath = await ensureBucket(bucket);
    
    // اسم فريد للملف
    const ext = path.extname(filename).toLowerCase();
    const uniqueName = options.keepName ? filename : `${uuidv4()}${ext}`;
    const filePath = path.join(bucketPath, uniqueName);
    
    let finalBuffer = fileBuffer;
    
    // معالجة الصور
    if (isImage(filename)) {
      // تغيير الحجم إذا مطلوب
      if (options.resize) {
        finalBuffer = await sharp(fileBuffer)
          .resize(options.resize.width, options.resize.height, {
            fit: options.resize.fit || 'cover',
            withoutEnlargement: true
          })
          .toBuffer();
      }
      
      // ضغط الصورة
      if (options.quality) {
        const format = ext === '.png' ? 'png' : 'jpeg';
        finalBuffer = await sharp(finalBuffer)
          [format]({ quality: options.quality })
          .toBuffer();
      }
      
      // تحويل لـ WebP للتوفير
      if (options.convertToWebp) {
        finalBuffer = await sharp(finalBuffer)
          .webp({ quality: options.quality || 80 })
          .toBuffer();
        uniqueName = uniqueName.replace(ext, '.webp');
      }
    }
    
    await fs.writeFile(filePath, finalBuffer);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      bucket,
      filename: uniqueName,
      originalName: filename,
      path: `${bucket}/${uniqueName}`,
      publicUrl: `${PUBLIC_URL}/${bucket}/${uniqueName}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      mimeType: mime.lookup(uniqueName) || 'application/octet-stream',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * حذف ملف
 */
const deleteFile = async (bucket, filename) => {
  try {
    const filePath = path.join(STORAGE_BASE, bucket, filename);
    await fs.unlink(filePath);
    return { success: true, deleted: `${bucket}/${filename}` };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'الملف غير موجود' };
    }
    throw error;
  }
};

/**
 * معلومات ملف
 */
const getFileInfo = async (bucket, filename) => {
  try {
    const filePath = path.join(STORAGE_BASE, bucket, filename);
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      bucket,
      filename,
      path: `${bucket}/${filename}`,
      publicUrl: `${PUBLIC_URL}/${bucket}/${filename}`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      mimeType: mime.lookup(filename),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    return { exists: false, error: 'الملف غير موجود' };
  }
};

/**
 * قائمة الملفات في bucket
 */
const listFiles = async (bucket, options = {}) => {
  try {
    const bucketPath = path.join(STORAGE_BASE, bucket);
    
    if (!fsSync.existsSync(bucketPath)) {
      return { files: [], total: 0 };
    }
    
    const files = await fs.readdir(bucketPath);
    
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(bucketPath, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          path: `${bucket}/${filename}`,
          publicUrl: `${PUBLIC_URL}/${bucket}/${filename}`,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          mimeType: mime.lookup(filename),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
    );
    
    // ترتيب حسب التاريخ
    fileList.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    
    // Pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    return {
      files: fileList.slice(offset, offset + limit),
      total: fileList.length,
      limit,
      offset,
      hasMore: offset + limit < fileList.length
    };
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

/**
 * نقل ملف بين buckets
 */
const moveFile = async (fromBucket, filename, toBucket, newFilename = null) => {
  const sourcePath = path.join(STORAGE_BASE, fromBucket, filename);
  const destBucketPath = await ensureBucket(toBucket);
  const destFilename = newFilename || filename;
  const destPath = path.join(destBucketPath, destFilename);
  
  await fs.rename(sourcePath, destPath);
  
  return {
    success: true,
    from: `${fromBucket}/${filename}`,
    to: `${toBucket}/${destFilename}`,
    publicUrl: `${PUBLIC_URL}/${toBucket}/${destFilename}`
  };
};

/**
 * نسخ ملف
 */
const copyFile = async (fromBucket, filename, toBucket, newFilename = null) => {
  const sourcePath = path.join(STORAGE_BASE, fromBucket, filename);
  const destBucketPath = await ensureBucket(toBucket);
  const destFilename = newFilename || `copy-${filename}`;
  const destPath = path.join(destBucketPath, destFilename);
  
  await fs.copyFile(sourcePath, destPath);
  
  return {
    success: true,
    from: `${fromBucket}/${filename}`,
    to: `${toBucket}/${destFilename}`,
    publicUrl: `${PUBLIC_URL}/${toBucket}/${destFilename}`
  };
};

/**
 * إحصائيات Storage
 */
const getStorageStats = async () => {
  const stats = { buckets: {}, total: { files: 0, size: 0 } };
  
  for (const [name, bucket] of Object.entries(BUCKETS)) {
    const bucketPath = path.join(STORAGE_BASE, bucket);
    
    try {
      if (!fsSync.existsSync(bucketPath)) {
        stats.buckets[name] = { files: 0, size: 0, sizeFormatted: '0 B' };
        continue;
      }
      
      const files = await fs.readdir(bucketPath);
      let totalSize = 0;
      
      for (const file of files) {
        const fileStat = await fs.stat(path.join(bucketPath, file));
        totalSize += fileStat.size;
      }
      
      stats.buckets[name] = {
        files: files.length,
        size: totalSize,
        sizeFormatted: formatBytes(totalSize)
      };
      
      stats.total.files += files.length;
      stats.total.size += totalSize;
    } catch (error) {
      stats.buckets[name] = { files: 0, size: 0, sizeFormatted: '0 B', error: error.message };
    }
  }
  
  stats.total.sizeFormatted = formatBytes(stats.total.size);
  return stats;
};

/**
 * تنظيف الملفات المؤقتة
 */
const cleanupTemp = async (olderThanHours = 24) => {
  const tempPath = path.join(STORAGE_BASE, 'temp');
  
  if (!fsSync.existsSync(tempPath)) return { deleted: 0 };
  
  const files = await fs.readdir(tempPath);
  const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
  let deleted = 0;
  
  for (const file of files) {
    const filePath = path.join(tempPath, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtimeMs < cutoff) {
      await fs.unlink(filePath);
      deleted++;
    }
  }
  
  return { deleted, message: `تم حذف ${deleted} ملف مؤقت` };
};

module.exports = {
  BUCKETS,
  uploadFile,
  deleteFile,
  getFileInfo,
  listFiles,
  moveFile,
  copyFile,
  getStorageStats,
  cleanupTemp,
  ensureBucket,
  formatBytes
};
EOF
```

## 3. Create Storage Routes:

```bash
cat > /var/www/PROShael/alshuail-backend/src/routes/storage.routes.js << 'EOF'
/**
 * Storage API Routes - بديل Supabase Storage API
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const storage = require('../services/storageService');

// إعداد Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح'), false);
    }
  }
});

/**
 * @route POST /api/storage/:bucket/upload
 * @desc رفع ملف
 */
router.post('/:bucket/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال ملف' });
    }
    
    const { bucket } = req.params;
    const options = {
      resize: req.body.resize ? JSON.parse(req.body.resize) : null,
      quality: req.body.quality ? parseInt(req.body.quality) : null,
      keepName: req.body.keepName === 'true'
    };
    
    const result = await storage.uploadFile(
      bucket,
      req.file.originalname,
      req.file.buffer,
      options
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/storage/:bucket/upload-multiple
 * @desc رفع عدة ملفات
 */
router.post('/:bucket/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    }
    
    const { bucket } = req.params;
    const results = [];
    
    for (const file of req.files) {
      const result = await storage.uploadFile(bucket, file.originalname, file.buffer);
      results.push(result);
    }
    
    res.json({ success: true, files: results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/storage/:bucket/:filename
 * @desc حذف ملف
 */
router.delete('/:bucket/:filename', async (req, res) => {
  try {
    const { bucket, filename } = req.params;
    const result = await storage.deleteFile(bucket, filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/:bucket/list
 * @desc قائمة الملفات
 */
router.get('/:bucket/list', async (req, res) => {
  try {
    const { bucket } = req.params;
    const { limit, offset } = req.query;
    const result = await storage.listFiles(bucket, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/:bucket/:filename/info
 * @desc معلومات ملف
 */
router.get('/:bucket/:filename/info', async (req, res) => {
  try {
    const { bucket, filename } = req.params;
    const result = await storage.getFileInfo(bucket, filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/storage/move
 * @desc نقل ملف
 */
router.post('/move', async (req, res) => {
  try {
    const { fromBucket, filename, toBucket, newFilename } = req.body;
    const result = await storage.moveFile(fromBucket, filename, toBucket, newFilename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/stats
 * @desc إحصائيات Storage
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getStorageStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/storage/buckets
 * @desc قائمة Buckets المتاحة
 */
router.get('/buckets', (req, res) => {
  res.json({
    buckets: Object.keys(storage.BUCKETS),
    details: storage.BUCKETS
  });
});

/**
 * @route POST /api/storage/cleanup-temp
 * @desc تنظيف الملفات المؤقتة
 */
router.post('/cleanup-temp', async (req, res) => {
  try {
    const { olderThanHours } = req.body;
    const result = await storage.cleanupTemp(olderThanHours || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
EOF
```

## 4. Register Storage Routes in server.js:

```bash
# Add this line where other routes are registered
# const storageRoutes = require('./src/routes/storage.routes');
# app.use('/api/storage', storageRoutes);

# Find routes section and add:
grep -n "app.use.*routes" /var/www/PROShael/alshuail-backend/server.js
```

## 5. Update Nginx for file serving:

```bash
# Add to /etc/nginx/sites-available/alshuail-backend
cat >> /etc/nginx/sites-available/alshuail-backend << 'NGINX_STORAGE'

    # Static file serving for uploads
    location /uploads {
        alias /var/www/alshuail/storage;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        add_header Access-Control-Allow-Origin *;
        
        # Security - only allow specific file types
        location ~* \.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx)$ {
            try_files $uri =404;
        }
    }
NGINX_STORAGE

nginx -t && systemctl reload nginx
```

## 6. Test Storage:

```bash
# Test upload
curl -X POST https://api.alshailfund.com/api/storage/temp/upload \
  -F "file=@/etc/hostname"

# Test stats
curl https://api.alshailfund.com/api/storage/stats

# Test buckets list
curl https://api.alshailfund.com/api/storage/buckets
```

## ✅ CHECKPOINT 3: Verify Storage API works

---

# ═══════════════════════════════════════════════════════════════
# 📚 FEATURE 4: API Documentation (Swagger) - 10 minutes
# ═══════════════════════════════════════════════════════════════

## 1. Install Swagger:

```bash
cd /var/www/PROShael/alshuail-backend
npm install swagger-jsdoc swagger-ui-express
```

## 2. Create Swagger Config:

```bash
mkdir -p /var/www/PROShael/alshuail-backend/src/config

cat > /var/www/PROShael/alshuail-backend/src/config/swagger.js << 'EOF'
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'صندوق عائلة الشعيل - API',
      version: '2.0.0',
      description: `
        ## واجهة برمجة تطبيقات صندوق عائلة الشعيل
        
        ### المميزات:
        - إدارة الأعضاء
        - الاشتراكات والمدفوعات
        - شجرة العائلة
        - الفعاليات والمناسبات
        - Real-time Updates
        - Storage للملفات
        
        ### Authentication:
        استخدم JWT Bearer Token في header:
        \`Authorization: Bearer <token>\`
      `,
      contact: {
        name: 'الدعم الفني',
        email: 'support@alshailfund.com',
        url: 'https://alshailfund.com'
      }
    },
    servers: [
      { url: 'https://api.alshailfund.com', description: 'Production' },
      { url: 'http://localhost:5001', description: 'Development' }
    ],
    tags: [
      { name: 'Auth', description: 'تسجيل الدخول والمصادقة' },
      { name: 'Members', description: 'إدارة الأعضاء' },
      { name: 'Subscriptions', description: 'الاشتراكات' },
      { name: 'Payments', description: 'المدفوعات' },
      { name: 'Family Tree', description: 'شجرة العائلة' },
      { name: 'Activities', description: 'الفعاليات' },
      { name: 'Storage', description: 'إدارة الملفات' },
      { name: 'Dashboard', description: 'لوحة التحكم' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل الـ JWT token'
        }
      },
      schemas: {
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            full_name_ar: { type: 'string', example: 'محمد أحمد الشعيل' },
            full_name_en: { type: 'string', example: 'Mohammed Ahmed Al-Shuail' },
            phone: { type: 'string', example: '0501234567' },
            email: { type: 'string', format: 'email' },
            national_id: { type: 'string' },
            membership_number: { type: 'string', example: 'SH-0001' },
            family_branch_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            balance: { type: 'number', example: 2500 }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            member_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 50 },
            payment_date: { type: 'string', format: 'date' },
            payment_method: { type: 'string', enum: ['cash', 'transfer', 'card'] },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'] }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    './src/routes/*.js',
    './server.js'
  ]
};

module.exports = swaggerJsdoc(options);
EOF
```

## 3. Add Swagger to server.js:

Add these lines to server.js:

```javascript
// Add with requires at top
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');

// Add before other routes
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #667eea }
  `,
  customSiteTitle: 'Al-Shuail API Documentation',
  customfavIcon: '/favicon.ico'
}));

// JSON endpoint for API specs
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpecs);
});
```

## 4. Restart and verify:

```bash
pm2 restart all

# Access docs at:
# https://api.alshailfund.com/api/docs
```

## ✅ CHECKPOINT 4: Open /api/docs and verify

---

# ═══════════════════════════════════════════════════════════════
# 🔄 FEATURE 5: Database Triggers (Auto-actions) - 10 minutes
# ═══════════════════════════════════════════════════════════════

## Similar to Supabase Database Webhooks/Triggers

```bash
# Connect to PostgreSQL
psql -U alshuail_admin -d alshuail_db
```

## Create notification function:

```sql
-- Function to notify on changes
CREATE OR REPLACE FUNCTION notify_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'db_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'data', CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
        ELSE row_to_json(NEW)
      END,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for members table
DROP TRIGGER IF EXISTS members_notify ON members;
CREATE TRIGGER members_notify
AFTER INSERT OR UPDATE OR DELETE ON members
FOR EACH ROW EXECUTE FUNCTION notify_change();

-- Trigger for payments table
DROP TRIGGER IF EXISTS payments_notify ON payments;
CREATE TRIGGER payments_notify
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION notify_change();

-- Trigger for subscriptions table
DROP TRIGGER IF EXISTS subscriptions_notify ON subscriptions;
CREATE TRIGGER subscriptions_notify
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION notify_change();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Exit psql
\q
```

---

# ═══════════════════════════════════════════════════════════════
# 📊 FINAL VERIFICATION
# ═══════════════════════════════════════════════════════════════

```bash
echo "=========================================="
echo "🔍 FINAL VERIFICATION"
echo "=========================================="

# Check all services
echo -e "\n📦 PM2 Status:"
pm2 status

echo -e "\n🗄️ PostgreSQL Status:"
systemctl status postgresql --no-pager | head -5

echo -e "\n🌐 Nginx Status:"
systemctl status nginx --no-pager | head -5

echo -e "\n🔗 API Health:"
curl -s https://api.alshailfund.com/api/health | jq .

echo -e "\n📁 Storage Stats:"
curl -s https://api.alshailfund.com/api/storage/stats | jq .

echo -e "\n📚 API Docs available at:"
echo "https://api.alshailfund.com/api/docs"

echo -e "\n✅ All Supabase features implemented!"
```

---

# 📋 COMPLETION REPORT

After executing all steps, create report:

```bash
cat > /var/www/PROShael/SUPABASE_FEATURES_COMPLETE.md << 'EOF'
# ✅ Supabase Features Implementation Complete

**Date:** $(date)

## Implemented Features

| # | Feature | Status | URL/Path |
|---|---------|--------|----------|
| 1 | pgAdmin Dashboard | ✅ | http://IP/pgadmin4 |
| 2 | Socket.io Real-time | ✅ | wss://api.alshailfund.com |
| 3 | Storage System | ✅ | /api/storage/* |
| 4 | API Documentation | ✅ | /api/docs |
| 5 | Database Triggers | ✅ | PostgreSQL |

## API Endpoints Added

### Storage API:
- POST /api/storage/:bucket/upload
- POST /api/storage/:bucket/upload-multiple
- DELETE /api/storage/:bucket/:filename
- GET /api/storage/:bucket/list
- GET /api/storage/:bucket/:filename/info
- GET /api/storage/stats
- GET /api/storage/buckets
- POST /api/storage/move
- POST /api/storage/cleanup-temp

### Real-time Events:
- member-change
- payment-change
- subscription-change
- activity-change
- new-notification
- announcement
- dashboard-update

## Files Created

1. /src/services/socketService.js
2. /src/services/storageService.js
3. /src/routes/storage.routes.js
4. /src/config/swagger.js

## Comparison

| Feature | Supabase | VPS |
|---------|----------|-----|
| Dashboard | ✅ Built-in | ✅ pgAdmin |
| Real-time | ✅ Built-in | ✅ Socket.io |
| Storage | ✅ Built-in | ✅ Custom |
| Auth | ✅ Built-in | ✅ JWT/OTP |
| API Docs | ✅ Auto | ✅ Swagger |
| Triggers | ✅ Built-in | ✅ PostgreSQL |

## 🎉 All Supabase features now available on VPS!
EOF

cat /var/www/PROShael/SUPABASE_FEATURES_COMPLETE.md
```

---

# 🚀 EXECUTE NOW!

Run each section in order. Report after each checkpoint.

**Estimated Time: 45-60 minutes**

**Good luck!** 🎉
