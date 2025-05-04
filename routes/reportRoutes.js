const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all report routes
router.use(protect, getFeaturePermissions);

// Reports dashboard - accessible based on permissions
router.get('/', reportController.getReportsDashboard);

// API routes for report data
// Patient statistics
router.get('/patient-stats', checkFeatureAccess('Patient Reports'), reportController.getPatientStats);

// Doctor statistics
router.get('/doctor-stats', checkFeatureAccess('Appointment Reports'), reportController.getDoctorStats);

// Appointment statistics
router.get('/appointment-stats', checkFeatureAccess('Appointment Reports'), reportController.getAppointmentStats);

// Test statistics
router.get('/test-stats', checkFeatureAccess('Test Reports'), reportController.getTestStats);

// Billing statistics
router.get('/billing-stats', checkFeatureAccess('Billing Reports'), reportController.getBillingStats);

// Daily billing statistics
router.get('/daily-billing-stats', checkFeatureAccess('Billing Reports'), reportController.getDailyBillingStats);

// Due invoice statistics
router.get('/due-invoice-stats', checkFeatureAccess('Billing Reports'), reportController.getDueInvoiceStats);

// Cabin statistics
router.get('/cabin-stats', checkFeatureAccess('Billing Reports'), reportController.getCabinStats);

// Get all billing records
router.get('/all-billings', checkFeatureAccess('Billing Reports'), reportController.getAllBillingRecordsApi);

// Get unbilled appointments
router.get('/unbilled-appointments', checkFeatureAccess('Appointment Reports'), reportController.getUnbilledAppointments);

// Get unbilled tests
router.get('/unbilled-tests', checkFeatureAccess('Test Reports'), reportController.getUnbilledTests);

// Billing report routes
router.get('/billing/partial', checkFeatureAccess('Billing Reports'), reportController.getPartialPaymentBills);
router.get('/billing/paid', checkFeatureAccess('Billing Reports'), reportController.getFullyPaidBills);
router.get('/billing/due', checkFeatureAccess('Billing Reports'), reportController.getDuePaymentBills);
router.get('/billing/daily', checkFeatureAccess('Billing Reports'), reportController.getDailyBillingReport);
router.get('/billing/all-payment-types', checkFeatureAccess('Billing Reports'), reportController.getAllPaymentTypesReport);

// Billing Reports
router.get('/billing', checkFeatureAccess('Billing Reports'), reportController.renderBillingReports);
router.get('/billing/all', checkFeatureAccess('Billing Reports'), reportController.getAllBillingRecords);
router.get('/billing/due', checkFeatureAccess('Billing Reports'), reportController.getDuePaymentBills);

module.exports = router; 