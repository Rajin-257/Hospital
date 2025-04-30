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
    // Get feature permissions from request
    const featurePermissions = req.featurePermissions || {};
    
    // Check feature visibility for current user
    const userRole = req.user.role;
    
    // For admin users, all features are visible regardless of permission settings
    let visibleFeatures;
    if (userRole === 'admin') {
      visibleFeatures = {
        billingReports: true,
        patientReports: true,
        appointmentReports: true,
        testReports: true
      };
    } else {
      // Helper function imported from middleware
      const isFeatureVisible = (permissionsMap, featureName, userRole) => {
        if (!permissionsMap) return true;
        const permission = permissionsMap[featureName];
        if (!permission) return true;
        return permission.isVisible && permission.roles.includes(userRole);
      };
      
      visibleFeatures = {
        billingReports: isFeatureVisible(featurePermissions, 'Billing Reports', userRole),
        patientReports: isFeatureVisible(featurePermissions, 'Patient Reports', userRole),
        appointmentReports: isFeatureVisible(featurePermissions, 'Appointment Reports', userRole),
        testReports: isFeatureVisible(featurePermissions, 'Test Reports', userRole)
      };
    }
    
    res.render('reports', {
      title: 'Reports',
      user: req.user,
      visibleFeatures
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
    const { startDate, endDate, searchType, searchQuery } = req.query;
    
    // Build where clause based on filters
    let whereClause = {};
    let patientWhereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      
      whereClause.billDate = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [
        { 
          model: Patient,
          where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
        }
      ],
      order: [['billDate', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'All Billing Records',
      bills,
      summary: calculateBillingSummary(bills),
      reportType: 'all',
      startDate: startDate || '',
      endDate: endDate || '',
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
    });
  } catch (error) {
    console.error('Error in getAllBillingRecords:', error);
    res.status(500).render('error', {
      message: 'Failed to fetch billing records'
    });
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
    const { startDate, endDate, searchType, searchQuery } = req.query;
    
    // Build where clause based on filters
    let whereClause = {
      dueAmount: {
        [Op.gt]: 0
      },
      paidAmount: {
        [Op.gt]: 0
      }
    };
    let patientWhereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      
      whereClause.billDate = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [{ 
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Partial Payment Bills',
      user: req.user,
      bills,
      reportType: 'partial',
      startDate: startDate || '',
      endDate: endDate || '',
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
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
    const { startDate, endDate, searchType, searchQuery } = req.query;
    
    // Build where clause based on filters
    let whereClause = {
      dueAmount: 0
    };
    let patientWhereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      
      whereClause.billDate = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [{ 
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Fully Paid Bills',
      user: req.user,
      bills,
      reportType: 'paid',
      startDate: startDate || '',
      endDate: endDate || '',
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
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
    const { startDate, endDate, searchType, searchQuery } = req.query;
    
    // Build where clause based on filters
    let whereClause = {
      dueAmount: {
        [Op.gt]: 0
      },
      status: 'due'
    };
    let patientWhereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      
      whereClause.billDate = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [{ 
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      }],
      order: [['billDate', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Due Payment Bills',
      bills,
      summary: calculateBillingSummary(bills),
      reportType: 'due',
      startDate: startDate || '',
      endDate: endDate || '',
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
    });
  } catch (error) {
    console.error('Error in getDuePaymentBills:', error);
    res.status(500).render('error', {
      message: 'Failed to fetch due payment bills'
    });
  }
};

// Get daily billing report
exports.getDailyBillingReport = async (req, res) => {
  try {
    const { searchType, searchQuery } = req.query;
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    // Build where clause based on filters
    let whereClause = {
      createdAt: {
        [Op.between]: [startOfDay, endOfDay]
      }
    };
    let patientWhereClause = {};
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [{ 
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'Daily Billing Report',
      user: req.user,
      bills,
      reportType: 'daily',
      summary: {
        totalAmount: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
        totalPaid: bills.reduce((sum, bill) => sum + Number(bill.paidAmount), 0),
        totalDue: bills.reduce((sum, bill) => sum + Number(bill.dueAmount), 0),
        billCount: bills.length
      },
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
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

// Get all payment types report (both paid and due)
exports.getAllPaymentTypesReport = async (req, res) => {
  try {
    const { startDate, endDate, searchType, searchQuery } = req.query;
    
    // Build where clause based on filters
    let whereClause = {};
    let patientWhereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      
      whereClause.billDate = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }
    
    // Search filter
    if (searchQuery && searchType) {
      switch (searchType) {
        case 'billNumber':
          whereClause.billNumber = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientId':
          patientWhereClause.patientId = { [Op.like]: `%${searchQuery}%` };
          break;
        case 'patientName':
          patientWhereClause.name = { [Op.like]: `%${searchQuery}%` };
          break;
        // If 'all' or any other value, we don't add specific filter criteria
      }
    }
    
    const bills = await Billing.findAll({
      where: whereClause,
      include: [{ 
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      }],
      order: [['billDate', 'DESC']]
    });
    
    res.render('billing_reports', {
      title: 'All Payment Types Report',
      user: req.user,
      bills,
      reportType: 'all-payment-types',
      summary: calculateBillingSummary(bills),
      startDate: startDate || '',
      endDate: endDate || '',
      searchType: searchType || 'all',
      searchQuery: searchQuery || ''
    });
  } catch (error) {
    console.error('Error in getAllPaymentTypesReport:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch payment reports'
    });
  }
};

// Helper function to calculate billing summary
function calculateBillingSummary(bills) {
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalPaid = 0;
  let totalDue = 0;
  let paidCount = 0;
  let dueCount = 0;
  
  bills.forEach(bill => {
    totalAmount += Number(bill.totalAmount);
    totalDiscount += Number(bill.discountAmount);
    totalNet += Number(bill.netPayable);
    totalPaid += Number(bill.paidAmount);
    totalDue += Number(bill.dueAmount);
    
    if (bill.status === 'paid') {
      paidCount++;
    } else {
      dueCount++;
    }
  });
  
  return {
    totalAmount,
    totalDiscount,
    totalNet,
    totalPaid,
    totalDue,
    paidCount,
    dueCount,
    totalCount: bills.length
  };
}

// Render billing reports page
exports.renderBillingReports = async (req, res) => {
  try {
    res.render('reports', {
      title: 'Billing Reports',
      activeReport: 'billing'
    });
  } catch (error) {
    console.error('Error in renderBillingReports:', error);
    res.status(500).render('error', {
      message: 'Failed to render billing reports page'
    });
  }
};

// Get all billing records for API (JSON response)
exports.getAllBillingRecordsApi = async (req, res) => {
  try {
    const bills = await Billing.findAll({
      include: [
        { model: Patient }
      ],
      order: [['billDate', 'DESC']]
    });
    
    res.json(bills);
  } catch (error) {
    console.error('Error in getAllBillingRecordsApi:', error);
    res.status(500).json({ 
      message: 'Failed to fetch billing records'
    });
  }
}; 