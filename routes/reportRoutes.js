const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Reports dashboard - accessible to admin and staff
router.get('/', protect, authorize('admin'), reportController.getReportsDashboard);

// Patient statistics
router.get('/patient-stats', protect, authorize('admin'), reportController.getPatientStats);

// Doctor statistics
router.get('/doctor-stats', protect, authorize('admin'), reportController.getDoctorStats);

// Appointment statistics
router.get('/appointment-stats', protect, authorize('admin'), reportController.getAppointmentStats);

// Test statistics
router.get('/test-stats', protect, authorize('admin'), reportController.getTestStats);

// Billing statistics
router.get('/billing-stats', protect, authorize('admin'), reportController.getBillingStats);

// Cabin statistics
router.get('/cabin-stats', protect, authorize('admin'), reportController.getCabinStats);

// Get all billing records
router.get('/all-billings', protect, authorize('admin'), reportController.getAllBillingRecords);

// Get unbilled appointments
router.get('/unbilled-appointments', protect, authorize('admin'), reportController.getUnbilledAppointments);

// Get unbilled tests
router.get('/unbilled-tests', protect, authorize('admin'), reportController.getUnbilledTests);

// Billing report routes
router.get('/billing/partial', protect, authorize('admin'), reportController.getPartialPaymentBills);
router.get('/billing/paid', protect, authorize('admin'), reportController.getFullyPaidBills);
router.get('/billing/due', protect, authorize('admin'), reportController.getDuePaymentBills);
router.get('/billing/daily', protect, authorize('admin'), reportController.getDailyBillingReport);

module.exports = router; 