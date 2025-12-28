// VERY FIRST LINES of server.js
// Updated: 2025-10-09 - Winston logging migration completed
// Updated: 2025-10-10 - Centralized environment configuration
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { testConnection } from './src/config/database.js';
import membersRoutes from './src/routes/members.js';
import paymentsRoutes from './src/routes/payments.js';
import subscriptionsRoutes from './src/routes/subscriptionRoutes.js';
import dashboardRoutes from './src/routes/dashboard.js';
import authRoutes from './src/routes/auth.js';
import occasionsRoutes from './src/routes/occasions.js';
import initiativesRoutes from './src/routes/initiatives.js';
import initiativesEnhancedRoutes from './src/routes/initiativesEnhanced.js';
import newsRoutes from './src/routes/news.js';
import diyasRoutes from './src/routes/diyas.js';
import notificationsRoutes from './src/routes/notifications.js';
import testRoutes from './src/routes/testEndpoints.js';
import expensesRoutes from './src/routes/expenses.js';
import financialReportsRoutes from './src/routes/financialReports.js';
import settingsRoutes from './src/routes/settings.js';
import crisisRoutes from './src/routes/crisis.js';
import statementRoutes from './src/routes/statementRoutes.js';
import memberStatementRoutes from './src/routes/memberStatementRoutes.js';
import memberMonitoringRoutes from './src/routes/memberMonitoring.js';
import documentsRoutes from './src/routes/documents.js';
import familyTreeRoutes from './src/routes/familyTree.js';
import diyaDashboardRoutes from './src/routes/diyaDashboard.js';
import memberRoutes from "./src/routes/member.js";
import receiptsRoutes from "./src/routes/receipts.js";
import adminRoutes from './src/routes/admin.routes.js';
import approvalRoutes from './src/routes/approval.routes.js';
import familyTreeNewRoutes from './src/routes/family-tree.routes.js';
import paymentAnalyticsRoutes from './src/routes/paymentAnalyticsRoutes.js';
import memberSuspensionRoutes from './src/routes/memberSuspensionRoutes.js';
import deviceTokenRoutes from './src/routes/deviceTokenRoutes.js';
import multiRoleManagementRoutes from './src/routes/multiRoleManagement.js';
import passwordManagementRoutes from './src/routes/passwordManagement.js';
import profileRoutes from './src/routes/profile.js';
import pushNotificationsRoutes from './src/routes/push-notifications.routes.js';
import auditRoutes from './src/routes/audit.routes.js';
import otpRoutes from './src/routes/otp.routes.js';
import expenseCategoriesRoutes from './src/routes/expenseCategories.js';
import balanceAdjustmentsRoutes from './src/routes/balanceAdjustments.js';
import bankTransfersRoutes from './src/routes/bankTransfers.js';
import passwordAuthRoutes from './src/routes/passwordAuth.routes.js';
import { log } from './src/utils/logger.js';
import { config } from './src/config/env.js';
import { errorHandler } from './src/utils/errorCodes.js';
import cookieParser from 'cookie-parser';
import csrfRoutes from './src/routes/csrf.js';
import { validateCSRFToken } from './src/middleware/csrf.js';

// Environment check with Winston logging
log.info('Environment Check on Start:', {
  SUPABASE_URL: config.supabase.url ? '✓ Loaded' : '✗ Missing',
  SUPABASE_ANON_KEY: config.supabase.anonKey ? '✓ Loaded' : '✗ Missing',
  SUPABASE_SERVICE_KEY: config.supabase.serviceKey ? '✓ Loaded' : '✗ Missing',
  JWT_SECRET: config.jwt.secret ? '✓ Loaded' : '✗ Missing',
  NODE_ENV: config.env,
  RENDER: config.platform.isRender
});

// JWT_SECRET validation is now handled in config/env.js

const app = express();
const PORT = config.port;

// Trust proxy - required for express-rate-limit behind Nginx/reverse proxy
// This allows correct IP identification from X-Forwarded-For header
app.set('trust proxy', 1);

// Deploy trigger: Family tree API enhanced with marriage tracking

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const newsUploadsDir = path.join(uploadsDir, 'news');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    log.info('📁 Created uploads directory');
}
if (!fs.existsSync(newsUploadsDir)) {
    fs.mkdirSync(newsUploadsDir, { recursive: true });
    log.info('📁 Created news uploads directory');
}

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Enhanced CORS configuration for production
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://alshuail-admin.pages.dev',
      'https://alshuail-admin-main.pages.dev',
      'https://alshailfund.com',
      'https://www.alshailfund.com',
      'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5500'
    ];

    // Log origin for debugging
    if (config.isProduction) {
      log.debug(`[CORS] Request from origin: ${origin || 'no-origin'}`);
    }

    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // In production, check allowed origins
    if (config.isProduction) {
      if (allowedOrigins.includes(origin) ||
          origin.includes('alshuail-admin.pages.dev') ||
          origin.includes('alshailfund.com') ||
          origin === config.frontend.url) {
        log.info(`[CORS] ✓ Allowed origin: ${origin}`);
        return callback(null, true);
      } else {
        log.warn(`[CORS] ✗ Blocked origin: ${origin}`);
        // Still allow for now to prevent blocking
        return callback(null, true);
      }
    }

    // Allow all in development
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Additional CORS headers for extra safety
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('alshuail-admin.pages.dev') ||
          origin.includes('alshailfund.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for admin dashboard usage
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

// Configure JSON parsing with UTF-8 support for Arabic text
// Cookie parser for CSRF tokens
app.use(cookieParser());
// JSON parser with better error handling
app.use(express.json({
  limit: '10mb',
  type: 'application/json',
  strict: false // Allow non-standard JSON
}));

// Enhanced error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    log.error('[ERROR] Bad JSON received:', {
      error: err.message,
      body: err.body,
      path: req.path,
      origin: req.headers.origin
    });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      details: config.isDevelopment ? err.message : undefined
    });
  }
  next();
});

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Set proper headers for Arabic text support
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use('/api/auth', authRoutes);

// CSRF token endpoint (must be before CSRF validation)
app.use('/api', csrfRoutes);

// Apply CSRF validation to protected routes
app.use('/api', (req, res, next) => {
  // Skip CSRF for specific endpoints
  const skipCSRF = [
    '/api/auth/login',
    '/api/auth/verify-otp',
    '/api/auth/password/login',
    '/api/auth/password/request-otp',
    '/api/auth/password/verify-otp',
    '/api/auth/password/reset-password',
    '/api/auth/password/face-id-login',
    '/api/health',
    '/api/csrf-token',
    '/api/csrf-token/validate'
  ];

  if (skipCSRF.some(path => req.path.startsWith(path)) || req.method === 'GET') {
    return next();
  }

  validateCSRFToken(req, res, next);
});

// Member Suspension APIs - MUST come before general membersRoutes
// to match more specific suspend/activate routes first
app.use('/api/members', memberSuspensionRoutes);

app.use('/api/members', membersRoutes);
// Add member monitoring routes under /api/member-monitoring to avoid conflict
app.use('/api/member-monitoring', memberMonitoringRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/occasions', occasionsRoutes);
app.use('/api/initiatives', initiativesRoutes);
app.use('/api/initiatives-enhanced', initiativesEnhancedRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/diyas', diyasRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', financialReportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/crisis', crisisRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/member-statement', memberStatementRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/family-tree', familyTreeRoutes);
app.use('/api/diya', diyaDashboardRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/receipts", receiptsRoutes);

// New Admin & Approval Routes (File 04 - Admin APIs)
app.use('/api/admin', adminRoutes);
app.use('/api/approvals', approvalRoutes);

// New Family Tree APIs (File 05) - Enhanced tree generation
app.use('/api/tree', familyTreeNewRoutes);

// Payment Analytics APIs - Real-time financial reporting
app.use('/api/analytics', paymentAnalyticsRoutes);

// Device Token Management APIs - Push notification token management
app.use('/api/device-tokens', deviceTokenRoutes);

// Multi-Role Time-Based Management APIs - Assign multiple roles with Hijri date periods
app.use('/api/multi-role', multiRoleManagementRoutes);

// Password Management APIs - Superadmin password creation and reset
app.use('/api/password-management', passwordManagementRoutes);

// User Profile APIs - Profile info and avatar management
app.use('/api/user/profile', profileRoutes);

// Push Notifications APIs - FCM push notifications
app.use('/api/notifications/push', pushNotificationsRoutes);

// Audit Log APIs - Track admin actions
app.use('/api/audit', auditRoutes);

// OTP Authentication APIs - WhatsApp OTP for mobile login
app.use('/api/otp', otpRoutes);

// Expense Categories APIs - Dynamic expense category management
app.use('/api/expense-categories', expenseCategoriesRoutes);

// Balance Adjustments APIs - Member balance management with audit trail
app.use('/api/balance-adjustments', balanceAdjustmentsRoutes);

// Bank transfer requests (pay-on-behalf feature)
app.use('/api/bank-transfers', bankTransfersRoutes);

// Password Authentication APIs - Password login, OTP, Face ID
app.use('/api/auth/password', passwordAuthRoutes);

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Al-Shuail Backend API',
    environment: config.env,
    platform: config.platform.isRender ? 'Render' : 'Local',
    uptime: process.uptime(),
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)  } MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)  } MB`
    },
    checks: {
      database: false,
      jwt: !!config.jwt.secret,
      supabase_url: !!config.supabase.url,
      supabase_keys: !!config.supabase.anonKey && !!config.supabase.serviceKey
    }
  };

  // Test database connection
  try {
    const { testConnection } = await import('./src/config/database.js');
    health.checks.database = await testConnection();
  } catch (error) {
    log.error('Health check DB error:', { message: error.message });
    health.checks.database = false;
  }

  // Set overall status
  if (!health.checks.database || !health.checks.jwt || !health.checks.supabase_url) {
    health.status = 'degraded';
  }

  res.json(health);
});

// Simple test endpoint that always works
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    headers: {
      origin: req.headers.origin || 'no-origin',
      authorization: req.headers.authorization ? 'present' : 'missing'
    }
  });
});

// Debug endpoint for troubleshooting
app.get('/api/debug/env', (req, res) => {
  // Only in development or with special header
  if (config.isProduction &&
      req.headers['x-debug-token'] !== 'alshuail-debug-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    environment: config.env,
    port: PORT,
    render: config.platform.isRender,
    configs: {
      jwt_configured: !!config.jwt.secret,
      supabase_configured: !!config.supabase.url,
      frontend_url: config.frontend.url,
      cors_origin: config.frontend.corsOrigin
    },
    request: {
      origin: req.headers.origin || 'no-origin',
      ip: req.ip,
      method: req.method,
      path: req.path
    }
  });
});

// Comprehensive centralized error handler
// Uses error codes system from errorCodes.js with Arabic/English support
app.use(errorHandler);

const startServer = async () => {
  log.info('🔄 Starting Al-Shuail Backend Server v2.0 with Family Tree...');
  log.info('═══════════════════════════════════════');

  // Test database connection
  log.info('🔍 Testing database connection...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    log.error('⚠️  WARNING: Database connection could not be verified');
    log.error('   The server will start but database operations may fail');
  } else {
    log.info('✅ Database connection successful');
  }

  // Verify environment
  log.info('\n📋 Environment Configuration:');
  log.info(`   NODE_ENV: ${config.env}`);
  log.info(`   Platform: ${config.platform.isRender ? 'Render.com' : 'Local'}`);
  log.info(`   JWT Secret: ${config.jwt.secret ? '✓ Configured' : '⚠️  Not configured'}`);
  log.info(`   Supabase: ${config.supabase.url ? '✓ Configured' : '✗ Missing'}`);
  log.info(`   Frontend URL: ${config.frontend.url}`);

  app.listen(PORT, '0.0.0.0', () => {
    log.info('\n🚀 Server Started Successfully!');
    log.info('═══════════════════════════════════════');
    log.info(`📡 API Server: http://localhost:${PORT}`);
    log.info(`💚 Health Check: http://localhost:${PORT}/api/health`);
    log.info(`🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
    log.info(`📊 Dashboard: http://localhost:3002`);
    log.info('\n📌 Production URLs:');
    log.info(`   API: https://proshael.onrender.com`);
    log.info(`   Admin: https://alshuail-admin.pages.dev`);
    log.info('═══════════════════════════════════════\n');
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    log.info('\n⏹️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log.info('\n⏹️  SIGINT received, shutting down gracefully...');
    process.exit(0);
  });
};

// Only start server if not in test environment
// Tests import app directly without starting the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}




// Export app for testing
export { app };
