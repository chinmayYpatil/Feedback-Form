import { API_URL } from './config.js';

const form = document.getElementById('feedback-form');
const btn = document.getElementById('submit-btn');
const notif = document.getElementById('notification');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRating = () => {
    const input = form.querySelector('input[name="rating"]:checked');
    return input ? parseInt(input.value, 10) : null;
};

const displayError = (id, msg) => {
    const el = document.getElementById(`${id}-error`);
    if (el) el.textContent = msg;
};

const clearErrors = () => {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
};

const showNotif = (msg, type) => {
    notif.className = 'notification';
    notif.textContent = msg;
    notif.classList.add(type, 'show');
    
    setTimeout(() => notif.classList.remove('show'), 5000); 
};

const validateForm = (data) => {
    clearErrors();
    let valid = true;

    if (!data.fullName.trim()) {
        displayError('fullName', 'Full Name is required.');
        valid = false;
    }

    if (!data.email.trim()) {
        displayError('email', 'Email is required.');
        valid = false;
    } else if (!emailRegex.test(data.email.trim())) {
        displayError('email', 'Please enter a valid email address.');
        valid = false;
    }

    if (!data.rating) {
        displayError('rating', 'Please select a star rating.');
        valid = false;
    }

    if (!data.message.trim()) {
        displayError('message', 'Message is required.');
        valid = false;
    } else if (data.message.trim().length < 10) {
        displayError('message', 'Message must be at least 10 characters long.');
        valid = false;
    }

    if (!valid) showNotif('Please correct the errors in the form.', 'error');
    
    return valid;
};

const handleSubmit = async (event) => {
    event.preventDefault();
    
    const data = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        rating: getRating(),
        message: document.getElementById('message').value,
    };

    if (!validateForm(data)) return;

    btn.textContent = 'Submitting...';
    btn.disabled = true;
    notif.classList.remove('show');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            showNotif('Feedback submitted successfully! Thank you.', 'success');
            form.reset();
            clearErrors();
        } else {
            let msg = result.error || (result.errors && result.errors.join(' ')) || 'An unexpected error occurred.';
            showNotif(`Submission failed: ${msg}`, 'error');
        }

    } catch (error) {
        console.error('Submission Error:', error);
        showNotif('Network error. Could not connect to the server.', 'error');
    } finally {
        btn.textContent = 'Submit Feedback';
        btn.disabled = false;
    }
};

form.addEventListener('submit', handleSubmit);