// staffController.js
const Staff = require('../models/Staff');
const User = require('../models/User');
const { sequelize } = require('../config/db');

// Show create staff form
exports.showCreateStaffForm = (req, res) => {
  res.render('staff/new', {
    pageTitle: 'Add New Staff Member'
  });
};

// Create a new staff member
exports.createStaff = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { 
      username, password, email, 
      firstName, lastName, position,
      contactNumber, address, joinDate 
    } = req.body;
    
    // Create user account first
    const user = await User.create({
      username,
      password,
      email,
      role: position
    }, { transaction: t });
    
    // Create staff profile
    const staff = await Staff.create({
      userId: user.id,
      firstName,
      lastName,
      position,
      contactNumber,
      email,
      address,
      joinDate: joinDate || new Date(),
      isActive: true
    }, { transaction: t });
    
    await t.commit();
    
    req.flash('success_msg', `${firstName} ${lastName} added as ${position} successfully`);
    res.redirect('/staff');
  } catch (error) {
    await t.rollback();
    console.error(error);
    req.flash('error_msg', 'Error adding staff member: ' + error.message);
    res.redirect('/staff/new');
  }
};

// Get all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.findAll({
      include: [
        {
          model: User,
          attributes: ['username', 'email', 'role', 'isActive']
        }
      ],
      order: [['position', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('staff/index', {
      pageTitle: 'Staff Directory',
      staff
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving staff list');
    res.redirect('/dashboard');
  }
};

// Get staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['username', 'email', 'role', 'isActive']
        }
      ]
    });
    
    if (!staff) {
      req.flash('error_msg', 'Staff member not found');
      return res.redirect('/staff');
    }
    
    res.render('staff/show', {
      pageTitle: `${staff.firstName} ${staff.lastName} - ${staff.position}`,
      staff
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving staff details');
    res.redirect('/staff');
  }
};

// Show edit staff form
exports.showEditStaffForm = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['username', 'email']
        }
      ]
    });
    
    if (!staff) {
      req.flash('error_msg', 'Staff member not found');
      return res.redirect('/staff');
    }
    
    res.render('staff/edit', {
      pageTitle: `Edit Staff: ${staff.firstName} ${staff.lastName}`,
      staff
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading staff data');
    res.redirect('/staff');
  }
};

// Update staff
exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    
    if (!staff) {
      req.flash('error_msg', 'Staff member not found');
      return res.redirect('/staff');
    }
    
    await staff.update(req.body);
    
    // If position changed, update user role too
    if (req.body.position && staff.userId) {
      const user = await User.findByPk(staff.userId);
      if (user) {
        await user.update({ role: req.body.position });
      }
    }
    
    req.flash('success_msg', 'Staff information updated successfully');
    res.redirect(`/staff/${staff.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating staff: ' + error.message);
    res.redirect(`/staff/${req.params.id}/edit`);
  }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const staff = await Staff.findByPk(req.params.id);
    
    if (!staff) {
      req.flash('error_msg', 'Staff member not found');
      return res.redirect('/staff');
    }
    
    // Delete staff profile
    await staff.destroy({ transaction: t });
    
    // Delete associated user account
    if (staff.userId) {
      await User.destroy({
        where: { id: staff.userId },
        transaction: t
      });
    }
    
    await t.commit();
    
    req.flash('success_msg', 'Staff member deleted successfully');
    res.redirect('/staff');
  } catch (error) {
    await t.rollback();
    console.error(error);
    req.flash('error_msg', 'Error deleting staff: ' + error.message);
    res.redirect('/staff');
  }
};

// Get staff by position
exports.getStaffByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    
    const staff = await Staff.findAll({
      where: { position },
      include: [
        {
          model: User,
          attributes: ['username', 'email', 'role', 'isActive']
        }
      ],
      order: [['lastName', 'ASC']]
    });
    
    res.render('staff/by-position', {
      pageTitle: `${position.charAt(0).toUpperCase() + position.slice(1)} Staff`,
      staff,
      position
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving staff by position');
    res.redirect('/staff');
  }
};