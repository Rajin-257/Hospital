const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('admin'));

router.get('/', protect, authorize('admin'), reportController.showReportDashboard);
router.get('/export', protect, authorize('admin'), reportController.exportReport);

// Get patient visit report
router.get('/patient-visits', reportController.getPatientVisitReport);

// Get revenue report
router.get('/revenue', reportController.getRevenueReport);

// Get lab test report
router.get('/lab-tests', reportController.getLabTestReport);

module.exports = router;