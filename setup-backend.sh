#!/bin/bash

# =================================================================
# Day 6 Backend Setup Script
# إعداد مشروع Backend مع جميع ملفات Day 6
# =================================================================

echo "🚀 Setting up Al-Shuail Family App Backend..."

# إنشاء هيكل المشروع
mkdir -p alshuail-backend/{controllers,routes,middleware,config,utils}
cd alshuail-backend

# إنشاء package.json
cat > package.json << 'EOF'
{
  "name": "alshuail-family-backend",
  "version": "1.0.0",
  "description": "Al-Shuail Family App Backend - Day 6",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["family", "activities", "charity", "kuwait"],
  "author": "Al-Shuail Family",
  "license": "MIT"
}
EOF

# تثبيت المكتبات المطلوبة
echo "📦 Installing dependencies..."
npm install express cors helmet morgan joi bcryptjs jsonwebtoken
npm install pg uuid multer
npm install dotenv nodemon --save-dev

# إنشاء ملف .env
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alshuail_family_app
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=al-shuail-family-super-secret-jwt-key-2024
JWT_EXPIRE=24h

# App Configuration
PORT=5000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=10mb
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
EOF

# إنشاء ملف app.js الرئيسي
cat > app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const activitiesRoutes = require('./routes/activities');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
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
app.use('*', (req, res) => {
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
EOF

# إنشاء ملف config/database.js
cat > config/database.js << 'EOF'
const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'alshuail_family_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait for a connection
};

const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
    console.log('✅ New client connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
    console.error('❌ Database connection error:', err);
    process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection test failed:', err);
    } else {
        console.log('✅ Database connection test successful:', res.rows[0].now);
    }
});

// Helper function to test database schema
const testDatabaseSchema = async () => {
    try {
        const { rows } = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('main_categories', 'activities', 'financial_contributions')
            ORDER BY table_name
        `);
        
        console.log('📋 Available tables:', rows.map(r => r.table_name).join(', '));
        return rows.length > 0;
    } catch (error) {
        console.error('❌ Database schema test failed:', error.message);
        return false;
    }
};

// Run schema test
testDatabaseSchema().then(hasSchema => {
    if (!hasSchema) {
        console.log('⚠️  Warning: Day 6 database schema not found. Please run the SQL setup script first.');
    } else {
        console.log('✅ Day 6 database schema detected successfully!');
    }
});

module.exports = { 
    pool,
    testDatabaseSchema
};
EOF

# إنشاء ملف middleware/auth.js
cat > middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'رمز الوصول مطلوب',
                message_en: 'Access token required'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const { rows } = await pool.query(
            'SELECT * FROM temp_members WHERE id = $1 AND is_active = true',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود أو غير نشط',
                message_en: 'User not found or inactive'
            });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'رمز وصول غير صحيح',
                message_en: 'Invalid access token'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'رمز الوصول منتهي الصلاحية',
                message_en: 'Access token expired'
            });
        }
        
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الهوية',
            message_en: 'Authentication error'
        });
    }
};

// Authorization middleware
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول',
                message_en: 'Unauthorized access'
            });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول لهذا المحتوى',
                message_en: 'Insufficient permissions',
                required_roles: roles,
                user_role: req.user.role
            });
        }

        next();
    };
};

// Optional authentication (for public endpoints with user context)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const { rows } = await pool.query(
                'SELECT * FROM temp_members WHERE id = $1 AND is_active = true',
                [decoded.id]
            );

            if (rows.length > 0) {
                req.user = rows[0];
            }
        }
        
        next();
    } catch (error) {
        // Ignore auth errors in optional auth
        next();
    }
};

module.exports = { 
    authenticate, 
    authorize, 
    optionalAuth 
};
EOF

# إنشاء ملف utils/dateUtils.js
cat > utils/dateUtils.js << 'EOF'
// Date and formatting utilities for Al-Shuail Family App

const generateHijriDate = (date = new Date()) => {
    try {
        // استخدام Intl.DateTimeFormat للتاريخ الهجري
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            calendar: 'islamic-umalqura',
            locale: 'ar-SA'
        };
        return new Intl.DateTimeFormat('ar-SA', options).format(date);
    } catch (error) {
        console.error('Error generating Hijri date:', error);
        return 'غير متوفر';
    }
};

const formatSAR = (amount) => {
    try {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        console.error('Error formatting SAR:', error);
        return `${amount} ريال`;
    }
};

const formatDate = (date, locale = 'ar-SA') => {
    try {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    } catch (error) {
        console.error('Error formatting date:', error);
        return date.toString();
    }
};

const formatTime = (time, locale = 'ar-SA') => {
    try {
        if (typeof time === 'string') {
            // Handle time string like "19:00:00"
            const [hours, minutes] = time.split(':');
            const timeObj = new Date();
            timeObj.setHours(parseInt(hours), parseInt(minutes));
            return new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(timeObj);
        }
        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date(time));
    } catch (error) {
        console.error('Error formatting time:', error);
        return time.toString();
    }
};

const calculateProgress = (current, target) => {
    if (!target || target <= 0) return 0;
    const progress = (current / target) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100); // Round to 2 decimal places, max 100%
};

const getDaysRemaining = (endDate) => {
    try {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        console.error('Error calculating days remaining:', error);
        return 0;
    }
};

const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
};

module.exports = {
    generateHijriDate,
    formatSAR,
    formatDate,
    formatTime,
    calculateProgress,
    getDaysRemaining,
    isValidDate
};
EOF

echo "✅ Backend structure created successfully!"
echo ""
echo "📁 Project structure:"
echo "alshuail-backend/"
echo "├── app.js"
echo "├── package.json"
echo "├── .env"
echo "├── config/"
echo "│   └── database.js"
echo "├── controllers/"
echo "├── routes/"
echo "├── middleware/"
echo "│   └── auth.js"
echo "└── utils/"
echo "    └── dateUtils.js"
echo ""
echo "🔧 Next steps:"
echo "1. cd alshuail-backend"
echo "2. Update .env file with your database password"
echo "3. Copy your Day 6 files:"
echo "   - Copy Day6_Activities_Controller.js to controllers/activitiesController.js"
echo "   - Copy Day6_Activities_Routes.js to routes/activities.js"
echo "   - Copy Day6_Validation_Middleware.js to middleware/validation.js"
echo "4. npm run dev"
echo ""
echo "🎯 Ready to integrate your Day 6 files!"
