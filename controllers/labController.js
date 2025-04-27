// labController.js
const LabTest = require('../models/LabTest');
const LabTestType = require('../models/LabTestType');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');

// Show create lab test form
exports.showCreateLabTestForm = async (req, res) => {
  try {
    const { patientId } = req.query;
    const doctors = await Doctor.findAll();
    const technicians = await Staff.findAll({ where: { position: 'technician' } });
    const labTestTypes = await LabTestType.findAll({ where: { isActive: true } });
    let patient = null;
    
    if (patientId) {
      patient = await Patient.findByPk(patientId);
    } else {
      const patients = await Patient.findAll();
      res.render('lab/new', {
        pageTitle: 'New Lab Test',
        patients,
        doctors,
        technicians,
        labTestTypes
      });
      return;
    }
    
    res.render('lab/new-for-patient', {
      pageTitle: `New Lab Test for ${patient.firstName} ${patient.lastName}`,
      patient,
      doctors,
      technicians,
      labTestTypes
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading lab test form');
    res.redirect('/lab');
  }
};

// Create new lab test
exports.createLabTest = async (req, res) => {
  try {
    const { 
      testName, 
      testCode, 
      patientId, 
      doctorId, 
      technicianId, 
      scheduledDate, 
      price, 
      notes,
      testTypeId
    } = req.body;
    
    let doctorCommission = null;
    
    // If a test type was selected, get the commission from it
    if (testTypeId) {
      const labTestType = await LabTestType.findByPk(testTypeId);
      if (labTestType) {
        doctorCommission = labTestType.doctorCommission;
      }
    }
    
    const labTest = await LabTest.create({
      testName,
      testCode,
      patientId,
      doctorId,
      technicianId,
      testTypeId,
      doctorCommission,
      scheduledDate,
      price,
      status: scheduledDate ? 'scheduled' : 'requested',
      notes
    });
    
    req.flash('success_msg', 'Lab test created successfully');
    res.redirect(`/lab/${labTest.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating lab test: ' + error.message);
    res.redirect('/lab/new');
  }
};

// Get all lab tests
exports.getAllLabTests = async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    
    const labTests = await LabTest.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        },
        {
          model: Staff,
          attributes: ['id', 'firstName', 'lastName', 'position'],
          required: false
        }
      ],
      order: [['requestDate', 'DESC']]
    });
    
    res.render('lab/index', {
      pageTitle: 'Lab Tests',
      labTests,
      selectedStatus: status
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving lab tests');
    res.redirect('/dashboard');
  }
};

// Get lab test by ID
exports.getLabTestById = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        },
        {
          model: Staff,
          attributes: ['id', 'firstName', 'lastName', 'position'],
          required: false
        }
      ]
    });
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    res.render('lab/show', {
      pageTitle: `Lab Test: ${labTest.testName}`,
      labTest
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving lab test details');
    res.redirect('/lab');
  }
};

// Show edit lab test form
exports.showEditLabTestForm = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Staff,
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ]
    });
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    const technicians = await Staff.findAll({ where: { position: 'technician' } });
    
    res.render('lab/edit', {
      pageTitle: `Edit Lab Test: ${labTest.testName}`,
      labTest,
      technicians
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading lab test data');
    res.redirect('/lab');
  }
};

// Update lab test
exports.updateLabTest = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id);
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    // If results are being submitted, update status to completed
    if (req.body.results && labTest.status !== 'completed') {
      req.body.status = 'completed';
      req.body.completionDate = new Date();
    }
    
    await labTest.update(req.body);
    
    req.flash('success_msg', 'Lab test updated successfully');
    res.redirect(`/lab/${labTest.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating lab test: ' + error.message);
    res.redirect(`/lab/${req.params.id}/edit`);
  }
};

// Delete lab test
exports.deleteLabTest = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id);
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    await labTest.destroy();
    
    req.flash('success_msg', 'Lab test deleted successfully');
    res.redirect('/lab');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting lab test: ' + error.message);
    res.redirect('/lab');
  }
};

// Get patient's lab tests
exports.getPatientLabTests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findByPk(patientId);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    const labTests = await LabTest.findAll({
      where: { patientId },
      include: [
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        },
        {
          model: Staff,
          attributes: ['id', 'firstName', 'lastName', 'position'],
          required: false
        }
      ],
      order: [['requestDate', 'DESC']]
    });
    
    res.render('lab/patient-tests', {
      pageTitle: `Lab Tests: ${patient.firstName} ${patient.lastName}`,
      patient,
      labTests
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving patient lab tests');
    res.redirect(`/patients/${req.params.patientId}`);
  }
};

// Show assign technician form
exports.showAssignTechnicianForm = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    const technicians = await Staff.findAll({ 
      where: { position: 'technician', isActive: true } 
    });
    
    res.render('lab/assign', {
      pageTitle: `Assign Technician: ${labTest.testName}`,
      labTest,
      technicians
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading assignment form');
    res.redirect('/lab');
  }
};

// Assign technician to lab test
exports.assignTechnician = async (req, res) => {
  try {
    const labTest = await LabTest.findByPk(req.params.id);
    
    if (!labTest) {
      req.flash('error_msg', 'Lab test not found');
      return res.redirect('/lab');
    }
    
    const { technicianId, scheduledDate } = req.body;
    
    await labTest.update({
      technicianId,
      scheduledDate: scheduledDate || labTest.scheduledDate,
      status: 'scheduled'
    });
    
    req.flash('success_msg', 'Technician assigned successfully');
    res.redirect(`/lab/${labTest.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error assigning technician: ' + error.message);
    res.redirect(`/lab/${req.params.id}/assign`);
  }
};