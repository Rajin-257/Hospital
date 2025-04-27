const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const router = express.Router();

// Protect all API routes
router.use(protect);

// Get patient appointments (for modal quick view)
router.get('/patients/:id/appointments', async (req, res) => {
    try {
        const patientId = req.params.id;
        
        // Find most recent appointments for this patient (limit to 5)
        const appointments = await Appointment.findAll({
            where: { patientId },
            include: [
                {
                    model: Doctor,
                    attributes: ['id', 'firstName', 'lastName', 'specialization']
                }
            ],
            order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']],
            limit: 5
        });
        
        res.json({ success: true, appointments });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 