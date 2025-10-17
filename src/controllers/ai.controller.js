import generateContent from "../services/ai.service.js";
import Suggestion from "../models/suggestion.model.js";

export const getReview = async (req, res) => {
    console.log(req.user);
    try {
        const { code, language = 'javascript' } = req.body;

        if (!code) {
            return res.status(400).json({ 
                error: "Code is required",
                message: "Please provide code for review"
            });
        }

        const startTime = Date.now();
        const response = await generateContent({ code, language });
        const reviewTime = Math.round((Date.now() - startTime) / 1000);

        // Generate a rating based on review content (simplified)
        const rating = generateRatingFromReview(response);

        // Save the suggestion to database
        const suggestion = new Suggestion({
            userId: req.user._id,
            code,
            language,
            review: response,
            rating,
            reviewTime,
            tags: extractTagsFromReview(response)
        });

        await suggestion.save();

        res.json({
            success: true,
            review: response,
            rating,
            suggestionId: suggestion._id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};

// Helper function to generate rating from review content
function generateRatingFromReview(review) {
    // Simple heuristic based on review content
    let rating = 4; // Default good rating
    
    if (review.includes('excellent') || review.includes('perfect') || review.includes('great job')) {
        rating = 5;
    } else if (review.includes('poor') || review.includes('bad') || review.includes('issues')) {
        rating = 3;
    } else if (review.includes('critical') || review.includes('major issues') || review.includes('security risk')) {
        rating = 2;
    }
    
    return rating;
}

// Helper function to extract tags from review
function extractTagsFromReview(review) {
    const tags = [];
    if (review.includes('security')) tags.push('security');
    if (review.includes('performance')) tags.push('performance');
    if (review.includes('readability')) tags.push('readability');
    if (review.includes('best practices')) tags.push('best-practices');
    if (review.includes('bug') || review.includes('error')) tags.push('bugs');
    
    return tags;
}