require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { connectDB, sequelize, defaultSequelize } = require('./config/db');
const ejs = require('ejs');
const { protect } = require('./middleware/auth');
const { getFeaturePermissions } = require('./middleware/featurePermission');
const { validateDomainAndConnect } = require('./middleware/saasMiddleware');
const { loadTenantSettings } = require('./middleware/tenantSettingsMiddleware');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const cabinRoutes = require('./routes/cabinRoutes');
const testRoutes = require('./routes/testRoutes');
const billingRoutes = require('./routes/billingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingRoutes = require('./routes/settingRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const marketingCommissionRoutes = require('./routes/marketingCommissionRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import models
const Setting = require('./models/Setting');

// Initialize express app
const app = express();

// Connect to database and initialize data
(async () => {
  try {
    // Connect to database first
    await connectDB();
  } catch (error) {
    console.error('Error during startup:', error);
  }
})();

// Basic middleware (before any routing)
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static assets middleware (BEFORE SaaS middleware to avoid tenant context issues)
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Handle favicon specifically (BEFORE SaaS middleware)
app.get('/favicon.ico', (req, res) => {
  // Send a default favicon or 204 No Content
  res.status(204).end();
});

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Load settings for all views - SKIP for now, settings should be tenant-specific
app.use(async (req, res, next) => {
  try {
    // Skip settings loading for SaaS - each tenant should have their own settings
    // This will be handled after tenant database is set
    res.locals.settings = null; // Default to null, will be loaded later if needed
    next();
  } catch (error) {
    console.error('Error loading settings:', error);
    next();
  }
});

// Apply SaaS domain validation middleware for non-static routes
app.use(validateDomainAndConnect);

// Load tenant-specific settings after domain validation
app.use(loadTenantSettings);

// Enhanced auth middleware application
app.use((req, res, next) => {
  // Define paths that don't need authentication
  const publicPaths = [
    '/login', 
    '/register',
    '/health',
    '/favicon.ico',
    '/'  // Root will be handled separately
  ];
  
  // Define paths that don't need auth (static assets are already handled above)
  const staticPaths = ['/public', '/css', '/js', '/images'];
  
  // Check if current path is public or static
  if (publicPaths.includes(req.path) || 
      staticPaths.some(path => req.path.startsWith(path)) ||
      req.path.startsWith('/auth/')) {
    return next();
  }
  
  // For all other routes, ensure we have tenant context before running auth
  if (!req.tenant) {
    console.error('❌ No tenant context available for protected route:', req.path);
    
    // Handle AJAX requests
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: 'Database context not available. Please refresh the page.',
        redirectUrl: '/login'
      });
    }
    
    // Regular request
    return res.status(500).render('error', {
      title: 'System Error',
      message: 'Database context not available. Please try again.',
      redirectUrl: '/login'
    });
  }
  
  // Apply auth and permissions middleware
  protect(req, res, (authErr) => {
    if (authErr) {
      console.error('❌ Auth middleware error:', authErr);
      return next(authErr);
    }
    
    // Apply feature permissions
    getFeaturePermissions(req, res, (permErr) => {
      if (permErr) {
        console.error('❌ Feature permission middleware error:', permErr);
        return next(permErr);
      }
      next();
    });
  });
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/patients', patientRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/cabins', cabinRoutes);
app.use('/tests', testRoutes);
app.use('/billing', billingRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingRoutes);
app.use('/commissions', commissionRoutes);
app.use('/marketing-commissions', marketingCommissionRoutes);
app.use('/', userRoutes);

// Handle root route - check if user is authenticated
app.get('/', (req, res) => {
  // Prevent redirect loops by checking if we're already redirecting
  if (res.headersSent) {
    return;
  }

  // Check if user has a valid token
  const token = req.cookies.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      // If token is valid, redirect to dashboard
      if (decoded) {
        return res.redirect('/dashboard');
      } else {
        // Invalid token, clear and redirect to login
        clearCookiesAndRedirect(res, '/login');
        return;
      }
    } catch (error) {
      // Token is invalid, clear it and redirect to login
      console.log('Invalid token in root route:', error.message);
      clearCookiesAndRedirect(res, '/login');
      return;
    }
  }
  
  // No token or invalid token, redirect to login
  res.redirect('/login');
});

// Helper function to clear cookie consistently
function clearCookiesAndRedirect(res, redirectPath) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  };
  
  res.clearCookie('token', cookieOptions);
  res.redirect(redirectPath);
}

// Enhanced 404 handler
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you are looking for does not exist'
  });
});

// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Default error handling
  const status = err.status || 500;
  let message = 'Something went wrong';
  
  // Provide specific messages for common errors
  if (err.name === 'SequelizeConnectionError') {
    message = 'Database connection error. Please try again.';
  } else if (err.name === 'SequelizeConnectionRefusedError') {
    message = 'Database connection refused. Please contact support.';
  } else if (err.name === 'SequelizeTimeoutError') {
    message = 'Database timeout. Please try again.';
  } else if (process.env.NODE_ENV === 'development') {
    message = err.message;
  }
  
  // Handle AJAX requests
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return res.status(status).json({
      success: false,
      message: message,
      redirectUrl: status === 401 ? '/login' : null
    });
  }
  
  // Regular request
  res.status(status).render('error', {
    title: status === 404 ? 'Not Found' : 'Error',
    message: message,
    redirectUrl: status === 401 ? '/login' : null
  });
});

// Start server
const PORT = process.env.PORT || 3005;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`📪 Received ${signal}, starting graceful shutdown...`);
  
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    
    // Close database connections
    try {
      const { closeAllConnections } = require('./config/db');
      await closeAllConnections();
      
      const { closeSaasConnection } = require('./middleware/saasMiddleware');
      await closeSaasConnection();
      
      console.log('✅ All database connections closed');
    } catch (dbError) {
      console.error('❌ Error closing database connections:', dbError);
    }
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;