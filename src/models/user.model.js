// models/user.model.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    preferences: {
        preferredLanguages: [String],
        reviewDepth: {
            type: String,
            enum: ['basic', 'detailed', 'comprehensive'],
            default: 'detailed'
        }
    }
}, { 
    timestamps: true 
});


// Virtual for review count (will be populated in aggregation)
userSchema.virtual('reviewCount').get(function() {
    return 0; // This will be calculated in aggregation
});



export default mongoose.model('User', userSchema);