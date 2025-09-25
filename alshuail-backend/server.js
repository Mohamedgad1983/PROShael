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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
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