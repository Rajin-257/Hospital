const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all billing routes
router.use(protect, getFeaturePermissions);

// Main billing page
router.get('/', billingController.renderBillingPage);

// Create billing - no permission check needed as this is a core function
router.post('/', billingController.createBilling);

// Get billing receipt - no permission check needed
router.get('/receipt/:id', billingController.getBilling);

// Get billings by patient - no permission check needed
router.get('/patient/:patientId', billingController.getBillingsByPatient);

// Get unbilled appointments - for Schedule Appointment feature
router.get('/patient/:patientId/unbilled-appointments', 
  checkFeatureAccess('Schedule Appointment'), 
  billingController.getUnbilledAppointments
);

// Update appointment billing status - for Schedule Appointment feature
router.put('/appointments/update-status', 
  checkFeatureAccess('Schedule Appointment'), 
  billingController.updateAppointmentBillingStatus
);

// Process payment - no permission check needed
router.put('/:id/payment', billingController.processPayment);

// Edit billing page route
router.get('/edit/:id', billingController.editBillingPage);

// Update billing route
router.put('/:id', billingController.updateBilling);

// Delete billing route
router.delete('/:id', billingController.deleteBilling);

module.exports = router;