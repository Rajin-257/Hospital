const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'receptionist'
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey', {
      expiresIn: '1h'
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey', {
      expiresIn: '30m' // Changed to 30 minutes
    });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 60 * 1000 // 30 minutes in milliseconds
    });

    // Store user data in session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    // Set session expiry
    req.session.cookie.maxAge = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Render dashboard or redirect
    res.redirect('/');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  // Clear the cookie
  res.clearCookie('token');
  
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};