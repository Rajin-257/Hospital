// doctorController.js
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { sequelize } = require('../config/db');

// Show doctor creation form
exports.showCreateDoctorForm = (req, res) => {
  res.render('doctors/new', {
    pageTitle: 'Add New Doctor'
  });
};

// Create a new doctor
exports.createDoctor = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { 
      username, password, email, 
      firstName, lastName, specialization, qualification,
      contactNumber, address, consultationFee 
    } = req.body;
    
    // Create user account first
    const user = await User.create({
      username,
      password,
      email,
      role: 'doctor'
    }, { transaction: t });
    
    // Create doctor profile
    const doctor = await Doctor.create({
      userId: user.id,
      firstName,
      lastName,
      specialization,
      qualification,
      contactNumber,
      email,
      address,
      consultationFee,
      isAvailable: true
    }, { transaction: t });
    
    await t.commit();
    
    req.flash('success_msg', `Dr. ${firstName} ${lastName} added successfully`);
    res.redirect('/doctors');
  } catch (error) {
    await t.rollback();
    console.error(error);
    req.flash('error_msg', 'Error adding doctor: ' + error.message);
    res.redirect('/doctors/new');
  }
};

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          attributes: ['username', 'email', 'role', 'isActive']
        }
      ]
    });
    
    res.render('doctors/index', {
      pageTitle: 'Doctors',
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving doctors list');
    res.redirect('/dashboard');
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['username', 'email', 'role', 'isActive']
        }
      ]
    });
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    // Get upcoming appointments for this doctor
    const today = new Date();
    const appointments = await Appointment.findAll({
      where: { 
        doctorId: doctor.id,
        appointmentDate: { [Op.gte]: today }
      },
      include: [{
        model: Patient,
        attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
      }],
      order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']],
      limit: 5
    });
    
    res.render('doctors/show', {
      pageTitle: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      doctor,
      appointments
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving doctor details');
    res.redirect('/doctors');
  }
};

// Show edit doctor form
exports.showEditDoctorForm = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['username', 'email']
        }
      ]
    });
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    res.render('doctors/edit', {
      pageTitle: `Edit: Dr. ${doctor.firstName} ${doctor.lastName}`,
      doctor
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading doctor data');
    res.redirect('/doctors');
  }
};

// Update doctor
exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    await doctor.update(req.body);
    
    req.flash('success_msg', 'Doctor information updated successfully');
    res.redirect(`/doctors/${doctor.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating doctor: ' + error.message);
    res.redirect(`/doctors/${req.params.id}/edit`);
  }
};

// Delete doctor
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    // Check for associated appointments
    const appointments = await Appointment.findAll({
      where: { doctorId: doctor.id }
    });

    if (appointments.length > 0) {
      req.flash('error_msg', 'Cannot delete doctor as they have associated appointments. Please delete or reassign the appointments first.');
      return res.redirect(`/doctors/${doctor.id}`);
    }
    
    const t = await sequelize.transaction();
    
    try {
      // Delete doctor profile
      await doctor.destroy({ transaction: t });
      
      // Delete associated user account
      if (doctor.userId) {
        await User.destroy({
          where: { id: doctor.userId },
          transaction: t
        });
      }
      
      await t.commit();
      
      req.flash('success_msg', 'Doctor deleted successfully');
      res.redirect('/doctors');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting doctor: ' + error.message);
    res.redirect('/doctors');
  }
};

// Get doctor's appointments
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findByPk(doctorId);
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    const { date } = req.query;
    
    let whereClause = { doctorId };
    
    if (date) {
      whereClause.appointmentDate = date;
    }
    
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
        }
      ],
      order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
    });
    
    res.render('doctors/appointments', {
      pageTitle: `Appointments: Dr. ${doctor.firstName} ${doctor.lastName}`,
      doctor,
      appointments,
      selectedDate: date
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving appointments');
    res.redirect('/doctors');
  }
};

// Show availability update form
exports.showAvailabilityForm = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    res.render('doctors/availability', {
      pageTitle: `Update Availability: Dr. ${doctor.firstName} ${doctor.lastName}`,
      doctor
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading doctor data');
    res.redirect('/doctors');
  }
};

// Update doctor availability
exports.updateAvailability = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
      req.flash('error_msg', 'Doctor not found');
      return res.redirect('/doctors');
    }
    
    const { isAvailable } = req.body;
    
    await doctor.update({ isAvailable });
    
    req.flash('success_msg', `Availability status updated to ${isAvailable ? 'Available' : 'Unavailable'}`);
    res.redirect(`/doctors/${doctor.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating availability: ' + error.message);
    res.redirect(`/doctors/${req.params.id}`);
  }
};