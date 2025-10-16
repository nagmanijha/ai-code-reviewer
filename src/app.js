// app.js
import express from 'express';
import cors from 'cors';

const app = express();

// Connect to Database
connectDB();
// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

export default app;
