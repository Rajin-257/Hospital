// authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Show Login Form
exports.showLoginForm = (req, res) => {
  res.render('auth/login', {
    pageTitle: 'Login',
    layout: 'layouts/main'
  });
};

// Show Register Form
exports.showRegisterForm = (req, res) => {
  res.render('auth/register', {
    pageTitle: 'Register',
    layout: 'layouts/main'
  });
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error_msg', 'User already exists');
      return res.redirect('/register');
    }
    
    // Create new user
    const user = await User.create({
      username,
      password,
      email,
      role
    });
    
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error during registration: ' + error.message);
    res.redirect('/register');
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    // Store user in session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error during login: ' + error.message);
    res.redirect('/login');
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.redirect('/login');
  });
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/dashboard');
    }
    
    res.render('auth/profile', {
      pageTitle: 'My Profile',
      user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving profile');
    res.redirect('/dashboard');
  }
};