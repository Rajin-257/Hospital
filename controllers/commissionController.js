const DoctorCommission = require('../models/DoctorCommission');
const Doctor = require('../models/Doctor');
const Test = require('../models/Test');
const TestRequest = require('../models/TestRequest');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Get all commissions with filtering options
exports.getCommissions = async (req, res) => {
  try {
    const { doctorId, status, startDate, endDate } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    
    // Add doctor filter if provided
    if (doctorId) {
      whereConditions.DoctorId = doctorId;
    }
    
    // Add status filter if provided
    if (status && ['pending', 'paid'].includes(status)) {
      whereConditions.status = status;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditions.commissionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.commissionDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.commissionDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    const commissions = await DoctorCommission.findAll({
      where: whereConditions,
      include: [
        { 
          model: Doctor,
          attributes: ['id', 'name', 'phone']
        },
        { 
          model: Test,
          attributes: ['id', 'name', 'price']
        },
        { 
          model: TestRequest,
          include: [
            { model: Patient, attributes: ['id', 'name', 'patientId'] }
          ]
        },
        { 
          model: Billing,
          attributes: ['id', 'billNumber', 'billDate']
        }
      ],
      order: [['commissionDate', 'DESC']]
    });
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(commissions);
    }
    
    // Get all doctors for filter dropdown
    const doctors = await Doctor.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    
    // For web requests, render the commission report view
    res.render('commission_reports', {
      title: 'Doctor Commission Reports',
      commissions,
      doctors,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get commission summary by doctor
exports.getCommissionSummary = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    
    // Add status filter if provided
    if (status && ['pending', 'paid'].includes(status)) {
      whereConditions.status = status;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditions.commissionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.commissionDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.commissionDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    const summary = await DoctorCommission.findAll({
      attributes: [
        'DoctorId',
        [Sequelize.fn('COUNT', Sequelize.col('DoctorCommission.id')), 'totalTests'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount']
      ],
      where: whereConditions,
      include: [{ 
        model: Doctor,
        attributes: ['name', 'phone']
      }],
      group: ['DoctorId', 'Doctor.id', 'Doctor.name', 'Doctor.phone'],
      order: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'DESC']]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(summary);
    }
    
    res.render('commission_summary', {
      title: 'Doctor Commission Summary',
      summary,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mark commissions as paid
exports.markAsPaid = async (req, res) => {
  try {
    const { commissionIds, doctorId, paidDate, notes } = req.body;
    
    if (!commissionIds || commissionIds.length === 0) {
      return res.status(400).json({ message: 'No commission IDs provided' });
    }
    
    const parsedIds = Array.isArray(commissionIds) ? commissionIds : JSON.parse(commissionIds);
    
    // Update the commissions
    await DoctorCommission.update(
      {
        status: 'paid',
        paidDate: paidDate || new Date(),
        notes: notes
      },
      {
        where: {
          id: { [Op.in]: parsedIds },
          status: 'pending' // Only update pending commissions
        }
      }
    );
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ message: 'Commissions marked as paid successfully' });
    }
    
    // If filtering by doctor, maintain that filter
    const redirectUrl = doctorId ? 
      `/commissions?doctorId=${doctorId}` : 
      '/commissions';
      
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}; 