import express from 'express';
import { 
    getDashboardStats, 
    getUserProfile, 
    getReviewHistory 
} from '../controllers/dashboard.controller.js';
import { isauth } from '../middleware/userAuth.js';

const router = express.Router();

// All routes require authentication
router.use(isauth);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// User profile with extended data
router.get('/profile', getUserProfile);

// Review history with pagination
router.get('/history', getReviewHistory);

export default router;