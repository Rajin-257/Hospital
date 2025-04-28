const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/auth');

router.get('/', protect, patientController.getAllPatients);
router.get('/search', protect, patientController.searchPatients);
router.post('/', protect, patientController.createPatient);
router.get('/:id', protect, patientController.getPatient);
router.get('/:id/dashboard', protect, patientController.getPatientDashboard);
router.put('/:id', protect, patientController.updatePatient);
router.delete('/:id', protect, patientController.deletePatient);

module.exports = router;