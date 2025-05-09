const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all appointment routes
router.use(protect, getFeaturePermissions);

// Main appointments page
router.get('/', checkFeatureAccess('Appointments'), appointmentController.getAllAppointments);

// Get appointments by date
router.get('/date/:date', checkFeatureAccess('Appointments'), appointmentController.getAppointmentsByDate);

// Get appointments by patient
router.get('/patient/:patientId', checkFeatureAccess('Appointments'), appointmentController.getAppointmentsByPatient);

// Create new appointment
router.post('/', checkFeatureAccess('Schedule Appointment'), appointmentController.createAppointment);

// Update appointment status
router.put('/:id/status', checkFeatureAccess('Appointments'), appointmentController.updateAppointmentStatus);

// Delete appointment
router.delete('/:id', checkFeatureAccess('Appointments'), appointmentController.deleteAppointment);

module.exports = router;