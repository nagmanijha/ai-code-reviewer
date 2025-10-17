import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    code: { 
        type: String, 
        required: true 
    },
    language: {
        type: String,
        required: true,
        default: 'javascript'
    },
    review: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 4
    },
    tags: [String],
    isPublic: {
        type: Boolean,
        default: false
    },
    reviewTime: {
        type: Number, 
        default: 0
    }
}, { 
    timestamps: true 
});

// Index for better query performance
suggestionSchema.index({ userId: 1, createdAt: -1 });
suggestionSchema.index({ language: 1, userId: 1 });

export default mongoose.model('Suggestion', suggestionSchema);