require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const ejs = require('ejs');
const { getFeaturePermissions } = require('./middleware/featurePermission');

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

// Load settings for all views
app.use(async (req, res, next) => {
  try {
    const settings = await Setting.findOne();
    if (settings) {
      res.locals.settings = settings;
    }
    next();
  } catch (error) {
    console.error('Error loading settings:', error);
    next();
  }
});

// Apply feature permissions middleware to all routes
app.use(getFeaturePermissions);

// Routes
app.use('/', authRoutes);
app.use('/patients', patientRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/cabins', cabinRoutes);
app.use('/tests', testRoutes);
app.use('/billing', billingRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingRoutes);

// Redirect root to billing
app.get('/', (req, res) => {
  res.redirect('/reports');
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