import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
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

dotenv.config();

// Check JWT_SECRET but don't throw error - just warn
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using fallback secret for development.');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'alshuail-dev-secret-2024-very-long-and-secure';
}

const app = express();
const PORT = process.env.PORT || 3001;
// Deploy trigger: Member monitoring support added

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://alshuail-admin.pages.dev',
    'https://alshuail-admin.pages.dev',
    'http://localhost:3002',
    'http://localhost:3000'
  ],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Configure JSON parsing with UTF-8 support for Arabic text
app.use(express.json({
  limit: '10mb',
  type: 'application/json'
}));
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Al-Shuail Backend API'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'حدث خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Warning: Database connection could not be verified');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Al-Shuail API Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:3002`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();


