const jwt = require('jsonwebtoken');
const { getSequelize } = require('../config/db');
const { getTenantUser } = require('../utils/tenantModels');

// Helper function to check if token is close to expiry (within 10 minutes)
const isTokenNearExpiry = (decoded) => {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp - currentTime;
  return timeUntilExpiry < 600; // 10 minutes in seconds
};

// Helper function to generate new access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' }, 
    process.env.JWT_SECRET || 'secretkey', 
    { expiresIn: '1h' }
  );
};

// Helper function to refresh token automatically
const refreshTokenIfNeeded = async (req, res, decoded) => {
  try {
    // Check if token is near expiry
    if (isTokenNearExpiry(decoded)) {
      const { refreshToken } = req.cookies;
      
      if (refreshToken) {
        try {
          // Verify refresh token
          const refreshDecoded = jwt.verify(
            refreshToken, 
            process.env.JWT_REFRESH_SECRET || 'refreshsecretkey'
          );
          
          // Check if it's a valid refresh token type
          if (refreshDecoded.type === 'refresh' && refreshDecoded.id === decoded.id) {
            // Generate new access token
            const newAccessToken = generateAccessToken(decoded.id);
            
            // Set new access token cookie
            res.cookie('token', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
              maxAge: 1 * 60 * 60 * 1000 // 1 hour in milliseconds
            });
            
            console.log(`Token auto-refreshed for user ${decoded.id}`);
            return newAccessToken;
          }
        } catch (refreshError) {
          console.log('Refresh token invalid or expired:', refreshError.message);
          // Continue with the original token - let it expire naturally
        }
      }
    }
    
    return null; // No refresh needed or possible
  } catch (error) {
    console.log('Error during token refresh:', error.message);
    return null;
  }
};

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
      
      // Check if it's an access token
      if (decoded.type && decoded.type !== 'access') {
        return clearAuthAndRedirect(req, res);
      }
      
      // Attempt to refresh token if needed (but don't block if it fails)
      try {
        await refreshTokenIfNeeded(req, res, decoded);
      } catch (refreshError) {
        // Log but don't fail the request - let the current token continue to work
        console.log('Token refresh attempt failed:', refreshError.message);
      }
      
      // Use tenant-safe User model
      let user;
      try {
        const User = getTenantUser();
        user = await User.findByPk(decoded.id);
      } catch (dbError) {
        // If this is a table not found error, it means we're in the wrong database context
        if (dbError.message.includes("doesn't exist") || dbError.message.includes("Table")) {
          // This is likely a timing issue where auth middleware runs before SaaS middleware sets the context
          // Redirect to login instead of showing error to avoid loops
          return res.redirect('/login?error=database');
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
        return res.redirect('/login?error=database');
      }
      
      // Invalid token - try to use refresh token before clearing auth
      const { refreshToken } = req.cookies;
      if (refreshToken) {
        try {
          const refreshDecoded = jwt.verify(
            refreshToken, 
            process.env.JWT_REFRESH_SECRET || 'refreshsecretkey'
          );
          
          if (refreshDecoded.type === 'refresh') {
            // Redirect to refresh endpoint with proper error handling
            const redirectUrl = req.originalUrl === '/login' ? '/dashboard' : req.originalUrl;
            return res.redirect('/refresh-token?redirect=' + encodeURIComponent(redirectUrl));
          }
        } catch (refreshError) {
          // Both tokens invalid, clear auth
        }
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
  res.clearCookie('refreshToken', cookieOptions);
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