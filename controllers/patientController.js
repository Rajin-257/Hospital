const Patient = require('../models/Patient');
const { Op } = require('sequelize');

// Get all patients
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(patients);
    }
    
    res.render('patients', {
      title: 'Patients',
      patients
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single patient
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new patient
exports.createPatient = async (req, res) => {
  try {
    const { name, gender, dateOfBirth, phone, email, address, bloodGroup } = req.body;
    
    // Generate patient ID (e.g., P + current year + 4-digit sequence)
    const latestPatient = await Patient.findOne({
      order: [['id', 'DESC']]
    });
    
    let sequence = 1;
    if (latestPatient) {
      const latestId = latestPatient.patientId;
      const latestSequence = parseInt(latestId.substring(latestId.length - 4));
      sequence = latestSequence + 1;
    }
    
    const year = new Date().getFullYear().toString().substr(-2);
    const patientId = `P${year}${sequence.toString().padStart(4, '0')}`;
    
    const patient = await Patient.create({
      patientId,
      name,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      bloodGroup
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(patient);
    }
    
    res.redirect('/patients');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update patient
exports.updatePatient = async (req, res) => {
  try {
    const { name, gender, dateOfBirth, phone, email, address, bloodGroup } = req.body;
    
    let patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    patient = await patient.update({
      name,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      bloodGroup
    });
    
    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete patient
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    await patient.destroy();
    
    res.json({ message: 'Patient removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Search patients
exports.searchPatients = async (req, res) => {
  try {
    const { term } = req.query;
    
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${term}%` } },
          { patientId: { [Op.like]: `%${term}%` } },
          { phone: { [Op.like]: `%${term}%` } },
          { email: { [Op.like]: `%${term}%` } }
        ]
      }
    });
    
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get patient dashboard
exports.getPatientDashboard = async (req, res) => {
  try {
    // Import required models
    const TestRequest = require('../models/TestRequest');
    const Appointment = require('../models/Appointment');
    const CabinBooking = require('../models/CabinBooking');
    const Billing = require('../models/Billing');
    const Doctor = require('../models/Doctor');
    const Cabin = require('../models/Cabin');
    const Test = require('../models/Test');
    
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Patient not found'
      });
    }
    
    // Fetch related data directly from models
    const [tests, appointments, cabinBookings, invoices] = await Promise.all([
      // Get test requests
      TestRequest.findAll({
        where: { PatientId: patient.id },
        include: [{ model: Test }],
        order: [['createdAt', 'DESC']]
      }),
      
      // Get appointments
      Appointment.findAll({
        where: { PatientId: patient.id },
        include: [{ model: Doctor }],
        order: [['appointmentDate', 'DESC'], ['appointmentTime', 'ASC']]
      }),
      
      // Get cabin bookings
      CabinBooking.findAll({
        where: { PatientId: patient.id },
        include: [{ model: Cabin }],
        order: [['createdAt', 'DESC']]
      }),
      
      // Get invoices (billings)
      Billing.findAll({
        where: { PatientId: patient.id },
        order: [['createdAt', 'DESC']]
      })
    ]);
    
    // Map the data to match the expected format in the template
    const formattedAppointments = appointments.map(appointment => {
      return {
        id: appointment.id,
        appointmentId: appointment.id, // Use ID if there's no specific appointmentId field
        doctorName: appointment.Doctor ? appointment.Doctor.name : 'Unknown Doctor',
        department: appointment.Doctor ? appointment.Doctor.department : 'Unknown',
        appointmentDateTime: new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`),
        status: appointment.status
      };
    });
    
    const formattedCabinBookings = cabinBookings.map(booking => {
      return {
        id: booking.id,
        bookingId: booking.id, // Use ID if there's no specific bookingId field
        cabinNumber: booking.Cabin ? booking.Cabin.cabinNumber : 'Unknown',
        cabinType: booking.Cabin ? booking.Cabin.cabinType : 'Unknown',
        checkInDate: booking.admissionDate,
        checkOutDate: booking.dischargeDate,
        status: booking.status
      };
    });
    
    res.render('patient-dashboard', {
      title: `Patient Dashboard - ${patient.name}`,
      patient,
      tests,
      appointments: formattedAppointments,
      cabinBookings: formattedCabinBookings,
      invoices
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Server Error'
    });
  }
};