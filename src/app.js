import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './configs/db.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/user.routes.js';
import healthRoutes from './routes/health.routes.js';
import { reviewLimiter, authLimiter } from './middleware/rateLimit.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use('/ai/get-review', reviewLimiter);
app.use('/users/login', authLimiter);
app.use('/users/register', authLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/ai', aiRoutes);
app.use('/users', userRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Code Review Assistant API',
        version: '1.0.0',
        documentation: '/health for API status',
        endpoints: {
            health: '/health',
            auth: '/users',
            ai: '/ai'
        }
    });

});

// 404 Handler
app.use( (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: {
            health: ['GET /health', 'GET /health/detailed', 'GET /health/ready'],
            auth: ['POST /users/register', 'POST /users/login', 'GET /users/profile'],
            ai: ['POST /ai/get-review']
        }
    });
});

// Global Error Handler
app.use(errorHandler);

export default app;