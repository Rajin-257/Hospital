const User = require('../models/User');
const { Op } = require('sequelize');

// Get all users (staff list)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, roleFilter, statusFilter } = req.query;
    
    // Define where conditions for search and filters
    const whereConditions = {};
    
    // Apply role filter if provided and not 'all'
    if (roleFilter && roleFilter !== 'all') {
      whereConditions.role = roleFilter;
    }
    
    // Apply status filter if provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      whereConditions.isActive = statusFilter === 'active';
    }
    
    // Apply search filter if provided
    if (search) {
      whereConditions[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const users = await User.findAll({
      where: whereConditions,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(users);
    }
    
    res.render('users/user_list', {
      title: 'Staff List',
      users,
      search: search || '',
      roleFilter: roleFilter || 'all',
      statusFilter: statusFilter || 'all'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(user);
    }
    
    res.render('users/user_detail', {
      title: 'Staff Details',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;
    
    let user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user details
    const updateData = {
      username,
      email,
      role,
      isActive: isActive === 'true' || isActive === true
    };
    
    // Only update password if provided
    if (req.body.password && req.body.password.trim() !== '') {
      updateData.password = req.body.password;
    }
    
    user = await user.update(updateData);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });
    }
    
    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.update({ isActive: !user.isActive });
    
    res.json({
      success: true,
      isActive: user.isActive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    await user.destroy();
    
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}; 