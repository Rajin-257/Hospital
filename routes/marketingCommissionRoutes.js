const express = require('express');
const router = express.Router();
const marketingCommissionController = require('../controllers/marketingCommissionController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all marketing commission routes
router.use(protect, getFeaturePermissions);

// Route for marketing commission listing and filtering
router.get('/', checkFeatureAccess('Marketing Commissions'), marketingCommissionController.getCommissions);

// Route for marketing commission summary
router.get('/summary', checkFeatureAccess('Marketing Commissions'), marketingCommissionController.getCommissionSummary);

// Route for marking commissions as paid
router.post('/mark-paid', checkFeatureAccess('Marketing Commission Management'), marketingCommissionController.markAsPaid);

module.exports = router; 