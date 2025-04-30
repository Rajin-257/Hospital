const Test = require('../models/Test');
const TestRequest = require('../models/TestRequest');
const Patient = require('../models/Patient');
const { Op } = require('sequelize');

// Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.findAll();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(tests);
    }
    
    res.render('tests', {
      title: 'Tests',
      tests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
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
    const { name, code, price, description } = req.body;
    
    const test = await Test.create({
      name,
      code,
      price,
      description
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
    const { name, price, description } = req.body;
    
    let test = await Test.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    test = await test.update({
      name,
      price,
      description
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