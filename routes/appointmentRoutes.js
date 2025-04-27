const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all appointments
router.get('/', authorize('admin', 'doctor', 'receptionist', 'nurse'), appointmentController.getAllAppointments);

// Show create appointment form
router.get('/new', authorize('admin', 'receptionist', 'doctor'), appointmentController.showCreateAppointmentForm);

// Create appointment
router.post('/', authorize('admin', 'receptionist', 'doctor'), appointmentController.createAppointment);

// Get today's appointments
router.get('/today', authorize('admin', 'doctor', 'receptionist', 'nurse'), appointmentController.getTodayAppointments);

// Get appointment by ID
router.get('/:id', authorize('admin', 'doctor', 'receptionist', 'nurse'), appointmentController.getAppointmentById);

// Show edit appointment form
router.get('/:id/edit', authorize('admin', 'receptionist'), appointmentController.showEditAppointmentForm);

// Update appointment
router.put('/:id', authorize('admin', 'receptionist'), appointmentController.updateAppointment);

// Delete appointment
router.delete('/:id', authorize('admin', 'receptionist'), appointmentController.deleteAppointment);

// Update appointment status
router.put('/:id/status', authorize('admin', 'doctor', 'receptionist'), appointmentController.updateStatus);
router.patch('/:id/status', authorize('admin', 'doctor', 'receptionist'), appointmentController.updateStatus);

module.exports = router;