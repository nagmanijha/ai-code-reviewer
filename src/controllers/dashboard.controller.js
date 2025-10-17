import Suggestion from '../models/suggestion.model.js';
import User from '../models/user.model.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get start of current week (Monday)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get start of previous week
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        // Aggregate dashboard data
        const stats = await Suggestion.aggregate([
            { $match: { userId: userId } },
            {
                $facet: {
                    // Total reviews and this week's reviews
                    reviewCounts: [
                        {
                            $group: {
                                _id: null,
                                totalReviews: { $sum: 1 },
                                thisWeekReviews: {
                                    $sum: {
                                        $cond: [
                                            { $gte: ['$createdAt', startOfWeek] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                lastWeekReviews: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $gte: ['$createdAt', startOfLastWeek] },
                                                    { $lt: ['$createdAt', startOfWeek] }
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    // Average rating and improvement
                    ratings: [
                        {
                            $group: {
                                _id: null,
                                averageRating: { $avg: '$rating' },
                                currentWeekRating: {
                                    $avg: {
                                        $cond: [
                                            { $gte: ['$createdAt', startOfWeek] },
                                            '$rating',
                                            null
                                        ]
                                    }
                                },
                                lastWeekRating: {
                                    $avg: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $gte: ['$createdAt', startOfLastWeek] },
                                                    { $lt: ['$createdAt', startOfWeek] }
                                                ]
                                            },
                                            '$rating',
                                            null
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    // Languages used
                    languages: [
                        {
                            $group: {
                                _id: '$language',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 6 }
                    ],
                    // Recent activity
                    recentActivity: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                _id: 1,
                                language: 1,
                                rating: 1,
                                createdAt: 1,
                                reviewTime: 1,
                                codePreview: {
                                    $substr: ['$code', 0, 100]
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // Process the aggregated data
        const reviewCounts = stats[0]?.reviewCounts[0] || { 
            totalReviews: 0, 
            thisWeekReviews: 0, 
            lastWeekReviews: 0 
        };
        
        const ratings = stats[0]?.ratings[0] || { 
            averageRating: 0, 
            currentWeekRating: 0, 
            lastWeekRating: 0 
        };
        
        const languages = stats[0]?.languages || [];
        const recentActivity = stats[0]?.recentActivity || [];

        // Calculate improvements
        const weeklyImprovement = reviewCounts.lastWeekReviews > 0 
            ? Math.round(((reviewCounts.thisWeekReviews - reviewCounts.lastWeekReviews) / reviewCounts.lastWeekReviews) * 100)
            : reviewCounts.thisWeekReviews > 0 ? 100 : 0;

        const ratingImprovement = ratings.lastWeekRating > 0 
            ? Math.round(((ratings.currentWeekRating - ratings.lastWeekRating) / ratings.lastWeekRating) * 100)
            : ratings.currentWeekRating > 0 ? 5 : 0;

        // Format response
        const dashboardStats = {
            reviews: {
                total: reviewCounts.totalReviews,
                thisWeek: reviewCounts.thisWeekReviews,
                improvement: weeklyImprovement
            },
            quality: {
                score: Math.round(ratings.averageRating * 20), // Convert 1-5 to percentage
                improvement: ratingImprovement,
                averageRating: Math.round(ratings.averageRating * 10) / 10
            },
            languages: {
                count: languages.length,
                list: languages.map(lang => ({
                    name: lang._id,
                    count: lang.count
                }))
            },
            recentActivity: recentActivity.map(activity => ({
                id: activity._id,
                action: 'Code Review',
                language: activity.language,
                time: formatTimeAgo(activity.createdAt),
                status: 'Completed',
                rating: activity.rating,
                duration: activity.reviewTime
            }))
        };

        res.json({
            success: true,
            data: dashboardStats
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics',
            message: error.message
        });
    }
};

// Get user profile with extended data
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password');

        // Get additional stats
        const languageStats = await Suggestion.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: '$language',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const userProfile = {
            ...user.toObject(),
            stats: {
                totalReviews: await Suggestion.countDocuments({ userId: req.user._id }),
                favoriteLanguage: languageStats[0]?._id || 'JavaScript',
                languagesUsed: languageStats.length,
                languageBreakdown: languageStats
            }
        };

        res.json({
            success: true,
            data: userProfile
        });

    } catch (error) {
        console.error('User profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile',
            message: error.message
        });
    }
};


// Helper function to format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}
// Get review history
export const getReviewHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, language } = req.query;
        const skip = (page - 1) * limit;

        const filter = { userId: req.user._id };
        if (language && language !== 'all') {
            filter.language = language;
        }

        const suggestions = await Suggestion.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('code language review rating createdAt reviewTime');

        const total = await Suggestion.countDocuments(filter);

        // Ensure consistent response structure
        const response = {
            success: true,
            data: {
                suggestions: suggestions || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Review history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch review history',
            message: error.message,
            data: {
                suggestions: [],
                pagination: {}
            }
        });
    }
};