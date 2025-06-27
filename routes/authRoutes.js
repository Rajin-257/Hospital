const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');
const jwt = require('jsonwebtoken');

// Login page - no protection needed
router.get('/login', (req, res) => {
  // Prevent redirect loops - if user is already authenticated, redirect to dashboard
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      if (decoded) {
        console.log('User already authenticated, redirecting to dashboard');
        return res.redirect('/dashboard');
      }
    } catch (error) {
      // Invalid token, clear it and continue to login page
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      };
      res.clearCookie('token', cookieOptions);
    }
  }

  // Check if the request has specific query parameters
  const error = req.query.error;
  
  res.render('auth/login', { 
    title: 'Login',
    error: error || null
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