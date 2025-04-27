// cabinController.js
const Cabin = require('../models/Cabin');
const Patient = require('../models/Patient');

// Show create cabin form
exports.showCreateCabinForm = (req, res) => {
  res.render('cabins/new', {
    pageTitle: 'Add New Cabin'
  });
};

// Create new cabin
exports.createCabin = async (req, res) => {
  try {
    const { 
      cabinNumber, 
      cabinType, 
      floor, 
      pricePerDay, 
      notes 
    } = req.body;
    
    const cabin = await Cabin.create({
      cabinNumber,
      cabinType,
      floor,
      pricePerDay,
      status: 'available',
      notes
    });
    
    req.flash('success_msg', `Cabin ${cabinNumber} created successfully`);
    res.redirect('/cabins');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating cabin: ' + error.message);
    res.redirect('/cabins/new');
  }
};

// Get all cabins
exports.getAllCabins = async (req, res) => {
  try {
    const cabins = await Cabin.findAll({
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['floor', 'ASC'], ['cabinNumber', 'ASC']]
    });
    
    res.render('cabins/index', {
      pageTitle: 'Cabins',
      cabins
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving cabins');
    res.redirect('/dashboard');
  }
};

// Get cabin by ID
exports.getCabinById = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber'],
          required: false
        }
      ]
    });
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    res.render('cabins/show', {
      pageTitle: `Cabin: ${cabin.cabinNumber}`,
      cabin
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving cabin details');
    res.redirect('/cabins');
  }
};

// Show edit cabin form
exports.showEditCabinForm = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    res.render('cabins/edit', {
      pageTitle: `Edit Cabin: ${cabin.cabinNumber}`,
      cabin
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading cabin data');
    res.redirect('/cabins');
  }
};

// Update cabin
exports.updateCabin = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    await cabin.update(req.body);
    
    req.flash('success_msg', 'Cabin updated successfully');
    res.redirect(`/cabins/${cabin.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating cabin: ' + error.message);
    res.redirect(`/cabins/${req.params.id}/edit`);
  }
};

// Delete cabin
exports.deleteCabin = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    if (cabin.status === 'occupied') {
      req.flash('error_msg', 'Cannot delete an occupied cabin');
      return res.redirect(`/cabins/${cabin.id}`);
    }
    
    await cabin.destroy();
    
    req.flash('success_msg', 'Cabin deleted successfully');
    res.redirect('/cabins');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting cabin: ' + error.message);
    res.redirect('/cabins');
  }
};

// Show assign patient form
exports.showAssignPatientForm = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    if (cabin.status !== 'available') {
      req.flash('error_msg', 'Cabin is not available for assignment');
      return res.redirect(`/cabins/${cabin.id}`);
    }
    
    const patients = await Patient.findAll({
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('cabins/assign', {
      pageTitle: `Assign Patient to Cabin ${cabin.cabinNumber}`,
      cabin,
      patients
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading assignment form');
    res.redirect('/cabins');
  }
};

// Assign patient to cabin
exports.assignPatient = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    const { patientId, admissionDate } = req.body;
    
    if (cabin.status !== 'available' && cabin.patientId !== patientId) {
      req.flash('error_msg', 'Cabin is not available');
      return res.redirect(`/cabins/${cabin.id}`);
    }
    
    await cabin.update({
      patientId,
      admissionDate: admissionDate || new Date(),
      dischargeDate: null,
      status: 'occupied'
    });
    
    req.flash('success_msg', 'Patient assigned to cabin successfully');
    res.redirect(`/cabins/${cabin.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error assigning patient: ' + error.message);
    res.redirect(`/cabins/${req.params.id}/assign`);
  }
};

// Show discharge form
exports.showDischargeForm = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName'],
          required: false
        }
      ]
    });
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    if (cabin.status !== 'occupied') {
      req.flash('error_msg', 'This cabin has no patient to discharge');
      return res.redirect(`/cabins/${cabin.id}`);
    }
    
    res.render('cabins/discharge', {
      pageTitle: `Discharge Patient from Cabin ${cabin.cabinNumber}`,
      cabin
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading discharge form');
    res.redirect('/cabins');
  }
};

// Discharge patient from cabin
exports.dischargePatient = async (req, res) => {
  try {
    const cabin = await Cabin.findByPk(req.params.id);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect('/cabins');
    }
    
    if (cabin.status !== 'occupied') {
      req.flash('error_msg', 'Cabin is not occupied');
      return res.redirect(`/cabins/${cabin.id}`);
    }
    
    const { dischargeDate } = req.body;
    
    await cabin.update({
      dischargeDate: dischargeDate || new Date(),
      status: 'available',
      patientId: null
    });
    
    req.flash('success_msg', 'Patient discharged successfully');
    res.redirect(`/cabins/${cabin.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error discharging patient: ' + error.message);
    res.redirect(`/cabins/${req.params.id}/discharge`);
  }
};

// Get available cabins
exports.getAvailableCabins = async (req, res) => {
  try {
    const { cabinType } = req.query;
    
    let whereClause = { status: 'available' };
    
    if (cabinType) {
      whereClause.cabinType = cabinType;
    }
    
    const cabins = await Cabin.findAll({
      where: whereClause,
      order: [['floor', 'ASC'], ['cabinNumber', 'ASC']]
    });
    
    res.render('cabins/available', {
      pageTitle: 'Available Cabins',
      cabins,
      selectedType: cabinType
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving available cabins');
    res.redirect('/cabins');
  }
};

// Assign patient to cabin from patient details page
exports.assignPatientFromDetails = async (req, res) => {
  try {
    const { patientId, cabinId, admissionDate, notes } = req.body;
    
    // Find the cabin
    const cabin = await Cabin.findByPk(cabinId);
    
    if (!cabin) {
      req.flash('error_msg', 'Cabin not found');
      return res.redirect(`/patients/${patientId}`);
    }
    
    if (cabin.status !== 'available') {
      req.flash('error_msg', 'Selected cabin is not available');
      return res.redirect(`/patients/${patientId}`);
    }
    
    // Update cabin with patient info
    await cabin.update({
      patientId,
      admissionDate,
      notes: notes || cabin.notes,
      status: 'occupied',
      dischargeDate: null
    });
    
    req.flash('success_msg', `Patient successfully assigned to cabin ${cabin.cabinNumber}`);
    res.redirect(`/patients/${patientId}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error assigning cabin to patient: ' + error.message);
    res.redirect(`/patients/${req.body.patientId}`);
  }
};