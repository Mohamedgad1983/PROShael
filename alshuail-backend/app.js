const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const activitiesRoutes = require('./routes/activities');
const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const expensesRoutes = require('./routes/expenses');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://alshuail-admin.pages.dev', 'https://alshuail.vercel.app', 'https://your-frontend-domain.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));

// Static files (for uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/activities', activitiesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/expenses', expensesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Al-Shuail Family App Backend is running!',
        message_ar: 'خادم تطبيق عائلة الشعيل يعمل بنجاح!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Al-Shuail Family App API',
        name_ar: 'واجهة برمجة تطبيق عائلة الشعيل',
        version: '1.0.0',
        endpoints: {
            activities: '/api/activities',
            auth: '/api/auth',
            members: '/api/members',
            health: '/health'
        },
        documentation: 'Built with Day 6 components'
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        message: 'حدث خطأ في الخادم',
        message_en: message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار المطلوب غير موجود',
        message_en: 'Route not found',
        requested_path: req.originalUrl
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log('\n🎉 =================================');
    console.log('🚀 Al-Shuail Family App Backend');
    console.log('🎯 Day 6 Complete System Running!');
    console.log('=================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🎭 Activities: http://localhost:${PORT}/api/activities`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});

module.exports = app;
