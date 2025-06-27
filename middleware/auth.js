const jwt = require('jsonwebtoken');
const { getSequelize } = require('../config/db');
const { getTenantUser } = require('../utils/tenantModels');



// Cookie options function
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
});



// Enhanced protect routes middleware with better error handling
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from cookie
    if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check if token exists
    if (!token) {
      console.log('🔒 No token found, redirecting to login from:', req.originalUrl);
      return res.redirect('/login');
    }
    
    try {
      // Verify token first (before any database operations)
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      
      // Check if we have tenant context
      if (!req.tenant || !req.tenant.sequelize) {
        console.log('❌ No tenant context available for auth check');
        return clearAuthAndRedirect(req, res, 'database');
      }
      
      // Use tenant-safe User model with enhanced error handling
      let user;
      try {
        const User = getTenantUser();
        
        // Verify that the database connection is alive
        const tenantDb = getSequelize();
        if (tenantDb.connectionManager && tenantDb.connectionManager.pool._closed) {
          console.log('❌ Database connection is closed');
          return clearAuthAndRedirect(req, res, 'connection');
        }
        
        // Test the connection before proceeding
        await tenantDb.authenticate();
        
        user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
        
      } catch (dbError) {
        console.error('❌ Database error during auth:', dbError.message);
        
        // Handle specific database error types
        if (dbError.message.includes("doesn't exist") || 
            dbError.message.includes("Table") ||
            dbError.message.includes("Unknown database") ||
            dbError.message.includes("Connection lost") ||
            dbError.message.includes("ConnectionManager.getConnection was called after the connection manager was closed") ||
            dbError.message.includes("ER_BAD_DB_ERROR") ||
            dbError.name === 'SequelizeConnectionError' ||
            dbError.name === 'SequelizeConnectionRefusedError' ||
            dbError.name === 'SequelizeHostNotFoundError' ||
            dbError.name === 'SequelizeConnectionTimedOutError') {
          
          console.log('🗄️ Database context/connection issue, redirecting to login:', dbError.message);
          return clearAuthAndRedirect(req, res, 'database');
        }
        
        // For other database errors, still redirect but log differently
        console.error('🚨 Unexpected database error:', dbError);
        return clearAuthAndRedirect(req, res, 'error');
      }
      
      if (!user) {
        console.log('❌ User not found for token:', decoded.id);
        return clearAuthAndRedirect(req, res);
      }
      
      if (!user.isActive) {
        console.log('❌ User is not active:', user.id);
        return clearAuthAndRedirect(req, res);
      }
      
      // Set user in request
      req.user = user;
      
      // Set user data for views
      res.locals.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };
      
      console.log(`✅ Auth successful for ${user.username} (${user.id})`);
      
      next();
      
    } catch (tokenError) {
      console.log('❌ Token verification failed:', tokenError.message);
      
      // Handle JWT specific errors
      if (tokenError.name === 'JsonWebTokenError') {
        console.log('🔐 Invalid JWT token');
      } else if (tokenError.name === 'TokenExpiredError') {
        console.log('⏰ JWT token expired');
      } else if (tokenError.name === 'NotBeforeError') {
        console.log('⏰ JWT token not active yet');
      }
      
      // Check if this is a database context issue even in token verification
      if (tokenError.message.includes("doesn't exist") || 
          tokenError.message.includes("Table") ||
          tokenError.message.includes("Unknown database") ||
          tokenError.message.includes("Connection lost") ||
          tokenError.message.includes("ConnectionManager.getConnection was called after the connection manager was closed")) {
        return clearAuthAndRedirect(req, res, 'database');
      }
      
      // Invalid or expired token
      return clearAuthAndRedirect(req, res);
    }
  } catch (error) {
    console.error('❌ Protect middleware error:', error);
    return clearAuthAndRedirect(req, res, 'error');
  }
};

// Enhanced helper function to clear auth data and redirect with error context
const clearAuthAndRedirect = (req, res, errorType = null) => {
  const cookieOptions = getCookieOptions();
  delete cookieOptions.maxAge; // Remove maxAge for clearing
  
  // Clear auth cookie
  res.clearCookie('token', cookieOptions);
  
  // Set security headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  console.log('🧹 Clearing auth cookie and redirecting from:', req.originalUrl);
  
  // Prevent redirect loops by checking if we're already going to login
  if (req.originalUrl === '/login' || req.path === '/login') {
    console.log('📍 Already at login, rendering login page directly');
    
    let errorMessage = null;
    if (errorType === 'database') {
      errorMessage = 'Database connection issue. Please try again.';
    } else if (errorType === 'connection') {
      errorMessage = 'Connection lost. Please login again.';
    } else if (errorType === 'error') {
      errorMessage = 'System error occurred. Please try again.';
    }
    
    return res.render('auth/login', { 
      title: 'Login',
      error: errorMessage
    });
  }
  
  // Handle AJAX requests differently
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    console.log('📡 AJAX request detected, sending JSON response');
    
    let message = 'Authentication required';
    if (errorType === 'database') {
      message = 'Database connection issue. Please refresh and try again.';
    } else if (errorType === 'connection') {
      message = 'Connection lost. Please login again.';
    } else if (errorType === 'error') {
      message = 'System error occurred. Please refresh and try again.';
    }
    
    return res.status(401).json({
      success: false,
      message: message,
      redirectUrl: '/login',
      errorType: errorType
    });
  }
  
  // Build redirect URL with error context
  let redirectUrl = '/login';
  if (errorType) {
    redirectUrl += `?error=${errorType}`;
  }
  
  console.log('🔀 Redirecting to login from:', req.originalUrl);
  res.redirect(redirectUrl);
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('❌ No user found in authorize middleware');
      return res.status(401).render('error', {
        title: 'Authentication Required',
        message: 'Please login to access this resource'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`❌ User ${req.user.username} with role ${req.user.role} not authorized for roles: ${roles.join(', ')}`);
      return res.status(403).render('error', {
        title: 'Unauthorized',
        message: 'You are not authorized to access this resource'
      });
    }
    
    console.log(`✅ User ${req.user.username} authorized for role: ${req.user.role}`);
    next();
  };
};