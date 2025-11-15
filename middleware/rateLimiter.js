const rateLimit = require('express-rate-limit');

const feedbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        status: 429, 
        error: 'Too many requests, try again after 15 minutes.' 
    }
});

module.exports = feedbackLimiter;