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
    const { doctorId, status, startDate, endDate, page = 1, limit = 'all' } = req.query;
    
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

    // Use pagination if limit is specified, otherwise load all (for DataTables)
    let commissions, totalRecords = 0, totalPages = 1;
    
    if (limit !== 'all' && !isNaN(limit)) {
      const limitNum = parseInt(limit);
      const offset = (parseInt(page) - 1) * limitNum;
      
      const result = await DoctorCommission.findAndCountAll({
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
        order: [['commissionDate', 'DESC']],
        limit: limitNum,
        offset,
        distinct: true
      });
      
      commissions = result.rows;
      totalRecords = result.count;
      totalPages = Math.ceil(totalRecords / limitNum);
    } else {
      // Load all for DataTables client-side pagination
      commissions = await DoctorCommission.findAll({
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
      totalRecords = commissions.length;
    }
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        commissions,
        currentPage: parseInt(page),
        totalPages,
        totalRecords
      });
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
      query: req.query,
      currentPage: parseInt(page),
      totalPages,
      totalRecords
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

