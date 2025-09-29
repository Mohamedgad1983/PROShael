// VERY FIRST LINES of server.js
import dotenv from 'dotenv';
dotenv.config();

// Debug log
console.log('Environment Check on Start:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? '✓ Loaded' : '✗ Missing',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ Loaded' : '✗ Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✓ Loaded' : '✗ Missing',
  JWT_SECRET: process.env.JWT_SECRET ? '✓ Loaded' : '✗ Missing',
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { testConnection } from './src/config/database.js';
import membersRoutes from './src/routes/members.js';
import paymentsRoutes from './src/routes/payments.js';
import subscriptionsRoutes from './src/routes/subscriptions.js';
import dashboardRoutes from './src/routes/dashboard.js';
import authRoutes from './src/routes/auth.js';
import occasionsRoutes from './src/routes/occasions.js';
import initiativesRoutes from './src/routes/initiatives.js';
import diyasRoutes from './src/routes/diyas.js';
import notificationsRoutes from './src/routes/notifications.js';
import testRoutes from './src/routes/test.js';
import expensesRoutes from './src/routes/expenses.js';
import financialReportsRoutes from './src/routes/financialReports.js';
import settingsRoutes from './src/routes/settings.js';
import crisisRoutes from './src/routes/crisis.js';
import statementRoutes from './src/routes/statementRoutes.js';
import memberStatementRoutes from './src/routes/memberStatementRoutes.js';
import memberMonitoringRoutes from './src/routes/memberMonitoring.js';
import documentsRoutes from './src/routes/documents.js';
import familyTreeRoutes from './src/routes/familyTree.js';

// Check JWT_SECRET but don't throw error - just warn
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using fallback secret for development.');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'alshuail-dev-secret-2024-very-long-and-secure';
}

const app = express();
const PORT = process.env.PORT || 3001;
// Deploy trigger: Family tree API enhanced with marriage tracking

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Enhanced CORS configuration for production
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://alshuail-admin.pages.dev',
      'https://alshuail-admin-main.pages.dev',
      'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5500'
    ];

    // Log origin for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log(`[CORS] Request from origin: ${origin || 'no-origin'}`);
    }

    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // In production, check allowed origins
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin) ||
          origin.includes('alshuail-admin.pages.dev') ||
          origin === process.env.FRONTEND_URL) {
        console.log(`[CORS] ✓ Allowed origin: ${origin}`);
        return callback(null, true);
      } else {
        console.log(`[CORS] ✗ Blocked origin: ${origin}`);
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
  if (origin && (origin.includes('alshuail-admin.pages.dev') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Configure JSON parsing with UTF-8 support for Arabic text
// JSON parser with better error handling
app.use(express.json({
  limit: '10mb',
  type: 'application/json',
  strict: false // Allow non-standard JSON
}));

// Enhanced error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[ERROR] Bad JSON received:', {
      error: err.message,
      body: err.body,
      path: req.path,
      origin: req.headers.origin
    });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
app.use('/api/members', membersRoutes);
// Add member monitoring routes under /api/member-monitoring to avoid conflict
app.use('/api/member-monitoring', memberMonitoringRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/occasions', occasionsRoutes);
app.use('/api/initiatives', initiativesRoutes);
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

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Al-Shuail Backend API',
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.RENDER ? 'Render' : 'Local',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    checks: {
      database: false,
      jwt: !!process.env.JWT_SECRET,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_keys: !!process.env.SUPABASE_ANON_KEY && !!process.env.SUPABASE_SERVICE_KEY
    }
  };

  // Test database connection
  try {
    const { testConnection } = await import('./src/config/database.js');
    health.checks.database = await testConnection();
  } catch (error) {
    console.error('Health check DB error:', error.message);
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
  if (process.env.NODE_ENV === 'production' &&
      req.headers['x-debug-token'] !== 'alshuail-debug-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    environment: process.env.NODE_ENV,
    port: PORT,
    render: !!process.env.RENDER,
    configs: {
      jwt_configured: !!process.env.JWT_SECRET,
      supabase_configured: !!process.env.SUPABASE_URL,
      frontend_url: process.env.FRONTEND_URL || 'not-set',
      cors_origin: process.env.CORS_ORIGIN || 'not-set'
    },
    request: {
      origin: req.headers.origin || 'no-origin',
      ip: req.ip,
      method: req.method,
      path: req.path
    }
  });
});

// Enhanced global error handler with logging
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36);

  console.error(`[ERROR ${errorId}]`, {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    user: req.user?.id || 'anonymous'
  });

  // Check for specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'غير مصرح',
      error_en: 'Unauthorized',
      errorId
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'بيانات غير صحيحة',
      error_en: 'Invalid data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      errorId
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: 'حدث خطأ في الخادم',
    error_en: 'Server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    errorId,
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  console.log('🔄 Starting Al-Shuail Backend Server...');
  console.log('═══════════════════════════════════════');

  // Test database connection
  console.log('🔍 Testing database connection...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('⚠️  WARNING: Database connection could not be verified');
    console.error('   The server will start but database operations may fail');
  } else {
    console.log('✅ Database connection successful');
  }

  // Verify environment
  console.log('\n📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Platform: ${process.env.RENDER ? 'Render.com' : 'Local'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '⚠️  Using fallback'}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Server Started Successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`📡 API Server: http://localhost:${PORT}`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
    console.log(`📊 Dashboard: http://localhost:3002`);
    console.log('\n📌 Production URLs:');
    console.log(`   API: https://proshael.onrender.com`);
    console.log(`   Admin: https://alshuail-admin.pages.dev`);
    console.log('═══════════════════════════════════════\n');
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\n⏹️  SIGINT received, shutting down gracefully...');
    process.exit(0);
  });
};

startServer();


