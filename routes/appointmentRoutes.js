const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, appointmentController.getAllAppointments);
router.get('/date/:date', protect, appointmentController.getAppointmentsByDate);
router.get('/patient/:patientId', protect, appointmentController.getAppointmentsByPatient);
router.post('/', protect, appointmentController.createAppointment);
router.put('/:id/status', protect, appointmentController.updateAppointmentStatus);
router.delete('/:id', protect, appointmentController.deleteAppointment);

module.exports = router;