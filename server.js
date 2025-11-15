// server.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// --- 1. CONFIGURATION ---

// Render database connection URL will be stored in this environment variable
const DATABASE_URL = process.env.DATABASE_URL; 
const PORT = process.env.PORT || 10000; // Render default port is 10000

// Initialize Express App
const app = express();

// --- 2. MIDDLEWARE ---

app.use(cors({ origin: '*' })); // Allow all origins
app.use(express.json());

const feedbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again after 15 minutes.' }
});

app.use('/api/feedback', feedbackLimiter);


// --- 3. POSTGRESQL SETUP ---

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set. The server cannot connect to the database.');
    process.exit(1);
}

// Create a new Pool instance for database connections
const pool = new Pool({
    connectionString: DATABASE_URL,
    // Add SSL configuration for Render deployment if needed
    ssl: {
        rejectUnauthorized: false // Often required for Render's external connections
    }
});

// Function to create the feedback table if it doesn't exist
async function createFeedbackTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}$'),
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            message TEXT NOT NULL CHECK (LENGTH(message) >= 10),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(query);
        console.log('✅ PostgreSQL feedback table ensured.');
    } catch (err) {
        console.error('❌ Error creating feedback table:', err.message);
    }
}

// Connect and create table on startup
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL connection successful');
        client.release();
        createFeedbackTable();
    })
    .catch(err => console.error('❌ PostgreSQL connection error:', err.message));


// --- 4. ROUTES ---

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Feedback API is running with Render PostgreSQL!' });
});


/**
 * POST /api/feedback
 * Receives, validates, and stores feedback data in PostgreSQL.
 */
app.post('/api/feedback', async (req, res) => {
    const { fullName, email, rating, message } = req.body;

    // --- Backend Validation (Initial check before SQL insertion) ---
    const errors = [];
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;

    if (!fullName || fullName.trim().length === 0) errors.push("Full Name is required.");
    if (!email || !emailRegex.test(email)) errors.push("A valid Email address is required.");
    if (typeof rating !== 'number' || rating < 1 || rating > 5) errors.push("Rating must be a number between 1 and 5.");
    if (!message || message.trim().length < 10) errors.push("Message must be at least 10 characters long.");

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: errors.join(' ') 
        });
    }

    try {
        const insertQuery = `
            INSERT INTO feedback (full_name, email, rating, message)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at;
        `;
        const values = [fullName, email.toLowerCase(), rating, message];

        const result = await pool.query(insertQuery, values);

        res.status(201).json({ 
            message: 'Feedback received successfully!', 
            id: result.rows[0].id 
        });

    } catch (dbError) {
        console.error('Database Save Error:', dbError);
        // Catch constraints violations (e.g., if SQL check for email or message length fails)
        res.status(500).json({ 
            error: 'Failed to save feedback due to a database error.' 
        });
    }
});


// --- 5. START SERVER ---

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});