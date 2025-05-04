const express = require('express');
const router = express.Router();
const cabinController = require('../controllers/cabinController');
const { protect } = require('../middleware/auth');

router.get('/', protect, cabinController.getAllCabins);
router.get('/available', protect, cabinController.getAvailableCabins);
router.post('/', protect, cabinController.createCabin);
router.get('/:id', protect, cabinController.getCabin);
router.put('/:id', protect, cabinController.updateCabin);
router.delete('/:id', protect, cabinController.deleteCabin);

// Cabin booking routes
router.get('/bookings/all', protect, cabinController.getAllCabinBookings);
router.post('/booking', protect, cabinController.createCabinBooking);
router.get('/booking/patient/:patientId', protect, cabinController.getCabinBookingsByPatient);
router.get('/booking/patient/:patientId/unbilled', protect, cabinController.getUnbilledCabinBookings);
router.put('/booking/update-status', protect, cabinController.updateCabinBookingBillingStatus);
router.put('/booking/:id/checkout', protect, cabinController.checkoutCabinBooking);

module.exports = router;