const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Helper function to format dates
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Get all appointments
exports.getAllAppointments = async (req, res) => {
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
          whereConditions.appointmentDate = {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          };
          break;
        case 'upcoming':
          whereConditions.appointmentDate = {
            [Op.gte]: today
          };
          break;
        case 'week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          whereConditions.appointmentDate = {
            [Op.gte]: today,
            [Op.lte]: nextWeek
          };
          break;
      }
    }
    
    // Search filter (will be applied through include)
    let includeOptions = [
      { 
        model: Patient,
        required: false // Ensures LEFT JOIN instead of INNER JOIN
      },
      { 
        model: Doctor,
        required: false // Ensures LEFT JOIN instead of INNER JOIN
      }
    ];
    
    // If search is provided, modify the query to use a different approach
    let searchWhereCondition = whereConditions;
    if (search) {
      // Use a subquery approach or modify the main where condition
      searchWhereCondition = {
        ...whereConditions,
        [Op.or]: [
          { '$Patient.name$': { [Op.like]: `%${search}%` } },
          { '$Patient.patientId$': { [Op.like]: `%${search}%` } },
          { '$Doctor.name$': { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where: searchWhereCondition,
      include: includeOptions,
      order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']],
      limit,
      offset,
      distinct: true
    });
    
    const patients = await Patient.findAll({
      attributes: ['id', 'name', 'patientId']
    });
    
    const doctors = await Doctor.findAll({
      attributes: ['id', 'name', 'specialization']
    });
    
    const totalPages = Math.ceil(count / limit);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        appointments,
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count
      });
    }
    
    res.render('appointments', {
      title: 'Appointments',
      appointments,
      patients,
      doctors,
      status: status || 'all',
      dateRange: dateRange || 'all',
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count,
      formatDate
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
        { model: Patient, required: false },
        { model: Doctor, required: false }
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
        { model: Patient, required: false },
        { model: Doctor, required: false }
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
        { model: Doctor, required: false }
      ],
      order: [['appointmentDate', 'DESC'], ['appointmentTime', 'ASC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};