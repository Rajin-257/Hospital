const Test = require('../models/Test');
const TestRequest = require('../models/TestRequest');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');
const { getTenantTestDepartment, getTenantTestCategory, getTenantTestGroup, getTenantTest, getTenantTestRequest } = require('../utils/tenantModels');

// Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const { search, priceRange, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Use tenant model
    const Test = getTenantTest();
    
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

    const { count, rows: tests } = await Test.findAndCountAll({
      where: whereConditions,
      order: [['name', 'ASC']],
      limit,
      offset
    });
    
    const totalPages = Math.ceil(count / limit);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        tests,
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count
      });
    }
    
    res.render('tests', {
      title: 'Tests',
      tests,
      search: search || '',
      priceRange: priceRange || 'all',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
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
    const Test = getTenantTest();
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
    const { name, price, description, commission, test_group_id, unit, bilogical_ref_range } = req.body;
    
    const Test = getTenantTest();
    
    const test = await Test.create({
      name,
      price,
      description,
      commission: commission || 0,
      test_group_id: test_group_id || null,
      unit: unit || null,
      bilogical_ref_range: bilogical_ref_range || null
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
    const { name, price, description, commission, test_group_id, unit, bilogical_ref_range } = req.body;
    
    const Test = getTenantTest();
    let test = await Test.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    test = await test.update({
      name,
      price,
      description,
      commission: commission || 0,
      test_group_id: test_group_id || null,
      unit: unit || null,
      bilogical_ref_range: bilogical_ref_range || null
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
    const Test = getTenantTest();
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
    
    const TestRequest = getTenantTestRequest();
    const testRequisition = await TestRequest.findByPk(id);
    
    if (!testRequisition) {
      return res.status(404).json({ message: 'Test requisition not found' });
    }
    
    await testRequisition.destroy();
    
    res.json({ message: 'Test requisition deleted successfully' });
  } catch (error) {
    console.error('Error deleting test requisition:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete test requisition'
    });
  }
};

// Get single test requisition
exports.getTestRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequisition = await TestRequest.findByPk(id, {
      include: [
        { model: Patient },
        { model: Test },
        { model: Doctor }
      ]
    });
    
    if (!testRequisition) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Test requisition not found'
      });
    }
    
    res.render('test_requisition_detail', {
      title: 'Test Requisition Details',
      requisition: testRequisition
    });
  } catch (error) {
    console.error('Error getting test requisition:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch test requisition details'
    });
  }
};

// Show edit test requisition page
exports.editTestRequisitionPage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequisition = await TestRequest.findByPk(id, {
      include: [
        { model: Patient },
        { model: Test },
        { model: Doctor }
      ]
    });
    
    if (!testRequisition) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Test requisition not found'
      });
    }
    
    // Get all doctors for dropdown
    const doctors = await Doctor.findAll({
      order: [['name', 'ASC']]
    });
    
    res.render('test_requisition_edit', {
      title: 'Edit Test Requisition',
      requisition: testRequisition,
      doctors
    });
  } catch (error) {
    console.error('Error preparing edit page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit page'
    });
  }
};

// Update test requisition
exports.updateTestRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      priority, 
      doctorId, 
      deliveryOption, 
      deliveryDate,
      notes
    } = req.body;
    
    const testRequisition = await TestRequest.findByPk(id);
    
    if (!testRequisition) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Test requisition not found'
      });
    }
    
    // Update test requisition
    await testRequisition.update({
      status,
      priority,
      DoctorId: doctorId || null,
      deliveryOption,
      deliveryDate: deliveryDate || null,
      notes: notes || null
    });
    
    // Redirect to test requisition list with success message
    res.redirect('/tests/requisitions?message=Test requisition updated successfully');
  } catch (error) {
    console.error('Error updating test requisition:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update test requisition'
    });
  }
};

// Test Department Methods
exports.getAllTestDepartments = async (req, res) => {
  try {
    const TestDepartment = getTenantTestDepartment();
    const departments = await TestDepartment.findAll({
      order: [['name', 'ASC']]
    });
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching test departments:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.createTestDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    const TestDepartment = getTenantTestDepartment();
    
    const department = await TestDepartment.create({ name });
    
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating test department:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getTestDepartment = async (req, res) => {
  try {
    const TestDepartment = getTenantTestDepartment();
    const department = await TestDepartment.findByPk(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Test department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Error fetching test department:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateTestDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    const TestDepartment = getTenantTestDepartment();
    
    let department = await TestDepartment.findByPk(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Test department not found' });
    }
    
    department = await department.update({ name });
    
    res.json(department);
  } catch (error) {
    console.error('Error updating test department:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteTestDepartment = async (req, res) => {
  try {
    const TestDepartment = getTenantTestDepartment();
    const department = await TestDepartment.findByPk(req.params.id);
    
    if (!department) {
      return res.status(404).json({ message: 'Test department not found' });
    }
    
    await department.destroy();
    
    res.json({ message: 'Test department removed' });
  } catch (error) {
    console.error('Error deleting test department:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Test Category Methods
exports.getAllTestCategories = async (req, res) => {
  try {
    const TestCategory = getTenantTestCategory();
    const TestDepartment = getTenantTestDepartment();
    
    // Get all categories with their department information
    const categories = await TestCategory.findAll({
      order: [['name', 'ASC']]
    });
    
    // Manually fetch department information for each category
    const categoriesWithDepartments = await Promise.all(
      categories.map(async (category) => {
        const department = await TestDepartment.findByPk(category.test_department_id);
        return {
          ...category.toJSON(),
          TestDepartment: department
        };
      })
    );
    
    res.json(categoriesWithDepartments);
  } catch (error) {
    console.error('Error fetching test categories:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.createTestCategory = async (req, res) => {
  try {
    const { name, test_department_id } = req.body;
    const TestCategory = getTenantTestCategory();
    
    const category = await TestCategory.create({ name, test_department_id });
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating test category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getTestCategory = async (req, res) => {
  try {
    const TestCategory = getTenantTestCategory();
    const TestDepartment = getTenantTestDepartment();
    
    const category = await TestCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Test category not found' });
    }
    
    // Manually fetch department information
    const department = await TestDepartment.findByPk(category.test_department_id);
    const categoryWithDepartment = {
      ...category.toJSON(),
      TestDepartment: department
    };
    
    res.json(categoryWithDepartment);
  } catch (error) {
    console.error('Error fetching test category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateTestCategory = async (req, res) => {
  try {
    const { name, test_department_id } = req.body;
    const TestCategory = getTenantTestCategory();
    
    let category = await TestCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Test category not found' });
    }
    
    category = await category.update({ name, test_department_id });
    
    res.json(category);
  } catch (error) {
    console.error('Error updating test category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteTestCategory = async (req, res) => {
  try {
    const TestCategory = getTenantTestCategory();
    const category = await TestCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Test category not found' });
    }
    
    await category.destroy();
    
    res.json({ message: 'Test category removed' });
  } catch (error) {
    console.error('Error deleting test category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Test Group Methods
exports.getAllTestGroups = async (req, res) => {
  try {
    const TestGroup = getTenantTestGroup();
    const TestCategory = getTenantTestCategory();
    const TestDepartment = getTenantTestDepartment();
    
    const groups = await TestGroup.findAll({
      order: [['name', 'ASC']]
    });
    
    // Manually fetch category and department information
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const category = await TestCategory.findByPk(group.test_category_id);
        const department = category ? await TestDepartment.findByPk(category.test_department_id) : null;
        return {
          ...group.toJSON(),
          TestCategory: category ? {
            ...category.toJSON(),
            TestDepartment: department
          } : null
        };
      })
    );
    
    res.json(groupsWithDetails);
  } catch (error) {
    console.error('Error fetching test groups:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.createTestGroup = async (req, res) => {
  try {
    const { name, test_category_id } = req.body;
    const TestGroup = getTenantTestGroup();
    
    const group = await TestGroup.create({ name, test_category_id });
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating test group:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getTestGroup = async (req, res) => {
  try {
    const TestGroup = getTenantTestGroup();
    const TestCategory = getTenantTestCategory();
    const TestDepartment = getTenantTestDepartment();
    
    const group = await TestGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Test group not found' });
    }
    
    // Manually fetch category and department information
    const category = await TestCategory.findByPk(group.test_category_id);
    const department = category ? await TestDepartment.findByPk(category.test_department_id) : null;
    const groupWithDetails = {
      ...group.toJSON(),
      TestCategory: category ? {
        ...category.toJSON(),
        TestDepartment: department
      } : null
    };
    
    res.json(groupWithDetails);
  } catch (error) {
    console.error('Error fetching test group:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateTestGroup = async (req, res) => {
  try {
    const { name, test_category_id } = req.body;
    const TestGroup = getTenantTestGroup();
    
    let group = await TestGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Test group not found' });
    }
    
    group = await group.update({ name, test_category_id });
    
    res.json(group);
  } catch (error) {
    console.error('Error updating test group:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteTestGroup = async (req, res) => {
  try {
    const TestGroup = getTenantTestGroup();
    const group = await TestGroup.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Test group not found' });
    }
    
    await group.destroy();
    
    res.json({ message: 'Test group removed' });
  } catch (error) {
    console.error('Error deleting test group:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Test Result Methods
exports.getTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequest = await TestRequest.findByPk(id, {
      include: [
        { model: Patient },
        { model: Test },
        { model: Doctor }
      ]
    });
    
    if (!testRequest) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Test request not found'
      });
    }
    
    // Check if test has results
    if (!testRequest.result && !testRequest.resultNotes) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'No results available for this test'
      });
    }
    
    res.render('test_result_view', {
      title: 'Test Results',
      testRequest
    });
  } catch (error) {
    console.error('Error getting test result:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to fetch test results'
    });
  }
};

exports.showUploadResultForm = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequest = await TestRequest.findByPk(id, {
      include: [
        { model: Patient },
        { model: Test },
        { model: Doctor }
      ]
    });
    
    if (!testRequest) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Test request not found'
      });
    }
    
    res.render('test_result_upload', {
      title: 'Upload Test Result',
      testRequest
    });
  } catch (error) {
    console.error('Error showing upload form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load upload form'
    });
  }
};

exports.uploadTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, resultNotes } = req.body;
    
    const testRequest = await TestRequest.findByPk(id);
    
    if (!testRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test request not found' 
      });
    }
    
    // Update test request with results
    await testRequest.update({
      result: result || null,
      resultNotes: resultNotes || null,
      status: 'Completed',
      completedDate: new Date()
    });
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Test result uploaded successfully',
        testRequest: await TestRequest.findByPk(id, {
          include: [
            { model: Patient },
            { model: Test },
            { model: Doctor }
          ]
        })
      });
    }
    
    // For form submissions
    res.redirect(`/tests/results/${id}?message=Test result uploaded successfully`);
  } catch (error) {
    console.error('Error uploading test result:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload test result'
      });
    }
    
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to upload test result'
    });
  }
};

exports.updateTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, resultNotes } = req.body;
    
    const testRequest = await TestRequest.findByPk(id);
    
    if (!testRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test request not found' 
      });
    }
    
    // Update test request with results
    await testRequest.update({
      result: result || null,
      resultNotes: resultNotes || null,
      status: 'Completed',
      completedDate: new Date()
    });
    
    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Test result updated successfully',
        testRequest: await TestRequest.findByPk(id, {
          include: [
            { model: Patient },
            { model: Test },
            { model: Doctor }
          ]
        })
      });
    }
    
    // For form submissions
    res.redirect(`/tests/results/${id}?message=Test result updated successfully`);
  } catch (error) {
    console.error('Error updating test result:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update test result'
      });
    }
    
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update test result'
    });
  }
};

exports.deleteTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRequest = await TestRequest.findByPk(id);
    
    if (!testRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test request not found' 
      });
    }
    
    // Clear test results
    await testRequest.update({
      result: null,
      resultNotes: null,
      status: 'Pending',
      completedDate: null
    });
    
    res.json({
      success: true,
      message: 'Test result cleared successfully'
    });
  } catch (error) {
    console.error('Error deleting test result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear test result'
    });
  }
};

module.exports = exports;