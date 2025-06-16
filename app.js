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

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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

// Apply SaaS domain validation middleware first
app.use(validateDomainAndConnect);

// Load tenant-specific settings after domain validation
app.use(loadTenantSettings);

// Apply auth and feature permissions middleware to relevant routes
// The root level only applies to authenticated routes, individual routes handle auth separately
app.use((req, res, next) => {
  // Skip auth for login page and public assets
  if (req.path === '/login' || req.path.startsWith('/public')) {
    return next();
  }
  // For other routes, apply auth and permissions middleware
  protect(req, res, (err) => {
    if (err) return next(err);
    getFeaturePermissions(req, res, next);
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

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you are looking for does not exist'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;