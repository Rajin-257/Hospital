const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
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
    
    // Set user data for views
    res.locals.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error(error);
    res.clearCookie('token');
    res.redirect('/login');
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to access this resource'
      });
    }
    next();
  };
};