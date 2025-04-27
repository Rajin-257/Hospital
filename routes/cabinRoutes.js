const express = require('express');
const cabinController = require('../controllers/cabinController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// get Pages
router.get('/new', authorize('admin'), cabinController.showCreateCabinForm);
router.get('/:id/edit', authorize('admin'), cabinController.showEditCabinForm);
router.get('/:id/assign', authorize('admin', 'receptionist', 'nurse'), cabinController.showAssignPatientForm);
router.get('/:id/discharge', authorize('admin', 'receptionist', 'nurse'), cabinController.showDischargeForm);

// Create new cabin
router.post('/', authorize('admin'), cabinController.createCabin);

// Get all cabins
router.get('/', authorize('admin', 'receptionist', 'nurse'), cabinController.getAllCabins);

// Get cabin by ID
router.get('/:id', authorize('admin', 'receptionist', 'nurse'), cabinController.getCabinById);

// Update cabin
router.put('/:id', authorize('admin'), cabinController.updateCabin);

// Delete cabin
router.delete('/:id', authorize('admin'), cabinController.deleteCabin);

// Assign patient to cabin
router.put('/:id/assign', authorize('admin', 'receptionist', 'nurse'), cabinController.assignPatient);

// Assign patient to cabin from patient details page
router.post('/assign-patient', authorize('admin', 'receptionist', 'nurse'), cabinController.assignPatientFromDetails);

// Discharge patient from cabin
router.put('/:id/discharge', authorize('admin', 'receptionist', 'nurse'), cabinController.dischargePatient);

// Get available cabins
router.get('/status/available', authorize('admin', 'receptionist', 'nurse'), cabinController.getAvailableCabins);

module.exports = router;