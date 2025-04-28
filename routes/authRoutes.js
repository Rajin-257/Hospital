const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Login and register pages
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

router.get('/register', protect, authorize('admin'), (req, res) => {
  res.render('auth/register', { title: 'Register User' });
});

// Authentication routes
router.post('/register', protect, authorize('admin'), authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;