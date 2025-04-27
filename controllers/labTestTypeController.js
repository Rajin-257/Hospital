const LabTestType = require('../models/LabTestType');

// Show all lab test types
exports.getAllLabTestTypes = async (req, res) => {
  try {
    const labTestTypes = await LabTestType.findAll({
      order: [['name', 'ASC']]
    });
    
    res.render('lab-test-types/index', {
      pageTitle: 'Lab Test Types',
      labTestTypes
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving lab test types');
    res.redirect('/dashboard');
  }
};

// Show create lab test type form
exports.showCreateLabTestTypeForm = (req, res) => {
  res.render('lab-test-types/new', {
    pageTitle: 'Create New Lab Test Type'
  });
};

// Create new lab test type
exports.createLabTestType = async (req, res) => {
  try {
    const { name, code, price, doctorCommission, description } = req.body;
    
    await LabTestType.create({
      name,
      code,
      price,
      doctorCommission,
      description,
      isActive: true
    });
    
    req.flash('success_msg', `Lab test type "${name}" created successfully`);
    res.redirect('/lab-test-types');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating lab test type: ' + error.message);
    res.redirect('/lab-test-types/new');
  }
};

// Show edit lab test type form
exports.showEditLabTestTypeForm = async (req, res) => {
  try {
    const labTestType = await LabTestType.findByPk(req.params.id);
    
    if (!labTestType) {
      req.flash('error_msg', 'Lab test type not found');
      return res.redirect('/lab-test-types');
    }
    
    res.render('lab-test-types/edit', {
      pageTitle: `Edit Lab Test Type: ${labTestType.name}`,
      labTestType
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading lab test type data');
    res.redirect('/lab-test-types');
  }
};

// Update lab test type
exports.updateLabTestType = async (req, res) => {
  try {
    const labTestType = await LabTestType.findByPk(req.params.id);
    
    if (!labTestType) {
      req.flash('error_msg', 'Lab test type not found');
      return res.redirect('/lab-test-types');
    }
    
    const { name, code, price, doctorCommission, description, isActive } = req.body;
    
    await labTestType.update({
      name,
      code,
      price,
      doctorCommission,
      description,
      isActive: isActive === 'on' || isActive === true
    });
    
    req.flash('success_msg', 'Lab test type updated successfully');
    res.redirect('/lab-test-types');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating lab test type: ' + error.message);
    res.redirect(`/lab-test-types/${req.params.id}/edit`);
  }
};

// Delete lab test type
exports.deleteLabTestType = async (req, res) => {
  try {
    const labTestType = await LabTestType.findByPk(req.params.id);
    
    if (!labTestType) {
      req.flash('error_msg', 'Lab test type not found');
      return res.redirect('/lab-test-types');
    }
    
    await labTestType.destroy();
    
    req.flash('success_msg', 'Lab test type deleted successfully');
    res.redirect('/lab-test-types');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting lab test type: ' + error.message);
    res.redirect('/lab-test-types');
  }
}; 