const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect } = require('../middleware/auth');

router.get('/', protect, testController.getAllTests);
router.post('/', protect, testController.createTest);
router.get('/:id', protect, testController.getTest);
router.put('/:id', protect, testController.updateTest);
router.delete('/:id', protect, testController.deleteTest);

router.post('/request', protect, testController.createTestRequest);
router.get('/request/patient/:patientId', protect, testController.getTestRequestsByPatient);

module.exports = router;