const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFeaturePermissions } = require('../middleware/featurePermission');

// Apply middleware to protect all dashboard routes
router.use(protect, getFeaturePermissions);

// Main dashboard route
router.get('/', (req, res) => {
  // Set title and user information
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    visibleFeatures: res.locals.visibleFeatures || {}
  });
});

module.exports = router; 