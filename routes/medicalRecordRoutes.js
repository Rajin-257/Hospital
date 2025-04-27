const express = require('express');
const medicalRecordController = require('../controllers/medicalRecordController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all medical records
router.get('/', authorize('admin', 'doctor', 'nurse'), medicalRecordController.getAllMedicalRecords);

// Show create medical record form
router.get('/new', authorize('admin', 'doctor'), medicalRecordController.showCreateMedicalRecordForm);

// Create medical record
router.post('/', authorize('admin', 'doctor'), medicalRecordController.createMedicalRecord);

// Get medical record by ID
router.get('/:id', authorize('admin', 'doctor', 'nurse'), medicalRecordController.getMedicalRecordById);

// Show edit medical record form
router.get('/:id/edit', authorize('admin', 'doctor'), medicalRecordController.showEditMedicalRecordForm);

// Update medical record
router.put('/:id', authorize('admin', 'doctor'), medicalRecordController.updateMedicalRecord);

// Delete medical record
router.delete('/:id', authorize('admin', 'doctor'), medicalRecordController.deleteMedicalRecord);

module.exports = router;