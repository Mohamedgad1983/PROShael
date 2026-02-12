#!/usr/bin/env node

/**
 * Health Check Script for Al-Shuail Backend API
 * Used by Docker containers and load balancers to verify service health
 * Includes database connectivity and essential service validation
 */

import http from 'http';
import pg from 'pg';
const { Pool } = pg;

const HEALTH_CHECK_PORT = process.env.PORT || 3001;
const HEALTH_CHECK_HOST = process.env.HOST || 'localhost';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

/**
 * Performs HTTP health check against the application
 */
async function performHttpHealthCheck() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HEALTH_CHECK_HOST,
            port: HEALTH_CHECK_PORT,
            path: '/health',
            method: 'GET',
            timeout: HEALTH_CHECK_TIMEOUT
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve({
                    status: 'healthy',
                    statusCode: res.statusCode
                });
            } else {
                reject(new Error(`Health check failed with status: ${res.statusCode}`));
            }
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check request timed out'));
        });

        req.on('error', (error) => {
            reject(new Error(`Health check request failed: ${error.message}`));
        });

        req.end();
    });
}

/**
 * Checks database connectivity
 */
async function checkDatabaseConnection() {
    let pool;
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 1,
            connectionTimeoutMillis: 5000
        };

        if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
            throw new Error('Database configuration missing (DB_NAME, DB_USER, DB_PASSWORD required)');
        }

        pool = new Pool(dbConfig);

        // Simple query to test connection
        const result = await pool.query('SELECT COUNT(*) FROM members');
        const recordCount = parseInt(result.rows[0].count, 10);

        await pool.end();

        return {
            status: 'connected',
            recordCount
        };
    } catch (error) {
        if (pool) {
            await pool.end().catch(() => {});
        }
        throw new Error(`Database connection failed: ${error.message}`);
    }
}

/**
 * Validates essential environment variables
 */
function validateEnvironmentVariables() {
    const requiredEnvVars = [
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
        status: 'valid',
        checkedVariables: requiredEnvVars.length
    };
}

/**
 * Checks system resources and Islamic calendar functionality
 */
async function performSystemChecks() {
    try {
        // Check memory usage
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        };

        // Check if memory usage is within acceptable limits (e.g., 512MB)
        if (memUsageMB.rss > 512) {
            console.warn(`High memory usage detected: ${memUsageMB.rss}MB`);
        }

        // Test Islamic calendar functionality
        let hijriTest = { status: 'unavailable' };
        try {
            const hijriConverter = await import('hijri-converter');
            const today = new Date();
            const hijriDate = hijriConverter.toHijri(
                today.getFullYear(),
                today.getMonth() + 1,
                today.getDate()
            );
            hijriTest = {
                status: 'available',
                currentHijriDate: `${hijriDate.hy}-${hijriDate.hm}-${hijriDate.hd}`
            };
        } catch (error) {
            hijriTest = {
                status: 'error',
                message: error.message
            };
        }

        return {
            memory: memUsageMB,
            uptime: Math.round(process.uptime()),
            hijriCalendar: hijriTest,
            nodeVersion: process.version,
            platform: process.platform
        };
    } catch (error) {
        throw new Error(`System checks failed: ${error.message}`);
    }
}

/**
 * Main health check function
 */
async function runHealthCheck() {
    const startTime = Date.now();
    const healthStatus = {
        timestamp: new Date().toISOString(),
        service: 'alshuail-backend',
        version: '2.0.0',
        status: 'unknown',
        checks: {}
    };

    try {
        // 1. HTTP Health Check
        console.log('Performing HTTP health check...');
        healthStatus.checks.http = await performHttpHealthCheck();

        // 2. Environment Variables Check
        console.log('Validating environment variables...');
        healthStatus.checks.environment = validateEnvironmentVariables();

        // 3. Database Connection Check
        console.log('Checking database connection...');
        healthStatus.checks.database = await checkDatabaseConnection();

        // 4. System Resources Check
        console.log('Performing system checks...');
        healthStatus.checks.system = await performSystemChecks();

        // Calculate response time
        healthStatus.responseTimeMs = Date.now() - startTime;
        healthStatus.status = 'healthy';

        console.log('✅ All health checks passed');
        console.log(JSON.stringify(healthStatus, null, 2));

        process.exit(0);

    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.error = error.message;
        healthStatus.responseTimeMs = Date.now() - startTime;

        console.error('❌ Health check failed:', error.message);
        console.error(JSON.stringify(healthStatus, null, 2));

        process.exit(1);
    }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', () => {
    console.log('Health check received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Health check received SIGINT, shutting down gracefully');
    process.exit(0);
});

// Export for testing purposes
export {
    performHttpHealthCheck,
    checkDatabaseConnection,
    validateEnvironmentVariables,
    performSystemChecks
};

// Run health check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runHealthCheck();
}
