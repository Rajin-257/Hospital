const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Login page - no protection needed
router.get('/login', (req, res) => {
  // Check if the request has a timeout query parameter
  const timeout = req.query.timeout === 'true';
  res.render('auth/login', { 
    title: 'Login',
    timeout 
  });
});

// Register page - admin only with User Management permission
router.get('/register', protect, getFeaturePermissions, checkFeatureAccess('User Management'), (req, res) => {
  res.render('auth/register', { title: 'Register User' });
});

// Authentication routes
router.post('/register', protect, getFeaturePermissions, checkFeatureAccess('User Management'), authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Get current user - protected
router.get('/me', protect, getFeaturePermissions, authController.getMe);

module.exports = router;