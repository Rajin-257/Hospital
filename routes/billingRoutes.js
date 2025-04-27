const express = require('express');
const billingController = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// get Pages
router.get('/new', authorize('admin', 'receptionist'), billingController.showCreateBillingForm);
router.get('/:id/edit', authorize('admin', 'receptionist'), billingController.showEditBillingForm);
// Print invoice route
router.get('/:id/print', authorize('admin', 'receptionist', 'doctor'), billingController.printInvoice);

// Create new billing
router.post('/', authorize('admin', 'receptionist'), billingController.createBilling);

// Get all billings
router.get('/', authorize('admin', 'receptionist'), billingController.getAllBillings);

// Get billing by ID
router.get('/:id', authorize('admin', 'receptionist'), billingController.getBillingById);

// Update billing
router.put('/:id', authorize('admin', 'receptionist'), billingController.updateBilling);

// Delete billing
router.delete('/:id', authorize('admin'), billingController.deleteBilling);

// Get patient's billings
router.get('/patient/:patientId', authorize('admin', 'receptionist', 'doctor'), billingController.getPatientBillings);

module.exports = router;