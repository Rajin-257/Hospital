const User = require('../models/User');
const { Op } = require('sequelize');

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    // Role filter
    if (role && role !== 'all') {
      whereConditions.role = role;
    }
    
    // Status filter
    if (status && status !== 'all') {
      whereConditions.isActive = status === 'active';
    }
    
    // Search filter
    if (search) {
      whereConditions[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows: users } = await User.findAndCountAll({
      where: whereConditions,
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    const totalPages = Math.ceil(count / limit);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        users,
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count
      });
    }
    
    res.render('users/user_list', { 
      title: 'Users',
      users,
      role: role || 'all',
      status: status || 'all',
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      totalRecords: count
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
    
    // Prevent non-softadmin users from viewing softadmin user details
    if (user.role === 'softadmin' && req.user.role !== 'softadmin') {
      return res.status(403).json({ message: 'Access denied' });
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
    
    // Prevent non-softadmin users from updating softadmin users
    if (user.role === 'softadmin' && req.user.role !== 'softadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Prevent users from promoting others to softadmin unless they are softadmin themselves
    if (role === 'softadmin' && req.user.role !== 'softadmin') {
      return res.status(403).json({ message: 'You cannot promote users to softadmin' });
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
    
    // Prevent non-softadmin users from toggling softadmin users
    if (user.role === 'softadmin' && req.user.role !== 'softadmin') {
      return res.status(403).json({ message: 'Access denied' });
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
    
    // Prevent non-softadmin users from deleting softadmin users
    if (user.role === 'softadmin' && req.user.role !== 'softadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await user.destroy();
    
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user profile (for logged in user)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.render('users/profile', {
      title: 'My Profile',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update user profile (for logged in user)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    let user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if username already exists
    if (username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }
    
    // Check if email already exists
    if (email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Update user details (only username and email can be updated by the user)
    user = await user.update({
      username,
      email
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Change password (for logged in user)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, password } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    await user.update({ password });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}; 