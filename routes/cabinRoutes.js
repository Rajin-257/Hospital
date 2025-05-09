const express = require('express');
const router = express.Router();
const cabinController = require('../controllers/cabinController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware to all cabin routes
router.use(protect, getFeaturePermissions);

// Get all cabins
router.get('/', checkFeatureAccess('Cabins'), cabinController.getAllCabins);

// Get available cabins
router.get('/available', checkFeatureAccess('Cabin Allocation'), cabinController.getAvailableCabins);

// Create cabin
router.post('/', checkFeatureAccess('Cabin Management'), cabinController.createCabin);

// Get single cabin
router.get('/:id', checkFeatureAccess('Cabins'), cabinController.getCabin);

// Update cabin
router.put('/:id', checkFeatureAccess('Cabin Management'), cabinController.updateCabin);

// Delete cabin
router.delete('/:id', checkFeatureAccess('Cabin Management'), cabinController.deleteCabin);

// Cabin booking routes
router.get('/bookings/all', checkFeatureAccess('Cabin Allocation'), cabinController.getAllCabinBookings);

// Create cabin booking
router.post('/booking', checkFeatureAccess('Cabin Allocation'), cabinController.createCabinBooking);

// Get bookings by patient
router.get('/booking/patient/:patientId', checkFeatureAccess('Cabin Allocation'), cabinController.getCabinBookingsByPatient);

// Get unbilled bookings
router.get('/booking/patient/:patientId/unbilled', checkFeatureAccess('Cabin Allocation'), cabinController.getUnbilledCabinBookings);

// Update booking status
router.put('/booking/update-status', checkFeatureAccess('Cabin Allocation'), cabinController.updateCabinBookingBillingStatus);

// Checkout cabin
router.put('/booking/:id/checkout', checkFeatureAccess('Cabin Allocation'), cabinController.checkoutCabinBooking);

module.exports = router;