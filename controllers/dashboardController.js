// dashboardController.js
const { sequelize } = require('../config/db');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Cabin = require('../models/Cabin');
const LabTest = require('../models/LabTest');
const Billing = require('../models/Billing');
const { Op } = require('sequelize');

exports.getDashboardData = async (req, res) => {
  try {
    const currentUser = req.user;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get stats based on user role
    let dashboardData = {};
    
    // Basic stats for all users
    const totalPatients = await Patient.count()||0 ;
    const totalDoctors = await Doctor.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { isAvailable: true }
    });
    
    const availableCabins = await Cabin.count({
      where: { status: 'available' }
    });
    
    // Today's appointments
    const todayAppointments = await Appointment.findAll({
      where: {
        appointmentDate: {
          [Op.eq]: sequelize.fn('CURDATE')
        }
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ],
      order: [['appointmentTime', 'ASC']]
    });
    
    // Common dashboard data for all users
    dashboardData = {
      totalPatients,
      availableDoctors: totalDoctors[0].dataValues.count,
      availableCabins,
      todayAppointments
    };
    
    // Role-specific dashboard data
    switch (currentUser.role) {
      case 'admin':
        // Get pending lab tests
        const pendingLabTests = await LabTest.count({
          where: {
            status: {
              [Op.in]: ['requested', 'scheduled']
            }
          }
        });
        
        // Get recent billing data
        const recentBillings = await Billing.findAll({
          limit: 5,
          order: [['createdAt', 'DESC']],
          include: [{
            model: Patient,
            attributes: ['firstName', 'lastName']
          }]
        });
        
        // Get monthly revenue
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const monthlyRevenue = await Billing.sum('paidAmount', {
          where: {
            paymentDate: {
              [Op.between]: [startOfMonth, endOfMonth]
            }
          }
        });
        
        dashboardData = {
          ...dashboardData,
          pendingLabTests,
          recentBillings,
          monthlyRevenue: monthlyRevenue || 0
        };
        break;
        
      case 'doctor':
        // Get doctor's upcoming appointments
        const doctorId = req.session.user.doctorId; // Assuming this is stored in session
        if (doctorId) {
          const upcomingAppointments = await Appointment.findAll({
            where: {
              doctorId,
              appointmentDate: {
                [Op.gte]: today
              },
              status: 'scheduled'
            },
            include: [{
              model: Patient,
              attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
            }],
            order: [
              ['appointmentDate', 'ASC'],
              ['appointmentTime', 'ASC']
            ],
            limit: 10
          });
          
          dashboardData.upcomingAppointments = upcomingAppointments;
        }
        break;
        
      case 'receptionist':
        // Get today's and tomorrow's appointments
        const tomorrowAppointments = await Appointment.findAll({
          where: {
            appointmentDate: {
              [Op.eq]: sequelize.literal('DATE_ADD(CURDATE(), INTERVAL 1 DAY)')
            }
          },
          include: [
            {
              model: Patient,
              attributes: ['id', 'patientId', 'firstName', 'lastName']
            },
            {
              model: Doctor,
              attributes: ['id', 'firstName', 'lastName', 'specialization']
            }
          ],
          order: [['appointmentTime', 'ASC']]
        });
        
        // Recently registered patients
        const recentPatients = await Patient.findAll({
          order: [['registrationDate', 'DESC']],
          limit: 5
        });
        
        dashboardData = {
          ...dashboardData,
          tomorrowAppointments,
          recentPatients
        };
        break;
        
      case 'lab_technician':
        // Get pending lab tests assigned to this technician
        const technicianId = req.session.user.staffId; // Assuming this is stored in session
        if (technicianId) {
          const assignedTests = await LabTest.findAll({
            where: {
              technicianId,
              status: {
                [Op.in]: ['scheduled']
              }
            },
            include: [
              {
                model: Patient,
                attributes: ['id', 'patientId', 'firstName', 'lastName']
              },
              {
                model: Doctor,
                attributes: ['id', 'firstName', 'lastName', 'specialization']
              }
            ],
            order: [['scheduledDate', 'ASC']],
            limit: 10
          });
          
          dashboardData.assignedTests = assignedTests;
        }
        break;
        
      case 'nurse':
        // Get occupied cabins with patient info
        const occupiedCabins = await Cabin.findAll({
          where: { status: 'occupied' },
          include: [{
            model: Patient,
            attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
          }],
          order: [['floor', 'ASC'], ['cabinNumber', 'ASC']]
        });
        
        dashboardData.occupiedCabins = occupiedCabins;
        break;
    }
    
    res.render('dashboard', {
      pageTitle: 'Dashboard',
      user: currentUser,
      ...dashboardData
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading dashboard data');
    res.render('dashboard', {
      pageTitle: 'Dashboard',
      user: req.user,
      error: 'Failed to load some dashboard components'
    });
  }
};