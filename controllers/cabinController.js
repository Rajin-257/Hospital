const Cabin = require('../models/Cabin');
const CabinBooking = require('../models/CabinBooking');
const Patient = require('../models/Patient');
const { Op } = require('sequelize');

// Get all cabins
exports.getAllCabins = async (req, res) => {
  try {
    const { search, cabinType, status, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Define where conditions for search and filters
    const whereConditions = {};
    
    // Apply search filter if provided
    if (search) {
      whereConditions[Op.or] = [
        { cabinNumber: { [Op.like]: `%${search}%` } },
        { cabinType: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Apply cabin type filter if provided and not 'all'
    if (cabinType && cabinType !== 'all') {
      whereConditions.cabinType = cabinType;
    }
    
    // Apply status filter if provided and not 'all'
    if (status && status !== 'all') {
      whereConditions.status = status;
    }

    const { count, rows: cabins } = await Cabin.findAndCountAll({
      where: whereConditions,
      order: [['cabinNumber', 'ASC']],
      limit,
      offset
    });
    
    const totalPages = Math.ceil(count / limit);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        cabins,
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count
      });
    }
    
    res.render('cabins', {
      title: 'Cabins',
      cabins,
      search: search || '',
      cabinType: cabinType || 'all',
      status: status || 'all',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
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

// Get all cabin bookings
exports.getAllCabinBookings = async (req, res) => {
  try {
    const { status, dateRange, search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Build query conditions
    const whereConditions = {};
    
    // Status filter
    if (status && status !== 'all') {
      whereConditions.status = status;
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateRange) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          whereConditions.admissionDate = {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          whereConditions.admissionDate = {
            [Op.gte]: yesterday,
            [Op.lt]: today
          };
          break;
        case 'week':
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          whereConditions.admissionDate = {
            [Op.gte]: lastWeek
          };
          break;
        case 'month':
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          whereConditions.admissionDate = {
            [Op.gte]: lastMonth
          };
          break;
      }
    }
    
    // Include options for related models with search if applicable
    const includeOptions = [
      { 
        model: Patient,
        where: search ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { patientId: { [Op.like]: `%${search}%` } }
          ]
        } : undefined
      },
      { model: Cabin }
    ];
    
    // Count total bookings matching filters
    const { count, rows: bookings } = await CabinBooking.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      order: [['admissionDate', 'DESC']],
      limit,
      offset,
      distinct: true
    });
    
    const totalPages = Math.ceil(count / limit);
    
    res.render('cabin_bookings', {
      title: 'Cabin Bookings',
      bookings,
      status: status || 'all',
      dateRange: dateRange || 'all',
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
    });
  } catch (error) {
    console.error('Error in getAllCabinBookings:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch cabin bookings'
    });
  }
};

// Checkout cabin booking
exports.checkoutCabinBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { dischargeDate, remarks } = req.body;
    
    // Find the booking
    const booking = await CabinBooking.findByPk(id, {
      include: [{ model: Cabin }]
    });
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    // Update booking
    await booking.update({
      dischargeDate,
      status: 'discharged',
      remarks: remarks || booking.remarks
    });
    
    // Update cabin status to Available
    if (booking.Cabin) {
      await booking.Cabin.update({ status: 'Available' });
    }
    
    res.json({ 
      success: true, 
      message: 'Patient checked out successfully',
      booking
    });
  } catch (error) {
    console.error('Error checking out patient:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while checking out patient' 
    });
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