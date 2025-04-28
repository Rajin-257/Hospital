const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');

router.get('/', protect, doctorController.getAllDoctors);
router.get('/search', protect, doctorController.searchDoctors);
router.post('/', protect, doctorController.createDoctor);
router.get('/:id', protect, doctorController.getDoctor);
router.put('/:id', protect, doctorController.updateDoctor);
router.delete('/:id', protect, doctorController.deleteDoctor);

module.exports = router;