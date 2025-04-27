const express = require('express');
const labTestTypeController = require('../controllers/labTestTypeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('admin', 'doctor'));

// Get all lab test types
router.get('/', labTestTypeController.getAllLabTestTypes);

// Show create form
router.get('/new', labTestTypeController.showCreateLabTestTypeForm);

// Create new lab test type
router.post('/', labTestTypeController.createLabTestType);

// Show edit form
router.get('/:id/edit', labTestTypeController.showEditLabTestTypeForm);

// Update lab test type
router.put('/:id', labTestTypeController.updateLabTestType);

// Delete lab test type
router.delete('/:id', labTestTypeController.deleteLabTestType);

module.exports = router; 