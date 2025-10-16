// controllers/user.controller.js
import User from '../models/user.model.js';
import Suggestion from '../models/suggestion.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// User Registration
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: 'Missing fields',
                message: 'All fields are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'User exists',
                message: 'Email or username already in use' 
            });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ 
            username, 
            email, 
            password: hashedPassword 
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'Internal server error'
        });
    }
};

// User Login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user._id);

        // Update last login (you might want to add this field to your schema)
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                reviewCount: user.reviewCount
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'Internal server error'
        });
    }
};

// Get User Profile with Stats
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        const reviewStats = await Suggestion.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    languages: { $addToSet: '$language' }
                }
            }
        ]);

        res.json({
            success: true,
            user: {
                ...user.toObject(),
                stats: reviewStats[0] || { totalReviews: 0, languages: [] }
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            error: 'Profile fetch failed',
            message: 'Internal server error'
        });
    }
};

// Update User Preferences
export const updatePreferences = async (req, res) => {
    try {
        const { preferredLanguages, reviewDepth } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 
                $set: { 
                    'preferences.preferredLanguages': preferredLanguages,
                    'preferences.reviewDepth': reviewDepth 
                } 
            },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: user.preferences
        });

    } catch (error) {
        console.error('Preferences update error:', error);
        res.status(500).json({
            error: 'Preferences update failed',
            message: 'Internal server error'
        });
    }
};