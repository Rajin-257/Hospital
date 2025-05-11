const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const doctorController = require('../controllers/doctorController');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess, checkAnyFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all billing routes
router.use(protect, getFeaturePermissions);

// Main billing page
router.get('/', checkFeatureAccess('Billing Management'), billingController.renderBillingPage);

// Create billing - no permission check needed as this is a core function
router.post('/', checkFeatureAccess('Billing Management'), billingController.createBilling);

// Get billing receipt - accessible to anyone who can access billing
router.get('/receipt/:id', checkFeatureAccess('Billing Management'), billingController.getBilling);

// Get billings by patient
router.get('/patient/:patientId', checkAnyFeatureAccess(['Billing Management', 'Patient Dashboard']), billingController.getBillingsByPatient);

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

// Process payment
router.put('/:id/payment', checkFeatureAccess('Billing Management'), billingController.processPayment);

// Edit billing page route
router.get('/edit/:id', checkFeatureAccess('Billing Management'), billingController.editBillingPage);

// Update billing route
router.put('/:id', checkFeatureAccess('Billing Management'), billingController.updateBilling);

// Delete billing route
router.delete('/:id', checkFeatureAccess('Billing Management'), billingController.deleteBilling);

// Special routes for doctor and marketing manager creation from billing page
// These bypass the normal permission checks for these operations
router.post('/doctor', protect, doctorController.createDoctor);
router.post('/marketing-manager', protect, (req, res) => {
  // Ensure the role is set to marketing
  req.body.role = 'marketing';
  authController.register(req, res);
});

module.exports = router;