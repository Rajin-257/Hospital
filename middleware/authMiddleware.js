const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
exports.isAuth = async (req, res, next) => {
  try {
    let token;
    
    // Get token from cookie
    if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check if token exists
    if (!token) {
      return res.redirect('/login');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    
    // Get user from token
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.redirect('/login');
    }
    
    // Check if user is active
    if (!user.isActive) {
      res.clearCookie('token');
      return res.redirect('/login');
    }
    
    // Set user in request
    req.user = user;
    
    next();
  } catch (error) {
    console.error(error);
    res.clearCookie('token');
    res.redirect('/login');
  }
};

// Admin authorization middleware
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'softadmin') {
    next();
  } else {
    return res.status(403).render('error', {
      title: 'Unauthorized',
      message: 'Only administrators can access this resource'
    });
  }
}; 