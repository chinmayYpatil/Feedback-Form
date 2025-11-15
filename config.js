// Feedback-Form/config.js (Recommended Fix)

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If running locally, use the local backend port (10000 as per server.js)
// Otherwise, use the deployed URL
const BASE_URL = isLocalhost 
    ? 'http://localhost:10000' 
    : 'https://feedback-api-fz1a.onrender.com';

export const API_URL = `${BASE_URL}/api/feedback`;