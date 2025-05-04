const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect } = require('../middleware/auth');

router.get('/', protect, testController.getAllTests);
router.post('/', protect, testController.createTest);

// Specific routes need to come before parametric routes
router.get('/requisitions', protect, testController.getAllTestRequisitions);
router.post('/request', protect, testController.createTestRequest);
router.get('/request/patient/:patientId', protect, testController.getTestRequestsByPatient);
router.get('/commissions', protect, testController.getDoctorCommissions);
router.delete('/requisition/:id', protect, testController.deleteTestRequisition);

// Parametric routes
router.get('/:id', protect, testController.getTest);
router.put('/:id', protect, testController.updateTest);
router.delete('/:id', protect, testController.deleteTest);

module.exports = router;