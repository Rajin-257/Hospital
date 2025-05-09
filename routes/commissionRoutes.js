const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all commission routes
router.use(protect, getFeaturePermissions);

// Route for commission listing and filtering
router.get('/', checkFeatureAccess('Doctor Commissions'), commissionController.getCommissions);

// Route for commission summary by doctor
router.get('/summary', checkFeatureAccess('Doctor Commissions'), commissionController.getCommissionSummary);

// Route for marking commissions as paid
router.post('/mark-paid', checkFeatureAccess('Doctor Commission Management'), commissionController.markAsPaid);

module.exports = router;