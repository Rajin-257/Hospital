const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { Op } = require('sequelize');

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const { search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    // Search filter
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Count total doctors matching filters
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    const totalPages = Math.ceil(count / limit);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        doctors,
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count
      });
    }
    
    res.render('doctors', {
      title: 'Doctors',
      doctors,
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single doctor
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new doctor
exports.createDoctor = async (req, res) => {
  try {
    const { name, specialization, qualification, phone, email, consultationFee } = req.body;
    
    // Create the doctor record
    const doctor = await Doctor.create({
      name,
      specialization,
      qualification,
      phone,
      email,
      consultationFee
    });
    
    // Extract last 4 digits of the phone number for password
    const password = phone.slice(-4);
    
    // Create a user account for the doctor if email is provided
    if (email) {
      // Generate username from name and phone (last 4 digits)
      const username = name.split(' ')[0].toLowerCase() + phone.slice(-4);
      
      // Check if user with this email already exists
      const existingUser = await User.findOne({ where: { email } });
      
      if (!existingUser) {
        await User.create({
          username,
          email,
          password,
          role: 'doctor'
        });
      }
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(doctor);
    }
    
    res.redirect('/doctors');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update doctor
exports.updateDoctor = async (req, res) => {
  try {
    const { name, specialization, qualification, phone, email, consultationFee, isAvailable } = req.body;
    
    let doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    doctor = await doctor.update({
      name,
      specialization,
      qualification,
      phone,
      email,
      consultationFee,
      isAvailable
    });
    
    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete doctor
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    await doctor.destroy();
    
    res.json({ message: 'Doctor removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Search doctors
exports.searchDoctors = async (req, res) => {
  try {
    const { term } = req.query;
    
    const doctors = await Doctor.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${term}%` } },
          { specialization: { [Op.like]: `%${term}%` } },
          { email: { [Op.like]: `%${term}%` } }
        ]
      }
    });
    
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};