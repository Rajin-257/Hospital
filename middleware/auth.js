const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    // Check if user session exists
    if (req.session && req.session.user) {
      // Session exists, get user from database to verify
      const user = await User.findByPk(req.session.user.id);
      
      if (!user || !user.isActive) {
        // Clear invalid session
        return clearAuthAndRedirect(req, res);
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
      
      // Session is valid, proceed
      return next();
    }
    
    // No session, check token as fallback
    let token;
    
    // Get token from cookie
    if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check if token exists
    if (!token) {
      return res.redirect('/login');
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      
      // Get user from token
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return clearAuthAndRedirect(req, res);
      }
      
      // Create session for token-based auth
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      
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
      // Invalid token
      return clearAuthAndRedirect(req, res);
    }
  } catch (error) {
    console.error(error);
    return clearAuthAndRedirect(req, res);
  }
};

// Helper function to clear auth data and redirect
const clearAuthAndRedirect = (req, res) => {
  res.clearCookie('token');
  
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      // Redirect with timeout parameter if it was a session timeout
      res.redirect('/login?timeout=true');
    });
  } else {
    res.redirect('/login?timeout=true');
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