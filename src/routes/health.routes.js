import express from 'express';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Code Review Assistant API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Detailed health check with system info
router.get('/detailed', async (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Code Review Assistant API',
        version: '1.0.0',
        checks: {
            database: { status: 'unknown', responseTime: 0 },
            memory: { status: 'OK' },
            ai_service: { status: 'unknown', responseTime: 0 },
            environment: { status: 'OK' }
        }
    };

    try {
        // Database health check
        const dbStart = Date.now();
        const dbStatus = mongoose.connection.readyState;
        const dbResponseTime = Date.now() - dbStart;
        
        healthCheck.checks.database = {
            status: dbStatus === 1 ? 'connected' : 'disconnected',
            responseTime: dbResponseTime,
            readyState: dbStatus
        };

        // Memory usage
        const memoryUsage = process.memoryUsage();
        healthCheck.checks.memory = {
            status: 'OK',
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        };

        // AI Service health check
        if (process.env.GOOGLE_GEMINI_KEY) {
            try {
                const aiStart = Date.now();
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
                
                // Test with a simple prompt
                await model.generateContent('Hello');
                const aiResponseTime = Date.now() - aiStart;
                
                healthCheck.checks.ai_service = {
                    status: 'connected',
                    responseTime: aiResponseTime,
                    model: 'gemini-2.0-flash-exp'
                };
            } catch (aiError) {
                healthCheck.checks.ai_service = {
                    status: 'error',
                    error: aiError.message,
                    responseTime: 0
                };
                healthCheck.status = 'DEGRADED';
            }
        } else {
            healthCheck.checks.ai_service = {
                status: 'not_configured',
                message: 'GOOGLE_GEMINI_KEY not set'
            };
        }

        // Environment check
        healthCheck.checks.environment = {
            status: 'OK',
            node: process.version,
            platform: process.platform,
            env: process.env.NODE_ENV || 'development'
        };

        // Determine overall status
        const allChecks = Object.values(healthCheck.checks);
        const failedChecks = allChecks.filter(check => check.status !== 'OK' && check.status !== 'connected' && check.status !== 'not_configured');
        
        if (failedChecks.length > 0) {
            healthCheck.status = failedChecks.some(check => check.status === 'error') ? 'ERROR' : 'DEGRADED';
        }

        res.json(healthCheck);

    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            message: error.message
        });
    }
});

// Database-specific health check
router.get('/database', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState;
        const statusMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        const health = {
            status: dbStatus === 1 ? 'OK' : 'ERROR',
            database: {
                state: statusMap[dbStatus] || 'unknown',
                readyState: dbStatus,
                host: mongoose.connection.host,
                name: mongoose.connection.name,
                models: Object.keys(mongoose.connection.models)
            },
            timestamp: new Date().toISOString()
        };

        if (dbStatus !== 1) {
            return res.status(503).json(health);
        }

        res.json(health);
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Database health check failed',
            message: error.message
        });
    }
});

// AI Service health check
router.get('/ai-service', async (req, res) => {
    if (!process.env.GOOGLE_GEMINI_KEY) {
        return res.status(503).json({
            status: 'NOT_CONFIGURED',
            service: 'AI Service',
            message: 'GOOGLE_GEMINI_KEY environment variable not set',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const startTime = Date.now();
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            generationConfig: { temperature: 0.1 }
        });

        // Test with a simple code review prompt
        const testCode = 'function add(a, b) { return a + b; }';
        const prompt = `Briefly review this JavaScript code: ${testCode}`;
        
        const result = await model.generateContent(prompt);
        const responseTime = Date.now() - startTime;

        res.json({
            status: 'OK',
            service: 'AI Service (Google Gemini)',
            responseTime: `${responseTime}ms`,
            model: 'gemini-2.0-flash-exp',
            test: 'successful',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            service: 'AI Service',
            error: error.message,
            responseTime: 0,
            timestamp: new Date().toISOString()
        });
    }
});

// System metrics
router.get('/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        process: {
            pid: process.pid,
            uptime: process.uptime(),
            memory: {
                rss: process.memoryUsage().rss,
                heapTotal: process.memoryUsage().heapTotal,
                heapUsed: process.memoryUsage().heapUsed,
                external: process.memoryUsage().external
            },
            cpu: process.cpuUsage(),
            versions: process.versions
        },
        system: {
            arch: process.arch,
            platform: process.platform,
            node: process.version,
            env: process.env.NODE_ENV || 'development'
        },
        database: {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        }
    };

    res.json(metrics);
});

// Readiness check (for Kubernetes/container orchestration)
router.get('/ready', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    const aiReady = !!process.env.GOOGLE_GEMINI_KEY;

    if (dbReady) {
        res.json({
            status: 'READY',
            timestamp: new Date().toISOString(),
            services: {
                database: 'ready',
                ai_service: aiReady ? 'ready' : 'not_configured'
            }
        });
    } else {
        res.status(503).json({
            status: 'NOT_READY',
            timestamp: new Date().toISOString(),
            services: {
                database: 'not_ready',
                ai_service: aiReady ? 'ready' : 'not_configured'
            }
        });
    }
});

// Liveness check (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
    res.json({
        status: 'LIVE',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default router;
