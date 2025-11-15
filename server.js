const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { initializeDatabase } = require('./config/db');
const feedbackRouter = require('./routes/feedback');
const feedbackLimiter = require('./middleware/rateLimiter');

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const app = express();

initializeDatabase(); 

app.use(helmet()); 
app.use(cors({ origin: '*' })); 
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'Feedback API', 
        environment: NODE_ENV
    });
});

app.use('/api/feedback', feedbackLimiter, feedbackRouter);

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(err.status || 500).json({
        status: err.status || 500,
        error: 'Internal Server Error',
        message: 'Something went wrong.'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode.`);
});

module.exports = app;