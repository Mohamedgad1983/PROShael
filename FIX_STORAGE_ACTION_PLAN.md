# 🔴 CRITICAL FIX: Replace Supabase Storage with Local File Storage

**Priority**: BLOCKING - Must be fixed before production deployment
**Estimated Time**: 2-3 hours
**Files Affected**: 3 files

---

## Files to Modify

1. **alshuail-backend/config/storage.js** (primary fix)
2. **alshuail-backend/routes/documents.js** (update imports/calls)
3. **alshuail-backend/routes/memberStatement.js** (verify and update if needed)

---

## Step-by-Step Implementation

### Step 1: Prepare Local Storage Directory

```bash
# On VPS server (213.199.62.185)
sudo mkdir -p /var/www/uploads/alshuail/documents
sudo mkdir -p /var/www/uploads/alshuail/receipts
sudo mkdir -p /var/www/uploads/alshuail/statements
sudo chown -R www-data:www-data /var/www/uploads/alshuail
sudo chmod -R 755 /var/www/uploads/alshuail
```

### Step 2: Configure Nginx to Serve Uploads

Add to Nginx config:
```nginx
# In /etc/nginx/sites-available/alshuail
location /uploads/ {
    alias /var/www/uploads/alshuail/;
    autoindex off;
    access_log off;

    # Security: Only serve specific file types
    location ~ \.(jpg|jpeg|png|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Block access to other file types
    location ~ \..* {
        return 403;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Rewrite config/storage.js

Replace the entire file with:

```javascript
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Base upload directory
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/var/www/uploads/alshuail';
const BASE_URL = process.env.API_BASE_URL || 'https://api.alshailfund.com';

// Document categories
export const DOCUMENT_CATEGORIES = {
  RECEIPT: 'receipts',
  STATEMENT: 'statements',
  DOCUMENT: 'documents',
  OTHER: 'other'
};

export const CATEGORY_TRANSLATIONS = {
  receipts: 'إيصالات',
  statements: 'كشوفات',
  documents: 'مستندات',
  other: 'أخرى'
};

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const category = req.body.category || 'documents';
    const uploadPath = path.join(UPLOAD_BASE_DIR, category);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uniqueId}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
};

// Multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

/**
 * Upload file to local storage (replaces uploadToSupabase)
 * @param {Buffer} fileBuffer - File buffer (if using memory storage)
 * @param {string} fileName - File name
 * @param {string} category - Document category (receipts/statements/documents/other)
 * @returns {Promise<{filePath: string, publicUrl: string}>}
 */
export async function uploadToLocalStorage(fileBuffer, fileName, category = 'documents') {
  try {
    const uploadPath = path.join(UPLOAD_BASE_DIR, category);
    await fs.mkdir(uploadPath, { recursive: true });

    const uniqueId = uuidv4();
    const ext = path.extname(fileName);
    const uniqueFileName = `${Date.now()}-${uniqueId}${ext}`;
    const fullPath = path.join(uploadPath, uniqueFileName);

    await fs.writeFile(fullPath, fileBuffer);

    const publicUrl = `${BASE_URL}/uploads/${category}/${uniqueFileName}`;

    return {
      filePath: `${category}/${uniqueFileName}`,
      publicUrl
    };
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Delete file from local storage (replaces deleteFromSupabase)
 * @param {string} filePath - Relative file path (e.g., "receipts/123-uuid.pdf")
 * @returns {Promise<void>}
 */
export async function deleteFromLocalStorage(filePath) {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    // If file doesn't exist, that's okay
    if (error.code !== 'ENOENT') {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }
}

/**
 * Get public URL for file (replaces getSignedUrl)
 * @param {string} filePath - Relative file path (e.g., "receipts/123-uuid.pdf")
 * @returns {string} Public URL
 */
export function getLocalFileUrl(filePath) {
  return `${BASE_URL}/uploads/${filePath}`;
}

/**
 * Check if file exists
 * @param {string} filePath - Relative file path
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 * @param {string} filePath - Relative file path
 * @returns {Promise<{size: number, created: Date, modified: Date}>}
 */
export async function getFileMetadata(filePath) {
  const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
  const stats = await fs.stat(fullPath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime
  };
}

// Export for backward compatibility (rename old functions)
export const uploadToSupabase = uploadToLocalStorage;
export const deleteFromSupabase = deleteFromLocalStorage;
export const getSignedUrl = getLocalFileUrl;
```

### Step 4: Update routes/documents.js

Change the imports at the top:

```javascript
// Old:
import {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
  getSignedUrl,
  supabase,
  DOCUMENT_CATEGORIES,
  CATEGORY_TRANSLATIONS
} from '../config/storage.js';

// New (remove supabase):
import {
  upload,
  uploadToLocalStorage as uploadToSupabase,  // Alias for compatibility
  deleteFromLocalStorage as deleteFromSupabase, // Alias for compatibility
  getLocalFileUrl as getSignedUrl, // Alias for compatibility
  DOCUMENT_CATEGORIES,
  CATEGORY_TRANSLATIONS
} from '../config/storage.js';
```

### Step 5: Update routes/memberStatement.js

Check if it uses Supabase Storage. If yes, update similar to documents.js

### Step 6: Update Environment Variables

Add to `.env`:
```env
UPLOAD_DIR=/var/www/uploads/alshuail
API_BASE_URL=https://api.alshailfund.com
```

### Step 7: Test Locally

```bash
# In alshuail-backend/
npm start

# Test file upload
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.pdf" \
  -F "title=Test Document" \
  -F "category=documents"

# Verify file was created
ls -lh /var/www/uploads/alshuail/documents/
```

### Step 8: Test on VPS

1. Deploy updated code to VPS
2. Restart PM2: `pm2 restart alshuail-backend`
3. Test upload via API
4. Test download via browser: `https://api.alshailfund.com/uploads/documents/FILENAME.pdf`
5. Test delete functionality

### Step 9: Re-run Verification

```bash
# Run the Supabase checks again
grep -rn "@supabase" alshuail-backend/config/ alshuail-backend/routes/
# Should return: 0 results

# Check that storage works
curl https://api.alshailfund.com/api/documents | jq
```

---

## Testing Checklist

- [ ] Local directory created with correct permissions
- [ ] Nginx serves /uploads/ path
- [ ] storage.js uses only fs/path (no @supabase)
- [ ] Document upload works
- [ ] Document download works
- [ ] Document delete works
- [ ] Receipt generation works (if using storage)
- [ ] File size limits enforced
- [ ] File type restrictions work
- [ ] Existing documents still accessible (if any migration needed)
- [ ] Server restart doesn't break uploads
- [ ] Disk space monitoring in place

---

## Rollback Plan (If Issues Arise)

1. Keep old storage.js as storage.js.backup
2. If new version fails:
   ```bash
   cd /var/www/PROShael/alshuail-backend/config
   mv storage.js storage.js.new
   mv storage.js.backup storage.js
   pm2 restart alshuail-backend
   ```
3. Debug the issue
4. Fix and retry

---

## Post-Fix Tasks

1. Update VERIFICATION_REPORT.md status
2. Run full verification again (should get 52/52)
3. Update CLAUDE.md to document local storage
4. Commit changes with message:
   ```
   fix: Replace Supabase Storage with local file storage

   - Rewrote config/storage.js to use fs/path instead of @supabase
   - Updated routes/documents.js and routes/memberStatement.js
   - Configured Nginx to serve /uploads/ directory
   - All file operations now use local filesystem
   - 100% Supabase removal complete

   Closes #003-supabase-to-vps-migration
   ```

---

## Additional Resources

- Multer docs: https://github.com/expressjs/multer
- Node.js fs/promises: https://nodejs.org/api/fs.html#promises-api
- Nginx file serving: https://nginx.org/en/docs/http/ngx_http_core_module.html#alias

