const express = require('express');
const patientController = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// get Page
router.get('/new', authorize('admin', 'receptionist'), patientController.showCreatePatientForm);
router.get('/:id/edit', authorize('admin', 'receptionist'), patientController.showEditPatientForm);
router.get('/:id/appointments/new', authorize('admin', 'receptionist', 'doctor'), patientController.showCreateAppointmentForm);
router.get('/:id/medical-records/new', authorize('admin', 'doctor'), patientController.showCreateMedicalRecordForm);

// Create new patient
router.post('/', authorize('admin', 'receptionist'), patientController.createPatient);

// Get all patients
router.get('/', authorize('admin', 'doctor', 'receptionist', 'nurse'), patientController.getAllPatients);

// Get patient by ID
router.get('/:id', authorize('admin', 'doctor', 'receptionist', 'nurse'), patientController.getPatientById);

// Update patient
router.put('/:id', authorize('admin', 'receptionist'), patientController.updatePatient);

// Delete patient
router.delete('/:id', authorize('admin'), patientController.deletePatient);

// Create appointment
router.post('/:id/appointments', authorize('admin', 'receptionist', 'doctor'), patientController.createAppointment);

// Get patient's medical records
router.get('/:id/medical-records', authorize('admin', 'doctor', 'nurse'), patientController.getPatientMedicalRecords);

// Create medical record
router.post('/:id/medical-records', authorize('admin', 'doctor'), patientController.createMedicalRecord);

module.exports = router;