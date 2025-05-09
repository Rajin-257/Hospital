const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { checkFeatureAccess } = require('../middleware/featurePermission');

// Get all doctors
router.get('/', checkFeatureAccess('Doctors'), doctorController.getAllDoctors);

// Search doctors
router.get('/search', checkFeatureAccess('Doctors'), doctorController.searchDoctors);

// Create new doctor - restricted to admin
router.post('/', checkFeatureAccess('Doctor Management'), doctorController.createDoctor);

// Get doctor details
router.get('/:id', checkFeatureAccess('Doctors'), doctorController.getDoctor);

// Update doctor - restricted to admin
router.put('/:id', checkFeatureAccess('Doctor Management'), doctorController.updateDoctor);

// Delete doctor - restricted to admin
router.delete('/:id', checkFeatureAccess('Doctor Management'), doctorController.deleteDoctor);

module.exports = router;