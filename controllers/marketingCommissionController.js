const MarketingCommission = require('../models/MarketingCommission');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const { Op, Sequelize } = require('sequelize');

// Get all marketing commissions with filtering options
exports.getCommissions = async (req, res) => {
  try {
    const { marketingManagerId, status, startDate, endDate } = req.query;
    
    // Build query conditions
    const whereConditions = {};
    
    // Add marketing manager filter if provided
    if (marketingManagerId) {
      whereConditions.marketingManagerId = marketingManagerId;
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
    
    const commissions = await MarketingCommission.findAll({
      where: whereConditions,
      include: [
        { 
          model: User,
          as: 'MarketingManager',
          attributes: ['id', 'username', 'email']
        },
        { 
          model: Patient,
          attributes: ['id', 'name', 'patientId', 'phone']
        },
        { 
          model: Billing,
          attributes: ['id', 'billNumber', 'billDate', 'totalAmount', 'netPayable']
        }
      ],
      order: [['commissionDate', 'DESC']]
    });
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(commissions);
    }
    
    // Get all marketing managers for filter dropdown
    const marketingManagers = await User.findAll({
      where: { role: 'marketing' },
      attributes: ['id', 'username', 'email'],
      order: [['username', 'ASC']]
    });
    
    // For web requests, render the commission report view
    res.render('marketing_commission_reports', {
      title: 'Marketing Commission Reports',
      commissions,
      marketingManagers,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get commission summary by marketing manager
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
    
    const summary = await MarketingCommission.findAll({
      attributes: [
        'marketingManagerId',
        [Sequelize.fn('COUNT', Sequelize.col('MarketingCommission.id')), 'totalBillings'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('AVG', Sequelize.col('commissionPercentage')), 'avgCommissionPercentage']
      ],
      where: whereConditions,
      include: [{ 
        model: User,
        as: 'MarketingManager',
        attributes: ['username', 'email']
      }],
      group: ['marketingManagerId', 'MarketingManager.id', 'MarketingManager.username', 'MarketingManager.email'],
      order: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'DESC']]
    });
    
    // Process the summary results to ensure numeric values
    const processedSummary = summary.map(item => {
      const plainItem = item.get({ plain: true });
      
      // Ensure numeric values
      plainItem.totalBillings = parseInt(plainItem.totalBillings) || 0;
      plainItem.totalAmount = parseFloat(plainItem.totalAmount) || 0;
      plainItem.avgCommissionPercentage = parseFloat(plainItem.avgCommissionPercentage) || 0;
      
      return plainItem;
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(processedSummary);
    }
    
    res.render('marketing_commission_summary', {
      title: 'Marketing Commission Summary',
      summary: processedSummary,
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
    const { commissionIds, marketingManagerId, paidDate, notes } = req.body;
    
    if (!commissionIds || commissionIds.length === 0) {
      return res.status(400).json({ message: 'No commission IDs provided' });
    }
    
    const parsedIds = Array.isArray(commissionIds) ? commissionIds : JSON.parse(commissionIds);
    
    // Update the commissions
    await MarketingCommission.update(
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
    
    // If filtering by marketing manager, maintain that filter
    const redirectUrl = marketingManagerId ? 
      `/marketing-commissions?marketingManagerId=${marketingManagerId}` : 
      '/marketing-commissions';
      
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

