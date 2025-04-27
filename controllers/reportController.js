// reportController.js
const { sequelize } = require('../config/db');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const LabTest = require('../models/LabTest');
const { Op } = require('sequelize');

// Show report selection form
exports.showReportDashboard = (req, res) => {
  res.render('reports/dashboard', {
    pageTitle: 'Reports Dashboard'
  });
};

// Get patient visit report
exports.getPatientVisitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // If no dates provided, show form
    if (!startDate || !endDate) {
      return res.render('reports/patient-visits-form', {
        pageTitle: 'Patient Visit Report'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    // Get appointments within date range
    const appointments = await Appointment.findAll({
      where: {
        appointmentDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'status',
        [sequelize.fn('DATE', sequelize.col('appointmentDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['date', 'status'],
      order: [[sequelize.fn('DATE', sequelize.col('appointmentDate')), 'ASC']]
    });
    
    // Get new patient registrations within date range
    const newPatients = await Patient.findAll({
      where: {
        registrationDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('registrationDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['date'],
      order: [[sequelize.fn('DATE', sequelize.col('registrationDate')), 'ASC']]
    });
    
    // Calculate totals
    const totalAppointments = appointments.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0);
    const totalNewPatients = newPatients.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0);
    
    res.render('reports/patient-visits', {
      pageTitle: 'Patient Visit Report',
      appointments,
      newPatients,
      totalAppointments,
      totalNewPatients,
      startDate,
      endDate
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error generating report: ' + error.message);
    res.redirect('/reports');
  }
};

// Get revenue report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // If no dates provided, show form
    if (!startDate || !endDate) {
      return res.render('reports/revenue-form', {
        pageTitle: 'Revenue Report'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    // Get billing data within date range
    const billingData = await Billing.findAll({
      where: {
        invoiceDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('invoiceDate')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('paidAmount')), 'paidAmount']
      ],
      group: ['date'],
      order: [[sequelize.fn('DATE', sequelize.col('invoiceDate')), 'ASC']]
    });
    
    // Get revenue by payment method
    const paymentMethodData = await Billing.findAll({
      where: {
        invoiceDate: {
          [Op.between]: [start, end]
        },
        paymentMethod: {
          [Op.ne]: null
        }
      },
      attributes: [
        'paymentMethod',
        [sequelize.fn('SUM', sequelize.col('paidAmount')), 'amount']
      ],
      group: ['paymentMethod']
    });
    
    // Calculate summary
    const totalBilled = billingData.reduce((sum, item) => sum + parseFloat(item.dataValues.totalAmount), 0);
    const totalCollected = billingData.reduce((sum, item) => sum + parseFloat(item.dataValues.paidAmount), 0);
    
    res.render('reports/revenue', {
      pageTitle: 'Revenue Report',
      billingData,
      paymentMethodData,
      summary: {
        totalBilled,
        totalCollected,
        outstanding: totalBilled - totalCollected
      },
      startDate,
      endDate
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error generating revenue report: ' + error.message);
    res.redirect('/reports');
  }
};

// Get lab test report
exports.getLabTestReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // If no dates provided, show form
    if (!startDate || !endDate) {
      return res.render('reports/lab-tests-form', {
        pageTitle: 'Lab Test Report'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    // Get lab tests within date range
    const labTests = await LabTest.findAll({
      where: {
        requestDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'testName',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('price')), 'revenue']
      ],
      group: ['testName'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });
    
    // Get lab test status
    const testStatus = await LabTest.findAll({
      where: {
        requestDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    // Calculate totals
    const totalTests = labTests.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0);
    const totalRevenue = labTests.reduce((sum, item) => sum + parseFloat(item.dataValues.revenue), 0);
    
    res.render('reports/lab-tests', {
      pageTitle: 'Lab Test Report',
      labTests,
      testStatus,
      summary: {
        totalTests,
        totalRevenue
      },
      startDate,
      endDate
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error generating lab test report: ' + error.message);
    res.redirect('/reports');
  }
};

// Export report to CSV or PDF
exports.exportReport = async (req, res) => {
  try {
    const { reportType, format, startDate, endDate } = req.query;
    
    if (!reportType || !format || !startDate || !endDate) {
      req.flash('error_msg', 'Missing required parameters for report export');
      return res.redirect('/reports');
    }
    
    // Here you would generate the report data based on reportType
    // and then format it as CSV or PDF
    
    // For this example, we'll just send a success message
    req.flash('success_msg', `${reportType} report exported as ${format.toUpperCase()} successfully`);
    res.redirect('/reports');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error exporting report: ' + error.message);
    res.redirect('/reports');
  }
};