const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.protect = async (req, res, next) => {
  try {
    // Check if user is logged in via session
    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    // If not logged in, redirect to login page
    req.flash('error_msg', 'Please log in to access this resource');
    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Authentication error');
    return res.redirect('/login');
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      req.flash('error_msg', 'Please log in to access this resource');
      return res.redirect('/login');
    }
    
    if (!roles.includes(req.user.role)) {
      req.flash('error_msg', `Unauthorized access: ${req.user.role} role cannot access this resource`);
      return res.redirect('/dashboard');
    }
    
    next();
  };
};