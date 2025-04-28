const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Get all appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      include: [
        { model: Patient },
        { model: Doctor }
      ],
      order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(appointments);
    }
    
    // Fetch all patients and doctors for the appointment form
    const patients = await Patient.findAll({
      order: [['name', 'ASC']]
    });
    
    const doctors = await Doctor.findAll({
      order: [['name', 'ASC']]
    });
    
    res.render('appointments', {
      title: 'Appointments',
      appointments,
      patients,
      doctors
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get appointments by date
exports.getAppointmentsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    const appointments = await Appointment.findAll({
      where: { appointmentDate: date },
      include: [
        { model: Patient },
        { model: Doctor }
      ],
      order: [['appointmentTime', 'ASC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, remarks } = req.body;
    
    // Check if the time slot is available for the doctor
    const existingAppointment = await Appointment.findOne({
      where: {
        doctorId,
        appointmentDate,
        appointmentTime,
        status: {
          [Op.ne]: 'cancelled'
        }
      }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked for the selected doctor' });
    }
    
    const appointment = await Appointment.create({
      PatientId: patientId,
      DoctorId: doctorId,
      appointmentDate,
      appointmentTime,
      remarks
    });
    
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient },
        { model: Doctor }
      ]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(fullAppointment);
    }
    
    res.redirect('/appointments');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    
    let appointment = await Appointment.findByPk(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    appointment = await appointment.update({
      status,
      remarks: remarks || appointment.remarks
    });
    
    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    await appointment.destroy();
    
    res.json({ message: 'Appointment removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get appointments by patient
exports.getAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const appointments = await Appointment.findAll({
      where: { PatientId: patientId },
      include: [
        { model: Doctor }
      ],
      order: [['appointmentDate', 'DESC'], ['appointmentTime', 'ASC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};