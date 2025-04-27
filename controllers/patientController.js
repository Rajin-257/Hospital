// patientController.js
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Doctor = require('../models/Doctor');
const Cabin = require('../models/Cabin');
const { Op } = require('sequelize');

// Generate a unique patient ID
exports.showCreatePatientForm = async (req, res) => {
  try {
    res.render('patients/new', {
      pageTitle: 'New Patient Form'
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};



const generatePatientId = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get count of patients for this month to create sequential number
  const count = await Patient.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(date.getFullYear(), date.getMonth(), 1)
      }
    }
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `P${year}${month}${sequence}`;
};

// Create new patient
exports.createPatient = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, contactNumber, email, address, bloodGroup, emergencyContact } = req.body;
    
    // Generate patient ID
    const patientId = await generatePatientId();
    
    // Create patient
    const patient = await Patient.create({
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactNumber,
      email,
      address,
      bloodGroup,
      emergencyContact
    });
    
    req.flash('success_msg', `Patient ${firstName} ${lastName} created successfully`);
    res.redirect('/patients');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating patient: ' + error.message);
    res.redirect('/patients/new');
  }
};

// Show all patients
exports.getAllPatients = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const whereClause = {};
    
    if (searchQuery) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${searchQuery}%` } },
        { lastName: { [Op.like]: `%${searchQuery}%` } },
        { patientId: { [Op.like]: `%${searchQuery}%` } },
        { contactNumber: { [Op.like]: `%${searchQuery}%` } },
        { email: { [Op.like]: `%${searchQuery}%` } }
      ];
    }
    
    const patients = await Patient.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    res.render('patients/index', {
      pageTitle: 'Patients',
      patients,
      searchQuery
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving patients');
    res.redirect('/dashboard');
  }
};

// Get patient by ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    // Get appointments for this patient
    const appointments = await Appointment.findAll({
      where: { patientId: patient.id },
      include: [{
        model: Doctor,
        attributes: ['firstName', 'lastName', 'specialization']
      }],
      order: [['appointmentDate', 'DESC']]
    });
    
    // Get cabin information for this patient
    const cabin = await Cabin.findOne({
      where: { 
        patientId: patient.id,
        status: 'occupied'
      }
    });
    
    // Get available cabins
    const availableCabins = await Cabin.findAll({
      where: { status: 'available' },
      order: [['cabinType', 'ASC'], ['cabinNumber', 'ASC']]
    });
    
    res.render('patients/show', {
      pageTitle: `Patient: ${patient.firstName} ${patient.lastName}`,
      patient,
      appointments,
      cabin,
      availableCabins
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving patient details');
    res.redirect('/patients');
  }
};

// Show edit patient form
exports.showEditPatientForm = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    res.render('patients/edit', {
      pageTitle: `Edit Patient: ${patient.firstName} ${patient.lastName}`,
      patient
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving patient data');
    res.redirect('/patients');
  }
};

// Update patient
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    // Update patient
    await patient.update(req.body);
    
    req.flash('success_msg', 'Patient information updated successfully');
    res.redirect(`/patients/${patient.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating patient: ' + error.message);
    res.redirect(`/patients/${req.params.id}/edit`);
  }
};

// Delete patient
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    // Check for associated appointments
    const appointments = await Appointment.findAll({
      where: { patientId: patient.id }
    });

    if (appointments.length > 0) {
      req.flash('error_msg', 'Cannot delete patient as they have associated appointments. Please delete the appointments first.');
      return res.redirect(`/patients/${patient.id}`);
    }
    
    // Check for associated medical records
    const medicalRecords = await MedicalRecord.findAll({
      where: { patientId: patient.id }
    });

    if (medicalRecords.length > 0) {
      req.flash('error_msg', 'Cannot delete patient as they have associated medical records. Please delete the medical records first.');
      return res.redirect(`/patients/${patient.id}`);
    }
    
    await patient.destroy();
    
    req.flash('success_msg', 'Patient deleted successfully');
    res.redirect('/patients');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting patient: ' + error.message);
    res.redirect('/patients');
  }
};

// Show create appointment form
exports.showCreateAppointmentForm = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    const doctors = await Doctor.findAll({ where: { isAvailable: true } });
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    res.render('appointments/new', {
      pageTitle: `New Appointment for ${patient.firstName} ${patient.lastName}`,
      patient,
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading appointment form');
    res.redirect(`/patients/${req.params.id}`);
  }
};

// Create appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, reason } = req.body;
    
    // Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      status: 'scheduled'
    });
    
    req.flash('success_msg', 'Appointment scheduled successfully');
    res.redirect(`/patients/${patientId}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error scheduling appointment: ' + error.message);
    res.redirect(`/patients/${req.body.patientId}/appointments/new`);
  }
};

// Get patient's medical records
exports.getPatientMedicalRecords = async (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findByPk(patientId);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    const medicalRecords = await MedicalRecord.findAll({
      where: { patientId },
      include: [{
        model: Doctor,
        attributes: ['firstName', 'lastName', 'specialization']
      }],
      order: [['visitDate', 'DESC']]
    });
    
    res.render('medical-records/index', {
      pageTitle: `Medical Records: ${patient.firstName} ${patient.lastName}`,
      patient,
      medicalRecords,
      filters: {
        patientId: patient.id
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving medical records');
    res.redirect(`/patients/${req.params.id}`);
  }
};

// Show create medical record form
exports.showCreateMedicalRecordForm = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    const doctors = await Doctor.findAll();
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    res.render('medical-records/new', {
      pageTitle: `New Medical Record: ${patient.firstName} ${patient.lastName}`,
      patient,
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading medical record form');
    res.redirect(`/patients/${req.params.id}`);
  }
};

// Create medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const { patientId, doctorId, diagnosis, prescription, notes, followUpDate } = req.body;
    
    const medicalRecord = await MedicalRecord.create({
      patientId,
      doctorId,
      diagnosis,
      prescription,
      notes,
      followUpDate
    });
    
    req.flash('success_msg', 'Medical record created successfully');
    res.redirect(`/patients/${patientId}/medical-records`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating medical record: ' + error.message);
    res.redirect(`/patients/${req.body.patientId}/medical-records/new`);
  }
};