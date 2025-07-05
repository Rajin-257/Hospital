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

// View single test requisition
router.get('/requisition/:id', checkFeatureAccess('Test Requisition'), testController.getTestRequisition);

// Edit test requisition page
router.get('/requisition/edit/:id', checkFeatureAccess('Test Management'), testController.editTestRequisitionPage);

// Update test requisition
router.post('/requisition/:id', checkFeatureAccess('Test Management'), testController.updateTestRequisition);

// Delete test requisition
router.delete('/requisition/:id', checkFeatureAccess('Test Management'), testController.deleteTestRequisition);

// Test Department routes
router.get('/departments', checkFeatureAccess('Test Management'), testController.getAllTestDepartments);
router.post('/departments', checkFeatureAccess('Test Management'), testController.createTestDepartment);
router.get('/departments/:id', checkFeatureAccess('Test Management'), testController.getTestDepartment);
router.put('/departments/:id', checkFeatureAccess('Test Management'), testController.updateTestDepartment);
router.delete('/departments/:id', checkFeatureAccess('Test Management'), testController.deleteTestDepartment);

// Test Category routes
router.get('/categories', checkFeatureAccess('Test Management'), testController.getAllTestCategories);
router.post('/categories', checkFeatureAccess('Test Management'), testController.createTestCategory);
router.get('/categories/:id', checkFeatureAccess('Test Management'), testController.getTestCategory);
router.put('/categories/:id', checkFeatureAccess('Test Management'), testController.updateTestCategory);
router.delete('/categories/:id', checkFeatureAccess('Test Management'), testController.deleteTestCategory);

// Test Group routes
router.get('/groups', checkFeatureAccess('Test Management'), testController.getAllTestGroups);
router.post('/groups', checkFeatureAccess('Test Management'), testController.createTestGroup);
router.get('/groups/:id', checkFeatureAccess('Test Management'), testController.getTestGroup);
router.put('/groups/:id', checkFeatureAccess('Test Management'), testController.updateTestGroup);
router.delete('/groups/:id', checkFeatureAccess('Test Management'), testController.deleteTestGroup);

// Test Result routes
router.get('/results/:id', checkFeatureAccess('Test Requisition'), testController.getTestResult);
router.get('/results/:id/upload', checkFeatureAccess('Test Management'), testController.showUploadResultForm);
router.post('/results/:id/upload', checkFeatureAccess('Test Management'), testController.uploadTestResult);
router.put('/results/:id', checkFeatureAccess('Test Management'), testController.updateTestResult);
router.delete('/results/:id', checkFeatureAccess('Test Management'), testController.deleteTestResult);

// Parametric routes
router.get('/:id', checkFeatureAccess('Tests'), testController.getTest);
router.put('/:id', checkFeatureAccess('Test Management'), testController.updateTest);
router.delete('/:id', checkFeatureAccess('Test Management'), testController.deleteTest);

module.exports = router;