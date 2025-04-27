const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Login page
router.get('/login', authController.showLoginForm);

// Register page
router.get('/register', authController.showRegisterForm);

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user
router.get('/logout', authController.logout);

// Get current user profile
router.get('/profile', protect, authController.getCurrentUser);

module.exports = router;