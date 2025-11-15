const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = process.env;

if (!DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL not set.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
        console.log('✅ DB table ready.');
    } catch (err) {
        console.error('❌ Table error:', err.message);
    }
}

const initializeDatabase = () => {
    pool.connect()
        .then(c => {
            console.log('✅ DB connected.');
            c.release();
            createFeedbackTable();
        })
        .catch(err => {
            console.error('❌ DB connect error:', err.message);
            process.exit(1); 
        });
};

module.exports = { pool, initializeDatabase };