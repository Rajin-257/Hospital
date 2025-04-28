const Cabin = require('../models/Cabin');
const CabinBooking = require('../models/CabinBooking');
const Patient = require('../models/Patient');
const { Op } = require('sequelize');

// Get all cabins
exports.getAllCabins = async (req, res) => {
  try {
    const cabins = await Cabin.findAll();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(cabins);
    }
    
    res.render('cabins', {
      title: 'Cabins',
      cabins
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get available cabins
exports.getAvailableCabins = async (req, res) => {
  try {
    const cabins = await Cabin.findAll({
      where: { status: 'Available' }
    });
    
    res.json(cabins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single cabin
exports.getCabin = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      return res.status(404).json({ message: 'Cabin not found' });
    }
    
    res.json(cabin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new cabin
exports.createCabin = async (req, res) => {
  try {
    const { cabinNumber, cabinType, pricePerDay, description } = req.body;
    
    const cabin = await Cabin.create({
      cabinNumber,
      cabinType,
      pricePerDay,
      description
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(cabin);
    }
    
    res.redirect('/cabins');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update cabin
exports.updateCabin = async (req, res) => {
  try {
    const { cabinType, pricePerDay, status, description } = req.body;
    
    let cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      return res.status(404).json({ message: 'Cabin not found' });
    }
    
    cabin = await cabin.update({
      cabinType,
      pricePerDay,
      status,
      description
    });
    
    res.json(cabin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete cabin
exports.deleteCabin = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      return res.status(404).json({ message: 'Cabin not found' });
    }
    
    await cabin.destroy();
    
    res.json({ message: 'Cabin removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create cabin booking
exports.createCabinBooking = async (req, res) => {
  try {
    const { patientId, cabinId, admissionDate, expectedStay } = req.body;
    
    // Get cabin details to set the dailyRate
    const cabin = await Cabin.findByPk(cabinId);
    if (!cabin) {
      return res.status(404).json({ message: 'Cabin not found' });
    }
    
    // Create booking
    const booking = await CabinBooking.create({
      PatientId: patientId,
      CabinId: cabinId,
      admissionDate,
      expectedStay,
      dailyRate: cabin.pricePerDay,
      status: 'active',
      billingStatus: 'not_billed'
    });
    
    // Update cabin status to Occupied
    await cabin.update({ status: 'Occupied' });
    
    const fullBooking = await CabinBooking.findByPk(booking.id, {
      include: [
        { model: Patient },
        { model: Cabin }
      ]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(fullBooking);
    }
    
    res.redirect('/cabins');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get cabin bookings by patient
exports.getCabinBookingsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const bookings = await CabinBooking.findAll({
      where: { 
        PatientId: patientId 
      },
      include: [
        { model: Cabin }
      ],
      order: [['admissionDate', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get unbilled cabin bookings by patient
exports.getUnbilledCabinBookings = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const bookings = await CabinBooking.findAll({
      where: { 
        PatientId: patientId,
        billingStatus: 'not_billed',
        status: {
          [Op.ne]: 'cancelled'
        }
      },
      include: [
        { model: Cabin }
      ],
      order: [['admissionDate', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update cabin booking billing status
exports.updateCabinBookingBillingStatus = async (req, res) => {
  try {
    const { bookingIds } = req.body;
    
    if (!bookingIds || !bookingIds.length) {
      return res.status(400).json({ message: 'No bookings provided' });
    }
    
    await CabinBooking.update(
      { billingStatus: 'billed' },
      { 
        where: { 
          id: { 
            [Op.in]: bookingIds 
          } 
        } 
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};