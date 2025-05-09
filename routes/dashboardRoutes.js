const express = require('express');
const router = express.Router();
const { checkFeatureAccess } = require('../middleware/featurePermission');

// Main dashboard route - accessible to all authenticated users with Dashboard permission
router.get('/', checkFeatureAccess('Dashboard'), (req, res) => {
  // Set title and user information
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    visibleFeatures: res.locals.visibleFeatures || {}
  });
});

module.exports = router;