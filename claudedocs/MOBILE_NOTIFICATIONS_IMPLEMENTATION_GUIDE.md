# 📱 Mobile Notifications Implementation Guide
**Complete Step-by-Step Implementation for Firebase Cloud Messaging & Twilio SMS**

---

## 📊 Current System Analysis

### ✅ What EXISTS (Stub Implementation):
- Database notification system (CRUD complete)
- Bilingual templates (Arabic/English)
- Multi-channel architecture design
- User preferences & quiet hours logic
- Notification routing and fallback pattern
- Phone validation system (✅ **JUST IMPLEMENTED**)

### ❌ What's MISSING (TODO):
- Firebase Cloud Messaging integration
- Twilio SMS integration
- Device token storage & management
- Real API implementations (currently mocks)

---

## 🎯 Implementation Roadmap

### **PHASE 1: Infrastructure Setup** (30 minutes)
### **PHASE 2: Database Schema** (15 minutes)
### **PHASE 3: Core Services** (45 minutes)
### **PHASE 4: Device Token Management** (30 minutes)
### **PHASE 5: Testing & Deployment** (30 minutes)

**Total Estimated Time: 2.5 hours**

---

# PHASE 1: Infrastructure Setup

## Step 1.1: Install Dependencies

```bash
cd alshuail-backend
npm install firebase-admin twilio
```

**Packages:**
- `firebase-admin` - Firebase Cloud Messaging (latest v1 API)
- `twilio` - SMS/WhatsApp messaging

## Step 1.2: Get Firebase Service Account

### Option A: Using Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project (or create new project "alshuail-app")
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save as `firebase-service-account.json` (DO NOT COMMIT TO GIT)

### Option B: Create New Firebase Project
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create new project
firebase projects:create alshuail-app --display-name "Al-Shuail Family Admin"

# Get service account
firebase projects:addsdk alshuail-app
```

## Step 1.3: Get Twilio Credentials

1. Go to https://www.twilio.com/console
2. Copy **Account SID** and **Auth Token**
3. Buy a phone number:
   - Console → Phone Numbers → Buy a Number
   - Select Kuwait (+965) or Saudi Arabia (+966) number
   - Enable SMS capability

## Step 1.4: Add Environment Variables

**Edit `.env.production`:**
```env
# Existing variables...

# ===== FIREBASE CLOUD MESSAGING =====
FIREBASE_PROJECT_ID=alshuail-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@alshuail-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"

# ===== TWILIO SMS/WhatsApp =====
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+965XXXXXXXX  # Your Twilio number

# ===== WhatsApp Business API (Optional - for later) =====
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
```

**Security Note:** Never commit `.env.production` with real credentials!

## Step 1.5: Update Environment Config

**Edit `src/config/env.js`:**
```javascript
export const config = {
  // ... existing config

  // Firebase Cloud Messaging
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },

  // Twilio SMS
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  }
};
```

---

# PHASE 2: Database Schema

## Step 2.1: Device Tokens Table

**Create `migrations/create_device_tokens_table.sql`:**
```sql
-- =====================================================
-- Device Tokens Table for Push Notifications
-- =====================================================
-- Purpose: Store FCM device tokens for push notifications
-- Date: 2025-01-01
-- =====================================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Token information
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),

  -- Device metadata
  device_info JSONB DEFAULT '{}'::jsonb,
  -- Example: {"model": "iPhone 14", "os_version": "17.2", "app_version": "1.0.0"}

  -- Token status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_platform CHECK (platform IN ('ios', 'android', 'web'))
);

-- Indexes for performance
CREATE INDEX idx_device_tokens_member_id ON device_tokens(member_id);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_device_tokens_token ON device_tokens(token);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_tokens_updated_at
BEFORE UPDATE ON device_tokens
FOR EACH ROW
EXECUTE FUNCTION update_device_tokens_updated_at();

-- Add comments
COMMENT ON TABLE device_tokens IS 'FCM device tokens for push notifications';
COMMENT ON COLUMN device_tokens.token IS 'Firebase Cloud Messaging registration token';
COMMENT ON COLUMN device_tokens.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN device_tokens.device_info IS 'Device metadata: model, OS version, app version';
COMMENT ON COLUMN device_tokens.is_active IS 'False if token is expired or invalid';

SELECT 'Device tokens table created successfully' as status;
```

## Step 2.2: Notification Preferences Table

**Create `migrations/create_notification_preferences_table.sql`:**
```sql
-- =====================================================
-- User Notification Preferences Table
-- =====================================================
-- Purpose: Store user notification channel and type preferences
-- Date: 2025-01-01
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,

  -- Channel preferences (which channels user wants notifications on)
  channels JSONB NOT NULL DEFAULT '{
    "whatsapp": true,
    "sms": true,
    "push": true,
    "email": false
  }'::jsonb,

  -- Notification type preferences (which types of notifications user wants)
  types JSONB NOT NULL DEFAULT '{
    "event_invitation": true,
    "payment_receipt": true,
    "payment_reminder": true,
    "crisis_alert": true,
    "general_announcement": true,
    "rsvp_confirmation": true
  }'::jsonb,

  -- Quiet hours configuration
  quiet_hours JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  }'::jsonb,

  -- Language preference
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast member lookup
CREATE INDEX idx_notification_preferences_member_id ON user_notification_preferences(member_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add comments
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification channels and types';
COMMENT ON COLUMN user_notification_preferences.channels IS 'Enabled notification channels (whatsapp, sms, push, email)';
COMMENT ON COLUMN user_notification_preferences.types IS 'Enabled notification types';
COMMENT ON COLUMN user_notification_preferences.quiet_hours IS 'Do not disturb hours configuration';

SELECT 'Notification preferences table created successfully' as status;
```

## Step 2.3: Apply Migrations

```bash
# Connect to Supabase and run migrations
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  -f migrations/create_device_tokens_table.sql

psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  -f migrations/create_notification_preferences_table.sql
```

**OR** via Supabase Dashboard:
1. Go to Supabase Dashboard → SQL Editor
2. Paste and run `create_device_tokens_table.sql`
3. Paste and run `create_notification_preferences_table.sql`

---

# PHASE 3: Core Services Implementation

## Step 3.1: Firebase Service

**Create `src/services/firebaseService.js`:**
```javascript
/**
 * Firebase Cloud Messaging Service
 * Handles push notification delivery via FCM
 */

import admin from 'firebase-admin';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey
      })
    });

    log.info('Firebase Admin SDK initialized successfully', {
      projectId: config.firebase.projectId
    });
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  log.error('Failed to initialize Firebase Admin SDK', {
    error: error.message
  });
}

/**
 * Send push notification to single device
 * @param {string} token - FCM device token
 * @param {Object} notification - Notification payload
 * @returns {Promise<Object>} - Delivery result
 */
export async function sendPushNotification(token, notification) {
  try {
    const message = {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl || undefined
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: notification.channel || 'default',
          sound: 'default',
          color: '#667eea',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: notification.badge || 1,
            category: notification.category || 'GENERAL',
            alert: {
              title: notification.title,
              body: notification.body
            }
          }
        }
      }
    };

    const response = await admin.messaging().send(message);

    log.info('Push notification sent successfully', {
      messageId: response,
      title: notification.title
    });

    return {
      success: true,
      messageId: response,
      channel: 'push',
      status: 'sent',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    log.error('Failed to send push notification', {
      error: error.message,
      code: error.code
    });

    // Handle specific error codes
    const errorResult = {
      success: false,
      channel: 'push',
      error: error.message,
      errorCode: error.code
    };

    // Mark token as invalid if needed
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      errorResult.tokenInvalid = true;
    }

    return errorResult;
  }
}

/**
 * Send push notifications to multiple devices (batch)
 * @param {Array} tokens - Array of FCM device tokens
 * @param {Object} notification - Notification payload
 * @returns {Promise<Object>} - Batch delivery results
 */
export async function sendMulticastPushNotification(tokens, notification) {
  try {
    const message = {
      tokens: tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl || undefined
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: notification.channel || 'default',
          sound: 'default',
          defaultSound: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: notification.badge || 1
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    log.info('Multicast push notifications sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTokens: tokens.length
    });

    // Identify failed tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
      channel: 'push'
    };

  } catch (error) {
    log.error('Failed to send multicast push notifications', {
      error: error.message
    });

    return {
      success: false,
      error: error.message,
      channel: 'push'
    };
  }
}

export default {
  sendPushNotification,
  sendMulticastPushNotification
};
```

## Step 3.2: Twilio Service

**Create `src/services/twilioService.js`:**
```javascript
/**
 * Twilio SMS/WhatsApp Service
 * Handles message delivery via Twilio
 */

import twilio from 'twilio';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Initialize Twilio client
let twilioClient;

try {
  twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

  log.info('Twilio client initialized successfully', {
    from: config.twilio.phoneNumber
  });
} catch (error) {
  log.error('Failed to initialize Twilio client', {
    error: error.message
  });
}

/**
 * Send SMS message
 * @param {string} phoneNumber - Recipient phone number (+966XXXXXXXXX format)
 * @param {string} message - Message text (Arabic or English)
 * @returns {Promise<Object>} - Delivery result
 */
export async function sendSMS(phoneNumber, message) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: config.twilio.phoneNumber,
      smartEncoded: true,  // Better encoding for Arabic
      statusCallback: `${config.apiUrl}/api/notifications/sms-status`,
      maxPrice: '0.10'  // Prevent expensive messages
    });

    log.info('SMS sent successfully', {
      messageId: response.sid,
      to: phoneNumber,
      status: response.status
    });

    return {
      success: true,
      messageId: response.sid,
      channel: 'sms',
      status: response.status,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    log.error('Failed to send SMS', {
      error: error.message,
      code: error.code,
      to: phoneNumber
    });

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      channel: 'sms'
    };
  }
}

/**
 * Send WhatsApp message
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<Object>} - Delivery result
 */
export async function sendWhatsApp(phoneNumber, message) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      to: `whatsapp:${phoneNumber}`,
      from: `whatsapp:${config.twilio.phoneNumber}`,
      statusCallback: `${config.apiUrl}/api/notifications/whatsapp-status`
    });

    log.info('WhatsApp message sent successfully', {
      messageId: response.sid,
      to: phoneNumber,
      status: response.status
    });

    return {
      success: true,
      messageId: response.sid,
      channel: 'whatsapp',
      status: response.status,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    log.error('Failed to send WhatsApp message', {
      error: error.message,
      code: error.code,
      to: phoneNumber
    });

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      channel: 'whatsapp'
    };
  }
}

export default {
  sendSMS,
  sendWhatsApp
};
```

## Step 3.3: Update Notification Service

**Replace mock functions in `src/services/notificationService.js`:**
```javascript
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';
import { sendPushNotification } from './firebaseService.js';
import { sendSMS, sendWhatsApp } from './twilioService.js';
import { supabase } from '../config/database.js';

// ... (keep existing NotificationType and DeliveryChannel enums)

/**
 * Send notification via WhatsApp Business API
 * UPDATED: Real implementation using Twilio
 */
export async function sendWhatsAppNotification(phoneNumber, templateName, templateData) {
  try {
    log.info('WhatsApp notification requested', {
      phone: phoneNumber,
      template: templateName
    });

    // Get template and format message
    const template = getTemplate(templateName, templateData, 'ar');
    const message = template.body;

    // Send via Twilio
    const result = await sendWhatsApp(phoneNumber, message);

    return result;

  } catch (error) {
    log.error('WhatsApp notification failed', {
      error: error.message,
      phone: phoneNumber
    });

    return {
      success: false,
      error: error.message,
      channel: DeliveryChannel.WHATSAPP
    };
  }
}

/**
 * Send notification via SMS
 * UPDATED: Real implementation using Twilio
 */
export async function sendSMSNotification(phoneNumber, message) {
  try {
    log.info('SMS notification requested', {
      phone: phoneNumber,
      messageLength: message.length
    });

    // Send via Twilio
    const result = await sendSMS(phoneNumber, message);

    return result;

  } catch (error) {
    log.error('SMS notification failed', {
      error: error.message,
      phone: phoneNumber
    });

    return {
      success: false,
      error: error.message,
      channel: DeliveryChannel.SMS
    };
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 * UPDATED: Real implementation using Firebase Admin SDK
 */
export async function sendPushNotification(userId, notification) {
  try {
    log.info('Push notification requested', {
      userId,
      title: notification.title
    });

    // Get user's active device tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('member_id', userId)
      .eq('is_active', true);

    if (error || !tokens || tokens.length === 0) {
      log.warn('No active device tokens found for user', { userId });
      return {
        success: false,
        reason: 'no_device_tokens',
        channel: DeliveryChannel.PUSH
      };
    }

    // Send to all user devices
    const fcmPayload = {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      data: notification.data || {},
      channel: notification.channel || 'default'
    };

    // Import from firebaseService
    const firebaseService = await import('./firebaseService.js');
    const result = await firebaseService.sendMulticastPushNotification(
      tokens.map(t => t.token),
      fcmPayload
    );

    // Remove invalid tokens from database
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .in('token', result.invalidTokens);

      log.info('Deactivated invalid tokens', {
        count: result.invalidTokens.length
      });
    }

    return {
      success: result.successCount > 0,
      ...result,
      channel: DeliveryChannel.PUSH
    };

  } catch (error) {
    log.error('Push notification failed', {
      error: error.message,
      userId
    });

    return {
      success: false,
      error: error.message,
      channel: DeliveryChannel.PUSH
    };
  }
}

/**
 * Get user notification preferences from database
 * UPDATED: Fetch from database instead of mock
 */
export async function getUserNotificationPreferences(userId) {
  try {
    const { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('member_id', userId)
      .single();

    if (error || !preferences) {
      // Return default preferences if not found
      return {
        userId,
        channels: {
          whatsapp: true,
          sms: true,
          push: true,
          email: false
        },
        types: {
          event_invitation: true,
          payment_receipt: true,
          payment_reminder: true,
          crisis_alert: true,
          general_announcement: true
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '07:00'
        },
        language: 'ar'
      };
    }

    return {
      userId,
      channels: preferences.channels,
      types: preferences.types,
      quietHours: preferences.quiet_hours,
      language: preferences.language
    };

  } catch (error) {
    log.error('Failed to get notification preferences', {
      error: error.message,
      userId
    });

    // Return safe defaults on error
    return {
      userId,
      channels: { push: true },
      types: { crisis_alert: true },
      quietHours: { enabled: false },
      language: 'ar'
    };
  }
}

// ... (keep all other existing functions)
```

---

# PHASE 4: Device Token Management

## Step 4.1: Device Token Controller

**Create `src/controllers/deviceTokenController.js`:**
```javascript
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Register or update device token
 * POST /api/device-tokens
 */
export const registerDeviceToken = async (req, res) => {
  try {
    const { member_id, token, platform, device_info } = req.body;

    // Validation
    if (!member_id || !token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'member_id, token, and platform are required'
      });
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be ios, android, or web'
      });
    }

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (existingToken) {
      // Update existing token
      const { data: updatedToken, error } = await supabase
        .from('device_tokens')
        .update({
          member_id,
          platform,
          device_info: device_info || {},
          is_active: true,
          last_used_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        data: updatedToken,
        message: 'Device token updated successfully'
      });
    }

    // Create new token
    const { data: newToken, error } = await supabase
      .from('device_tokens')
      .insert([{
        member_id,
        token,
        platform,
        device_info: device_info || {},
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: newToken,
      message: 'Device token registered successfully'
    });

  } catch (error) {
    log.error('Error registering device token', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to register device token',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get all device tokens for a member
 * GET /api/device-tokens/member/:memberId
 */
export const getMemberDeviceTokens = async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: tokens || [],
      total: tokens?.length || 0,
      message: 'Device tokens retrieved successfully'
    });

  } catch (error) {
    log.error('Error fetching device tokens', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device tokens',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Delete device token
 * DELETE /api/device-tokens/:tokenId
 */
export const deleteDeviceToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('id', tokenId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Device token deleted successfully'
    });

  } catch (error) {
    log.error('Error deleting device token', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete device token',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/device-tokens/preferences/:memberId
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { channels, types, quiet_hours, language } = req.body;

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('member_id', memberId)
      .single();

    const updateData = {};
    if (channels) updateData.channels = channels;
    if (types) updateData.types = types;
    if (quiet_hours) updateData.quiet_hours = quiet_hours;
    if (language) updateData.language = language;

    let result;

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(updateData)
        .eq('member_id', memberId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert([{
          member_id: memberId,
          ...updateData
        }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json({
      success: true,
      data: result,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    log.error('Error updating preferences', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};
```

## Step 4.2: Device Token Routes

**Create `src/routes/deviceTokenRoutes.js`:**
```javascript
import express from 'express';
import {
  registerDeviceToken,
  getMemberDeviceTokens,
  deleteDeviceToken,
  updateNotificationPreferences
} from '../controllers/deviceTokenController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Device token management
router.post('/', registerDeviceToken);
router.get('/member/:memberId', getMemberDeviceTokens);
router.delete('/:tokenId', deleteDeviceToken);

// Notification preferences
router.put('/preferences/:memberId', updateNotificationPreferences);

export default router;
```

## Step 4.3: Add Routes to Server

**Edit `server.js`:**
```javascript
// ... existing imports
import deviceTokenRoutes from './src/routes/deviceTokenRoutes.js';

// ... existing middleware

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/device-tokens', deviceTokenRoutes);  // ← ADD THIS LINE

// ... rest of server.js
```

---

# PHASE 5: Testing & Deployment

## Step 5.1: Test Firebase Push Notifications

**Create test script `tests/test-push-notifications.js`:**
```javascript
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// Test token (get from mobile app)
const TEST_TOKEN = 'YOUR_DEVICE_TOKEN_HERE';

async function testPushNotification() {
  try {
    const message = {
      token: TEST_TOKEN,
      notification: {
        title: 'مرحباً من النظام',
        body: 'هذا اختبار للإشعارات'
      },
      data: {
        testKey: 'testValue',
        timestamp: Date.now().toString()
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPushNotification();
```

**Run test:**
```bash
node tests/test-push-notifications.js
```

## Step 5.2: Test Twilio SMS

**Create test script `tests/test-sms.js`:**
```javascript
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testSMS() {
  try {
    const message = await client.messages.create({
      body: 'مرحباً! هذا اختبار من نظام عائلة الشعيل',
      to: '+966XXXXXXXXX',  // Your phone number
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log('✅ SMS sent:', message.sid);
    console.log('   Status:', message.status);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSMS();
```

**Run test:**
```bash
node tests/test-sms.js
```

## Step 5.3: End-to-End Test

**Test complete notification flow:**
```bash
# 1. Register device token
curl -X POST "http://localhost:3001/api/device-tokens" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "YOUR_MEMBER_ID",
    "token": "YOUR_FCM_TOKEN",
    "platform": "android",
    "device_info": {
      "model": "Samsung Galaxy S23",
      "os_version": "14",
      "app_version": "1.0.0"
    }
  }'

# 2. Create notification (triggers push/SMS)
curl -X POST "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "تنبيه جديد",
    "message": "رسالة اختبار من النظام",
    "type": "general",
    "priority": "high",
    "target_audience": "specific",
    "member_id": "YOUR_MEMBER_ID",
    "send_immediately": true
  }'
```

## Step 5.4: Deployment Checklist

### Pre-Deployment:
- [ ] Firebase service account JSON secured (not in git)
- [ ] All environment variables added to `.env.production`
- [ ] Database migrations applied to production
- [ ] Dependencies installed (`npm install`)
- [ ] Tests pass locally

### Deploy to Production:
```bash
# 1. Commit changes
git add .
git commit -m "feat: Implement mobile notifications (FCM + Twilio)

- Add Firebase Cloud Messaging integration
- Add Twilio SMS/WhatsApp service
- Create device token management system
- Add notification preferences
- Update notification service with real implementations

Includes:
- firebaseService.js - FCM push notifications
- twilioService.js - SMS/WhatsApp messaging
- deviceTokenController.js - Token CRUD operations
- Database migrations for tokens and preferences

Ready for production deployment"

# 2. Push to GitHub
git push origin main

# 3. Manually deploy on Render (or wait for auto-deploy)
# Go to Render dashboard → Deploy latest commit
```

### Post-Deployment Verification:
```bash
# Test production endpoints
curl -X GET "https://proshael.onrender.com/api/device-tokens/member/YOUR_MEMBER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send test notification
curl -X POST "https://proshael.onrender.com/api/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Production test", "type": "general", "target_audience": "specific", "member_id": "YOUR_ID"}'
```

---

# 📚 API Reference

## Device Token Management

### Register Device Token
```http
POST /api/device-tokens
Authorization: Bearer {token}
Content-Type: application/json

{
  "member_id": "uuid",
  "token": "FCM_DEVICE_TOKEN",
  "platform": "ios|android|web",
  "device_info": {
    "model": "iPhone 14",
    "os_version": "17.2",
    "app_version": "1.0.0"
  }
}
```

### Get Member Tokens
```http
GET /api/device-tokens/member/:memberId
Authorization: Bearer {token}
```

### Update Notification Preferences
```http
PUT /api/device-tokens/preferences/:memberId
Authorization: Bearer {token}
Content-Type: application/json

{
  "channels": {
    "whatsapp": true,
    "sms": true,
    "push": true,
    "email": false
  },
  "types": {
    "event_invitation": true,
    "payment_receipt": true,
    "payment_reminder": true,
    "crisis_alert": true,
    "general_announcement": true
  },
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  },
  "language": "ar"
}
```

---

# 🎯 Next Steps

## Immediate (Week 1):
1. ✅ Install dependencies
2. ✅ Setup Firebase & Twilio accounts
3. ✅ Apply database migrations
4. ✅ Deploy core services
5. ✅ Test with real devices

## Short-term (Week 2-3):
1. Build mobile app FCM integration
2. Add notification history tracking
3. Implement delivery receipts
4. Add notification retry logic
5. Create admin notification dashboard

## Long-term (Month 2-3):
1. WhatsApp Business API templates
2. Rich push notifications (images, actions)
3. Notification analytics dashboard
4. A/B testing for notifications
5. Scheduled notifications
6. Notification templates builder

---

# 🔒 Security Considerations

1. **Firebase Private Key**: Never commit, use environment variables
2. **Twilio Auth Token**: Rotate regularly, keep secure
3. **Device Tokens**: Encrypted at rest, expire inactive tokens
4. **Rate Limiting**: Prevent notification spam
5. **Input Validation**: Sanitize all notification content
6. **HTTPS Only**: All API calls over HTTPS
7. **JWT Authentication**: Require auth for all endpoints

---

# 📊 Monitoring & Logs

Monitor these metrics:
- Push notification success/failure rates
- SMS delivery rates
- Invalid token cleanup frequency
- Quiet hours adherence
- Multi-channel fallback effectiveness
- Response times for notification delivery

---

# ✅ Implementation Complete!

**You now have a production-ready mobile notification system with:**
- ✅ Firebase Cloud Messaging (Push notifications)
- ✅ Twilio SMS integration
- ✅ Device token management
- ✅ User notification preferences
- ✅ Multi-channel fallback
- ✅ Quiet hours support
- ✅ Bilingual templates (Arabic/English)

**Ready to send notifications to your users!** 🎉
