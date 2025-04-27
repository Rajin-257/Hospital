// medicalRecordController.js
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

// Get all medical records
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;
    
    let whereClause = {};
    
    if (patientId) {
      whereClause.patientId = patientId;
    }
    
    if (doctorId) {
      whereClause.doctorId = doctorId;
    }
    
    const medicalRecords = await MedicalRecord.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ],
      order: [['visitDate', 'DESC']]
    });
    
    res.render('medical-records/index', {
      pageTitle: 'Medical Records',
      medicalRecords,
      filters: {
        patientId,
        doctorId
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving medical records');
    res.redirect('/dashboard');
  }
};

// Get medical record by ID
exports.getMedicalRecordById = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        }
      ]
    });
    
    if (!medicalRecord) {
      req.flash('error_msg', 'Medical record not found');
      return res.redirect('/medical-records');
    }
    
    res.render('medical-records/show', {
      pageTitle: 'Medical Record Details',
      medicalRecord
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving medical record details');
    res.redirect('/medical-records');
  }
};

// Show create medical record form
exports.showCreateMedicalRecordForm = async (req, res) => {
  try {
    const { patientId } = req.query;
    let patient = null;
    const doctors = await Doctor.findAll({
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    if (patientId) {
      patient = await Patient.findByPk(patientId);
      
      if (!patient) {
        req.flash('error_msg', 'Patient not found');
        return res.redirect('/patients');
      }
      
      res.render('medical-records/new', {
        pageTitle: `New Medical Record: ${patient.firstName} ${patient.lastName}`,
        patient,
        doctors
      });
    } else {
      const patients = await Patient.findAll({
        order: [['firstName', 'ASC'], ['lastName', 'ASC']]
      });
      
      res.render('medical-records/select-patient', {
        pageTitle: 'Create Medical Record - Select Patient',
        patients
      });
    }
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading medical record form');
    res.redirect('/medical-records');
  }
};

// Create medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const { patientId, doctorId, diagnosis, prescription, notes, followUpDate } = req.body;
    
    const medicalRecord = await MedicalRecord.create({
      patientId,
      doctorId,
      visitDate: new Date(),
      diagnosis,
      prescription,
      notes,
      followUpDate
    });
    
    req.flash('success_msg', 'Medical record created successfully');
    res.redirect(`/medical-records/${medicalRecord.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating medical record: ' + error.message);
    res.redirect(`/medical-records/new?patientId=${req.body.patientId || ''}`);
  }
};

// Show edit medical record form
exports.showEditMedicalRecordForm = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        },
        {
          model: Doctor,
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!medicalRecord) {
      req.flash('error_msg', 'Medical record not found');
      return res.redirect('/medical-records');
    }
    
    const doctors = await Doctor.findAll({
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('medical-records/edit', {
      pageTitle: 'Edit Medical Record',
      medicalRecord,
      doctors
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading medical record data');
    res.redirect('/medical-records');
  }
};

// Update medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id);
    
    if (!medicalRecord) {
      req.flash('error_msg', 'Medical record not found');
      return res.redirect('/medical-records');
    }
    
    const { doctorId, diagnosis, prescription, notes, followUpDate } = req.body;
    
    await medicalRecord.update({
      doctorId,
      diagnosis,
      prescription,
      notes,
      followUpDate
    });
    
    req.flash('success_msg', 'Medical record updated successfully');
    res.redirect(`/medical-records/${medicalRecord.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating medical record: ' + error.message);
    res.redirect(`/medical-records/${req.params.id}/edit`);
  }
};

// Delete medical record
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id);
    
    if (!medicalRecord) {
      req.flash('error_msg', 'Medical record not found');
      return res.redirect('/medical-records');
    }
    
    const patientId = medicalRecord.patientId;
    
    await medicalRecord.destroy();
    
    req.flash('success_msg', 'Medical record deleted successfully');
    
    // If we have the patient ID, redirect to their medical records
    if (patientId) {
      return res.redirect(`/patients/${patientId}/medical-records`);
    }
    
    res.redirect('/medical-records');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting medical record: ' + error.message);
    res.redirect('/medical-records');
  }
};