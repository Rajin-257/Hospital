const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/test_results');
  },
  filename: function(req, file, cb) {
    cb(null, `result-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
  }
});

// File filter to accept multiple file types
const fileFilter = (req, file, cb) => {
  // Accept pdf, images, xlsx, docx files
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image, PDF, Word and Excel files are allowed!"), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

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

// Show upload result page
router.get('/results/upload/:id', checkFeatureAccess('Test Management'), testController.showResultUploadPage);

// Process result upload
router.post('/results/upload/:id', checkFeatureAccess('Test Management'), upload.array('result_files', 5), testController.uploadTestResults);

// View test result
router.get('/results/:id', checkFeatureAccess('Test Requisition'), testController.viewTestResult);

// Parametric routes
router.get('/:id', checkFeatureAccess('Tests'), testController.getTest);
router.put('/:id', checkFeatureAccess('Test Management'), testController.updateTest);
router.delete('/:id', checkFeatureAccess('Test Management'), testController.deleteTest);

module.exports = router;