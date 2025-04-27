const express = require('express');
const doctorController = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// get pages
router.get('/new', authorize('admin'), doctorController.showCreateDoctorForm);
router.get('/:id/edit', authorize('admin', 'doctor'), doctorController.showEditDoctorForm);
router.get('/:id/availability', authorize('admin', 'doctor'), doctorController.showAvailabilityForm);

// Create new doctor
router.post('/', authorize('admin'), doctorController.createDoctor);

// Get all doctors
router.get('/', authorize('admin', 'receptionist', 'nurse'), doctorController.getAllDoctors);

// Get doctor by ID
router.get('/:id', authorize('admin', 'doctor', 'receptionist', 'nurse'), doctorController.getDoctorById);

// Update doctor
router.put('/:id', authorize('admin', 'doctor'), doctorController.updateDoctor);

// Delete doctor
router.delete('/:id', authorize('admin'), doctorController.deleteDoctor);

// Get doctor's appointments
router.get('/:id/appointments', authorize('admin', 'doctor', 'receptionist'), doctorController.getDoctorAppointments);

// Update doctor availability
router.put('/:id/availability', authorize('admin', 'doctor'), doctorController.updateAvailability);

module.exports = router;