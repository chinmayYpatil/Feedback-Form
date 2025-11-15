const { Pool } = require('pg');

// Initialize connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Rate limiting state (in-memory, resets between cold starts)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 10;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    const record = rateLimitMap.get(ip);
    
    if (now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= maxRequests) {
        return false;
    }

    record.count++;
    return true;
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            status: 405, 
            error: 'Method Not Allowed' 
        });
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
            status: 429,
            error: 'Too many requests, try again after 15 minutes.'
        });
    }

    // Validation
    const { fullName: name, email, rating, message: msg } = req.body;
    const errors = [];
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;

    if (!name || !name.trim()) errors.push("Full Name is required.");
    if (!email || !emailRegex.test(email)) errors.push("A valid Email is required.");
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        errors.push("Rating must be 1-5.");
    }
    if (!msg || msg.trim().length < 10) {
        errors.push("Message must be at least 10 chars.");
    }

    if (errors.length) {
        return res.status(400).json({ 
            status: 400, 
            title: "Validation Failed", 
            errors 
        });
    }

    // Database insertion
    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                message TEXT NOT NULL CHECK (LENGTH(message) >= 10),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const query = `
            INSERT INTO feedback (full_name, email, rating, message) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, created_at;
        `;
        const values = [name.trim(), email.toLowerCase().trim(), rating, msg.trim()];
        const result = await pool.query(query, values);

        return res.status(201).json({ 
            status: 201,
            message: 'Feedback received!', 
            data: { 
                id: result.rows[0].id, 
                submittedAt: result.rows[0].created_at 
            }
        });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ 
            status: 500,
            error: 'Internal Server Error',
            message: 'Failed to save feedback.' 
        });
    }
};
