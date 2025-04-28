const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(doctors);
    }
    
    res.render('doctors', {
      title: 'Doctors',
      doctors
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
    
    const doctor = await Doctor.create({
      name,
      specialization,
      qualification,
      phone,
      email,
      consultationFee
    });
    
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