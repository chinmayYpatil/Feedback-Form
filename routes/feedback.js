const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.post('/', async (req, res) => {
    const { fullName: name, email, rating, message: msg } = req.body;
    const errors = [];
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;

    if (!name || !name.trim()) errors.push("Full Name is required.");
    if (!email || !emailRegex.test(email)) errors.push("A valid Email is required.");
    if (typeof rating !== 'number' || rating < 1 || rating > 5) errors.push("Rating must be 1-5.");
    if (!msg || msg.trim().length < 10) errors.push("Message must be at least 10 chars.");

    if (errors.length) {
        return res.status(400).json({ status: 400, title: "Validation Failed", errors });
    }

    try {
        const query = `INSERT INTO feedback (full_name, email, rating, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at;`;
        const values = [name.trim(), email.toLowerCase().trim(), rating, msg.trim()];
        const result = await pool.query(query, values);

        res.status(201).json({ 
            status: 201,
            message: 'Feedback received!', 
            data: { id: result.rows[0].id, submittedAt: result.rows[0].created_at }
        });
    } catch (e) {
        console.error('DB Save Error:', e.message);
        res.status(500).json({ 
            status: 500,
            error: 'Internal Server Error',
            message: 'Failed to save feedback.' 
        });
    }
});

module.exports = router;