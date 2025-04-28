const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const TestRequest = require('../models/TestRequest');
const Billing = require('../models/Billing');
const CabinBooking = require('../models/CabinBooking');
const Doctor = require('../models/Doctor');
const Test = require('../models/Test');
const { Op } = require('sequelize');

// Get reports dashboard
exports.getReportsDashboard = async (req, res) => {
  try {
    res.render('reports', {
      title: 'Reports',
      user: req.user
    });
  } catch (error) {
    console.error('Error in getReportsDashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load reports dashboard'
    });
  }
};

// Get patient statistics
exports.getPatientStats = async (req, res) => {
  try {
    const totalPatients = await Patient.count();
    
    // Get patients registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newPatients = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    res.json({
      totalPatients,
      newPatients
    });
  } catch (error) {
    console.error('Error in getPatientStats:', error);
    res.status(500).json({ message: 'Failed to fetch patient statistics' });
  }
};

// Get doctor statistics
exports.getDoctorStats = async (req, res) => {
  try {
    const totalDoctors = await Doctor.count();
    
    res.json({
      totalDoctors
    });
  } catch (error) {
    console.error('Error in getDoctorStats:', error);
    res.status(500).json({ message: 'Failed to fetch doctor statistics' });
  }
};

// Get appointment statistics
exports.getAppointmentStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.count();
    
    const pendingAppointments = await Appointment.count({
      where: {
        status: {
          [Op.in]: ['Scheduled', 'Confirmed']
        },
        billingStatus: 'not_billed'
      }
    });
    
    res.json({
      totalAppointments,
      pendingAppointments
    });
  } catch (error) {
    console.error('Error in getAppointmentStats:', error);
    res.status(500).json({ message: 'Failed to fetch appointment statistics' });
  }
};

// Get test statistics
exports.getTestStats = async (req, res) => {
  try {
    const totalTests = await TestRequest.count();
    const pendingTests = await TestRequest.count({
      where: {
        billingStatus: 'not_billed'
      }
    });
    
    res.json({
      totalTests,
      pendingTests
    });
  } catch (error) {
    console.error('Error in getTestStats:', error);
    res.status(500).json({ message: 'Failed to fetch test statistics' });
  }
};

// Get billing statistics
exports.getBillingStats = async (req, res) => {
  try {
    const totalBillings = await Billing.count();
    
    // Calculate total revenue
    const billings = await Billing.findAll({
      attributes: ['totalAmount']
    });
    
    const totalRevenue = billings.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
    
    res.json({
      totalBillings,
      totalRevenue
    });
  } catch (error) {
    console.error('Error in getBillingStats:', error);
    res.status(500).json({ message: 'Failed to fetch billing statistics' });
  }
};

// Get cabin statistics
exports.getCabinStats = async (req, res) => {
  try {
    const totalBookings = await CabinBooking.count();
    const activeBookings = await CabinBooking.count({
      where: {
        status: 'Occupied'
      }
    });
    
    res.json({
      totalBookings,
      activeBookings
    });
  } catch (error) {
    console.error('Error in getCabinStats:', error);
    res.status(500).json({ message: 'Failed to fetch cabin statistics' });
  }
};

// Get all billing records
exports.getAllBillingRecords = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(billings);
  } catch (error) {
    console.error('Error in getAllBillingRecords:', error);
    res.status(500).json({ message: 'Failed to fetch billing records' });
  }
};

// Get unbilled appointments
exports.getUnbilledAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: {
        billingStatus: 'not_billed'
      },
      include: [
        { model: Patient },
        { model: Doctor }
      ],
      order: [['appointmentDate', 'DESC'], ['appointmentTime', 'ASC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Error in getUnbilledAppointments:', error);
    res.status(500).json({ message: 'Failed to fetch unbilled appointments' });
  }
};

// Get unbilled tests
exports.getUnbilledTests = async (req, res) => {
  try {
    const tests = await TestRequest.findAll({
      where: {
        billingStatus: 'not_billed'
      },
      include: [
        { model: Patient },
        { model: Test }
      ],
      order: [['requestDate', 'DESC']]
    });
    
    res.json(tests);
  } catch (error) {
    console.error('Error in getUnbilledTests:', error);
    res.status(500).json({ message: 'Failed to fetch unbilled tests' });
  }
};

// Get partial payment bills
exports.getPartialPaymentBills = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      where: {
        dueAmount: {
          [Op.gt]: 0
        },
        paidAmount: {
          [Op.gt]: 0
        }
      },
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Partial Payment Bills',
      user: req.user,
      billings,
      reportType: 'partial'
    });
  } catch (error) {
    console.error('Error in getPartialPaymentBills:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch partial payment bills'
    });
  }
};

// Get fully paid bills
exports.getFullyPaidBills = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      where: {
        dueAmount: 0
      },
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Fully Paid Bills',
      user: req.user,
      billings,
      reportType: 'paid'
    });
  } catch (error) {
    console.error('Error in getFullyPaidBills:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch fully paid bills'
    });
  }
};

// Get due payment bills
exports.getDuePaymentBills = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      where: {
        dueAmount: {
          [Op.gt]: 0
        }
      },
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Due Payment Bills',
      user: req.user,
      billings,
      reportType: 'due'
    });
  } catch (error) {
    console.error('Error in getDuePaymentBills:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch due payment bills'
    });
  }
};

// Get daily billing report
exports.getDailyBillingReport = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const billings = await Billing.findAll({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate totals
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    billings.forEach(bill => {
      totalAmount += Number(bill.totalAmount);
      totalPaid += Number(bill.paidAmount);
      totalDue += Number(bill.dueAmount);
    });
    
    res.render('billing_reports', {
      title: 'Daily Billing Report',
      user: req.user,
      billings,
      reportType: 'daily',
      summary: {
        totalAmount,
        totalPaid,
        totalDue,
        billCount: billings.length
      }
    });
  } catch (error) {
    console.error('Error in getDailyBillingReport:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch daily billing report'
    });
  }
};

// Generate monthly revenue report
exports.getMonthlyRevenueReport = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year || new Date().getFullYear();
    
    const months = Array.from({ length: 12 }, (_, i) => {
      const startDate = new Date(selectedYear, i, 1);
      const endDate = new Date(selectedYear, i + 1, 0);
      return { startDate, endDate };
    });
    
    const monthlyRevenue = await Promise.all(
      months.map(async ({ startDate, endDate }, index) => {
        const billings = await Billing.findAll({
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          attributes: ['totalAmount']
        });
        
        const revenue = billings.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
        
        return {
          month: index + 1,
          revenue
        };
      })
    );
    
    res.json(monthlyRevenue);
  } catch (error) {
    console.error('Error in getMonthlyRevenueReport:', error);
    res.status(500).json({ message: 'Failed to generate monthly revenue report' });
  }
}; 