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

// Refresh token route - handles automatic refresh redirects
router.get('/refresh-token', async (req, res) => {
  try {
    // Call the refresh token controller
    await authController.refreshToken(req, res);
    
    // If refresh was successful and there's a redirect URL, redirect there
    const redirectUrl = req.query.redirect || '/dashboard';
    if (res.headersSent) return; // Response already sent by controller
    
    // Ensure we don't redirect to login to avoid loops
    if (redirectUrl === '/login' || redirectUrl === '/') {
      res.redirect('/dashboard');
    } else {
      res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Refresh token route error:', error);
    res.redirect('/login?timeout=true');
  }
});

// Authentication routes
router.post('/register', protect, getFeaturePermissions, checkFeatureAccess('User Management'), authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken); // API endpoint for AJAX calls

// Get current user - protected
router.get('/me', protect, getFeaturePermissions, authController.getMe);

module.exports = router;