const Test = require('../models/Test');
const TestRequest = require('../models/TestRequest');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const { search, priceRange } = req.query;
    
    // Define where conditions for search and filters
    const whereConditions = {};
    
    // Apply search filter if provided
    if (search) {
      whereConditions.name = { [Op.like]: `%${search}%` };
    }
    
    // Apply price range filter if provided
    if (priceRange && priceRange !== 'all') {
      switch(priceRange) {
        case '0-500':
          whereConditions.price = { [Op.between]: [0, 500] };
          break;
        case '500-1000':
          whereConditions.price = { [Op.between]: [500, 1000] };
          break;
        case '1000-2000':
          whereConditions.price = { [Op.between]: [1000, 2000] };
          break;
        case '2000-plus':
          whereConditions.price = { [Op.gte]: 2000 };
          break;
      }
    }
    
    const tests = await Test.findAll({
      where: whereConditions,
      order: [['name', 'ASC']]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(tests);
    }
    
    res.render('tests', {
      title: 'Tests',
      tests,
      search: search || '',
      priceRange: priceRange || 'all'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all test requisitions with filters
exports.getAllTestRequisitions = async (req, res) => {
  try {
    const { status, priority, dateRange, search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    // Status filter
    if (status && status !== 'all') {
      whereConditions.status = status;
    }
    
    // Priority filter
    if (priority && priority !== 'all') {
      whereConditions.priority = priority;
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateRange) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          whereConditions.requestDate = {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          };
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          whereConditions.requestDate = {
            [Op.gte]: yesterday,
            [Op.lt]: today
          };
          break;
        case 'week':
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          whereConditions.requestDate = {
            [Op.gte]: lastWeek
          };
          break;
        case 'month':
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          whereConditions.requestDate = {
            [Op.gte]: lastMonth
          };
          break;
      }
    }
    
    // Search filter
    if (search) {
      // We need to join related models to search in their fields
      // This will be handled in the include options
    }
    
    // Setup include options for related models
    const includeOptions = [
      { 
        model: Patient,
        where: search ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { patientId: { [Op.like]: `%${search}%` } }
          ]
        } : undefined
      },
      { 
        model: Test,
        where: search ? { name: { [Op.like]: `%${search}%` } } : undefined
      },
      { 
        model: Doctor
      }
    ];
    
    // Count total requisitions matching filters
    const { count, rows: requisitions } = await TestRequest.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      order: [['requestDate', 'DESC']],
      limit,
      offset,
      distinct: true
    });
    
    const totalPages = Math.ceil(count / limit);
    
    res.render('test_requisitions', {
      title: 'Test Requisitions',
      requisitions,
      status: status || 'all',
      priority: priority || 'all',
      dateRange: dateRange || 'all',
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
    });
  } catch (error) {
    console.error('Error in getAllTestRequisitions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch test requisitions'
    });
  }
};

// Get single test
exports.getTest = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new test
exports.createTest = async (req, res) => {
  try {
    const { name, price, description, commission } = req.body;
    
    const test = await Test.create({
      name,
      price,
      description,
      commission: commission || 0
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(test);
    }
    
    res.redirect('/tests');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update test
exports.updateTest = async (req, res) => {
  try {
    const { name, price, description, commission } = req.body;
    
    let test = await Test.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    test = await test.update({
      name,
      price,
      description,
      commission: commission || 0
    });
    
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete test
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    await test.destroy();
    
    res.json({ message: 'Test removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create test request
exports.createTestRequest = async (req, res) => {
  try {
    const { patientId, testId, priority, deliveryOption, deliveryDate } = req.body;
    
    // Process delivery date if it exists
    let processedDeliveryDate = null;
    if (deliveryDate && deliveryDate.trim() !== '') {
      processedDeliveryDate = new Date(deliveryDate);
      
      // Check if date is valid
      if (isNaN(processedDeliveryDate.getTime())) {
        processedDeliveryDate = null;
      }
    }
    
    const testRequest = await TestRequest.create({
      PatientId: patientId,
      TestId: testId,
      priority: priority || 'Normal',
      requestDate: new Date(),
      deliveryOption: deliveryOption || 'Not Collected',
      deliveryDate: processedDeliveryDate
    });
    
    const fullTestRequest = await TestRequest.findByPk(testRequest.id, {
      include: [
        { model: Patient },
        { model: Test }
      ]
    });
    
    res.status(201).json(fullTestRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get test requests by patient
exports.getTestRequestsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const testRequests = await TestRequest.findAll({
      where: { PatientId: patientId },
      include: [
        { model: Test }
      ],
      order: [['requestDate', 'DESC']]
    });
    
    res.json(testRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get doctor commissions report
exports.getDoctorCommissions = async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;
    
    // Build query conditions
    const whereConditions = {
      billingStatus: 'billed',
    };
    
    // Add doctor filter if provided
    if (doctorId) {
      whereConditions.DoctorId = doctorId;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditions.requestDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.requestDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.requestDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    const commissions = await TestRequest.findAll({
      where: whereConditions,
      include: [
        { model: Doctor },
        { model: Test },
        { model: Patient }
      ],
      order: [['requestDate', 'DESC']]
    });
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(commissions);
    }
    
    // For web requests, render the commission report view
    res.render('commission_reports', {
      title: 'Doctor Commission Reports',
      commissions,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete test requisition
exports.deleteTestRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequisition = await TestRequest.findByPk(id);
    
    if (!testRequisition) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test requisition not found' 
      });
    }
    
    // Check if the test requisition is already billed - don't allow deletion if billed
    if (testRequisition.billingStatus === 'billed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete a billed test requisition' 
      });
    }
    
    await testRequisition.destroy();
    
    res.json({ 
      success: true, 
      message: 'Test requisition deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting test requisition:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting test requisition' 
    });
  }
};