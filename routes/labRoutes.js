const express = require('express');
const labController = require('../controllers/labController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// get Pages
router.get('/new', authorize('admin', 'doctor', 'receptionist'), labController.showCreateLabTestForm);
router.get('/:id/edit', authorize('admin', 'doctor', 'lab_technician'), labController.showEditLabTestForm);
router.get('/:id/assign', authorize('admin', 'lab_technician'), labController.showAssignTechnicianForm);

// Create new lab test
router.post('/', authorize('admin', 'doctor', 'receptionist'), labController.createLabTest);

// Get all lab tests
router.get('/', authorize('admin', 'doctor', 'lab_technician'), labController.getAllLabTests);

// Get lab test by ID
router.get('/:id', authorize('admin', 'doctor', 'lab_technician'), labController.getLabTestById);

// Update lab test
router.put('/:id', authorize('admin', 'doctor', 'lab_technician'), labController.updateLabTest);

// Delete lab test
router.delete('/:id', authorize('admin'), labController.deleteLabTest);

// Get patient's lab tests
router.get('/patient/:patientId', authorize('admin', 'doctor', 'lab_technician'), labController.getPatientLabTests);

// Assign technician to lab test
router.put('/:id/assign', authorize('admin', 'lab_technician'), labController.assignTechnician);

module.exports = router;