// controllers/ai.controller.js
import generateContent from "../services/ai.service.js";

export const getReview = async (req, res) => {
    try {
        const { code, language = 'javascript' } = req.body;

        if (!code) {
            return res.status(400).json({ 
                error: "Code is required",
                message: "Please provide code for review"
            });
        }

        const response = await generateContent({ code, language });
        
        res.json({
            success: true,
            review: response,
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