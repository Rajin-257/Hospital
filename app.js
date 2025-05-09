require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { connectDB, sequelize } = require('./config/db');
const ejs = require('ejs');
const { protect } = require('./middleware/auth');
const { getFeaturePermissions } = require('./middleware/featurePermission');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

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

// Configure session with Sequelize store
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  expiration: 30 * 60 * 1000, // 30 minutes in milliseconds
  checkExpirationInterval: 15 * 60 * 1000 // Check every 15 minutes
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'session_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes in milliseconds
  }
}));

// Initialize the session store
sessionStore.sync();

// Middleware to extend session on activity
app.use((req, res, next) => {
  // Skip for login page and public assets
  if (req.path === '/login' || req.path.startsWith('/public')) {
    return next();
  }
  
  // If there's a session and the user is logged in, extend the session
  if (req.session && req.session.user) {
    req.session.cookie.maxAge = 30 * 60 * 1000; // Reset to 30 minutes
  }
  
  next();
});

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