const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { checkFeatureAccess } = require('../middleware/featurePermission');

// Get all patients
router.get('/', checkFeatureAccess('Patients'), patientController.getAllPatients);

// Search patients
router.get('/search', checkFeatureAccess('Patients'), patientController.searchPatients);

// Create new patient
router.post('/', checkFeatureAccess('Patient Registration'), patientController.createPatient);

// Get patient details
router.get('/:id', checkFeatureAccess('Patients'), patientController.getPatient);

// Get patient dashboard
router.get('/:id/dashboard', checkFeatureAccess('Patient Dashboard'), patientController.getPatientDashboard);

// Update patient
router.put('/:id', checkFeatureAccess('Patient Management'), patientController.updatePatient);

// Delete patient - restricted to admin
router.delete('/:id', checkFeatureAccess('Patient Management'), patientController.deletePatient);

module.exports = router;