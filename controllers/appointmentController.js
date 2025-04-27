// appointmentController.js
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Show all appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let whereClause = {};
    
    if (date) {
      whereClause.appointmentDate = date;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ],
      order: [
        ['appointmentDate', 'ASC'], 
        ['appointmentTime', 'ASC']
      ]
    });
    
    res.render('appointments/index', {
      pageTitle: 'Appointments',
      appointments,
      selectedDate: date,
      selectedStatus: status
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving appointments');
    res.redirect('/dashboard');
  }
};

// Show create appointment form
exports.showCreateAppointmentForm = async (req, res) => {
  try {
    const patients = await Patient.findAll({
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    const doctors = await Doctor.findAll({
      where: { isAvailable: true },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('appointments/new', {
      pageTitle: 'Schedule New Appointment',
      patients,
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading appointment form');
    res.redirect('/appointments');
  }
};

// Create new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;
    
    // Check if the doctor is available at this time
    const existingAppointment = await Appointment.findOne({
      where: {
        doctorId,
        appointmentDate,
        appointmentTime,
        status: 'scheduled'
      }
    });
    
    if (existingAppointment) {
      req.flash('error_msg', 'Doctor already has an appointment at this time');
      return res.redirect('/appointments/new');
    }
    
    // Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      notes,
      status: 'scheduled'
    });
    
    req.flash('success_msg', 'Appointment scheduled successfully');
    res.redirect(`/appointments/${appointment.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error scheduling appointment: ' + error.message);
    res.redirect('/appointments/new');
  }
};

// Get appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber', 'email']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization', 'contactNumber']
        }
      ]
    });
    
    if (!appointment) {
      req.flash('error_msg', 'Appointment not found');
      return res.redirect('/appointments');
    }
    
    res.render('appointments/show', {
      pageTitle: 'Appointment Details',
      appointment
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving appointment details');
    res.redirect('/appointments');
  }
};

// Show edit appointment form
exports.showEditAppointmentForm = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ]
    });
    
    if (!appointment) {
      req.flash('error_msg', 'Appointment not found');
      return res.redirect('/appointments');
    }
    
    const doctors = await Doctor.findAll({
      where: { isAvailable: true },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('appointments/edit', {
      pageTitle: 'Edit Appointment',
      appointment,
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading appointment data');
    res.redirect('/appointments');
  }
};

// Update appointment
exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    
    if (!appointment) {
      req.flash('error_msg', 'Appointment not found');
      return res.redirect('/appointments');
    }
    
    const { doctorId, appointmentDate, appointmentTime, reason, notes, status } = req.body;
    
    // Check if the new time is available (if time or doctor is changed)
    if ((doctorId !== appointment.doctorId || 
         appointmentDate !== appointment.appointmentDate || 
         appointmentTime !== appointment.appointmentTime) &&
        status === 'scheduled') {
      
      const existingAppointment = await Appointment.findOne({
        where: {
          doctorId,
          appointmentDate,
          appointmentTime,
          status: 'scheduled',
          id: { [Op.ne]: appointment.id }
        }
      });
      
      if (existingAppointment) {
        req.flash('error_msg', 'Doctor already has an appointment at this time');
        return res.redirect(`/appointments/${appointment.id}/edit`);
      }
    }
    
    await appointment.update({
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      notes,
      status
    });
    
    req.flash('success_msg', 'Appointment updated successfully');
    res.redirect(`/appointments/${appointment.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating appointment: ' + error.message);
    res.redirect(`/appointments/${req.params.id}/edit`);
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    
    if (!appointment) {
      req.flash('error_msg', 'Appointment not found');
      return res.redirect('/appointments');
    }
    
    await appointment.destroy();
    
    req.flash('success_msg', 'Appointment deleted successfully');
    res.redirect('/appointments');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting appointment: ' + error.message);
    res.redirect('/appointments');
  }
};

// Update appointment status
exports.updateStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    
    if (!appointment) {
      req.flash('error_msg', 'Appointment not found');
      return res.redirect('/appointments');
    }
    
    const { status, statusNotes } = req.body;
    
    // Prepare update data
    const updateData = { status };
    
    // If status notes provided, append them to existing notes
    if (statusNotes) {
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] Status changed to ${status}: ${statusNotes}`;
      
      // If there are existing notes, append to them, otherwise create new notes
      if (appointment.notes) {
        updateData.notes = `${appointment.notes}\n\n${newNote}`;
      } else {
        updateData.notes = newNote;
      }
    }
    
    await appointment.update(updateData);
    
    req.flash('success_msg', `Appointment marked as ${status}`);
    
    // Redirect back to the list instead of the detail page for better UX
    if (req.headers.referer && req.headers.referer.includes('/appointments')) {
      return res.redirect(req.headers.referer);
    }
    
    res.redirect('/appointments');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating appointment status: ' + error.message);
    res.redirect(`/appointments/${req.params.id}`);
  }
};

// Get today's appointments
exports.getTodayAppointments = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const appointments = await Appointment.findAll({
      where: {
        appointmentDate: today
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ],
      order: [['appointmentTime', 'ASC']]
    });
    
    res.render('appointments/today', {
      pageTitle: 'Today\'s Appointments',
      appointments,
      date: today
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving today\'s appointments');
    res.redirect('/dashboard');
  }
};