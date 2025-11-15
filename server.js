// server.js - Main Application Orchestrator

// 1. IMPORTS & CONFIGURATION
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables
const { initializeDatabase } = require('./config/db');
const feedbackRouter = require('./routes/feedback');
const feedbackLimiter = require('./middleware/rateLimiter');

// Environment Variables
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Initialize Express App
const app = express();

// --- 2. DATABASE INITIALIZATION ---
initializeDatabase(); 

// --- 3. MIDDLEWARE SETUP ---
// Security Middleware
app.use(helmet()); 
// CORS Middleware (Allow all for simplicity in this example)
app.use(cors({ origin: '*' })); 
// Body Parsing Middleware
app.use(express.json());


// --- 4. ROUTES ---

// Health Check / Root Endpoint
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'Feedback API', 
        environment: NODE_ENV,
        version: '1.0.0'
    });
});

// Primary API Route (Applying Rate Limiter only to the feedback path)
app.use('/api/feedback', feedbackLimiter, feedbackRouter);


// --- 5. GLOBAL ERROR HANDLER ---
// This catch-all handles any errors thrown by middleware or routes
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(err.status || 500).json({
        status: err.status || 500,
        error: 'Internal Server Error',
        message: 'Something went wrong on the server.'
    });
});


// --- 6. START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`Access API at: http://localhost:${PORT}/api/feedback`);
});

module.exports = app;