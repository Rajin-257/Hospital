const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all test routes
router.use(protect, getFeaturePermissions);

// Get all tests
router.get('/', checkFeatureAccess('Tests'), testController.getAllTests);

// Create new test
router.post('/', checkFeatureAccess('Test Management'), testController.createTest);

// Test requisitions
router.get('/requisitions', checkFeatureAccess('Test Requisition'), testController.getAllTestRequisitions);

// Create test request
router.post('/request', checkFeatureAccess('Test Requisition'), testController.createTestRequest);

// Get test requests by patient
router.get('/request/patient/:patientId', checkFeatureAccess('Test Requisition'), testController.getTestRequestsByPatient);

// Get doctor commissions
router.get('/commissions', checkFeatureAccess('Doctor Commissions'), testController.getDoctorCommissions);

// Delete test requisition
router.delete('/requisition/:id', checkFeatureAccess('Test Management'), testController.deleteTestRequisition);

// Parametric routes
router.get('/:id', checkFeatureAccess('Tests'), testController.getTest);
router.put('/:id', checkFeatureAccess('Test Management'), testController.updateTest);
router.delete('/:id', checkFeatureAccess('Test Management'), testController.deleteTest);

module.exports = router;