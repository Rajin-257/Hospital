const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth');

router.get('/', protect, billingController.renderBillingPage);
router.post('/', protect, billingController.createBilling);
router.get('/receipt/:id', protect, billingController.getBilling);
router.get('/patient/:patientId', protect, billingController.getBillingsByPatient);
router.get('/patient/:patientId/unbilled-appointments', protect, billingController.getUnbilledAppointments);
router.put('/appointments/update-status', protect, billingController.updateAppointmentBillingStatus);
router.put('/:id/payment', protect, billingController.processPayment);

module.exports = router;