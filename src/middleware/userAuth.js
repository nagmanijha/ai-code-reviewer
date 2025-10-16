import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            error: 'Invalid token',
            message: 'Please authenticate'
        });
    }
};

export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            req.user = user;
        }
        
        next();
    } catch (error) {
        next(); // Continue without authentication
    }
};