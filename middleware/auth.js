const jwt = require('jsonwebtoken');
const { getSequelize } = require('../config/db');
const { getTenantUser } = require('../utils/tenantModels');

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
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      
      // Use tenant-safe User model
      let user;
      try {
        const User = getTenantUser();
        user = await User.findByPk(decoded.id);
      } catch (dbError) {
        // If this is a table not found error, it means we're in the wrong database context
        if (dbError.message.includes("doesn't exist") || dbError.message.includes("Table")) {
          // This is likely a timing issue where auth middleware runs before SaaS middleware sets the context
          return res.status(500).render('error', {
            title: 'System Error',
            message: 'Database connection issue. Please try again.',
            redirectUrl: '/login'
          });
        }
        
        throw dbError; // Re-throw other database errors
      }
      
      if (!user) {
        return clearAuthAndRedirect(req, res);
      }
      
      if (!user.isActive) {
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
      
      next();
    } catch (error) {
      // Check if this is a database context issue
      if (error.message.includes("doesn't exist") || error.message.includes("Table")) {
        // Don't immediately clear auth for database context issues
        return res.status(500).render('error', {
          title: 'System Error', 
          message: 'Please refresh the page and try again.',
          redirectUrl: '/dashboard'
        });
      }
      
      // Invalid token
      return clearAuthAndRedirect(req, res);
    }
  } catch (error) {
    return clearAuthAndRedirect(req, res);
  }
};

// Helper function to clear auth data and redirect
const clearAuthAndRedirect = (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  res.clearCookie('token', cookieOptions);
  res.redirect('/login?timeout=true');
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