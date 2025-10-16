// middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 reviews per windowMs
    message: {
        error: 'Too many review requests',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again after an hour'
    }
});