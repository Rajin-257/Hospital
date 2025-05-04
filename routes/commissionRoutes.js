const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { protect } = require('../middleware/auth');

// Route for commission listing and filtering
router.get('/', protect, commissionController.getCommissions);

// Route for commission summary by doctor
router.get('/summary', protect, commissionController.getCommissionSummary);

// Route for marking commissions as paid
router.post('/mark-paid', protect, commissionController.markAsPaid);

module.exports = router; 