const express = require('express');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const { connectDB } = require('./config/db');
const methodOverride = require('method-override');
const { protect } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const staffRoutes = require('./routes/staffRoutes');
const billingRoutes = require('./routes/billingRoutes');
const cabinRoutes = require('./routes/cabinRoutes');
const labRoutes = require('./routes/labRoutes');
const labTestTypeRoutes = require('./routes/labTestTypeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const apiRoutes = require('./routes/api');
const dashboardController = require('./controllers/dashboardController');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Express session
app.use(session({
  secret: 'hospital_management_secret',
  resave: true,
  saveUninitialized: true
}));

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Dashboard route
app.get('/dashboard', protect, dashboardController.getDashboardData);

// Home route
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Routes
app.use('/', authRoutes);
app.use('/patients', patientRoutes);
app.use('/doctors', doctorRoutes);
app.use('/staff', staffRoutes);
app.use('/billing', billingRoutes);
app.use('/cabins', cabinRoutes);
app.use('/lab', labRoutes);
app.use('/lab-test-types', labTestTypeRoutes);
app.use('/reports', reportRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/medical-records', medicalRecordRoutes);
app.use('/api', apiRoutes);

// Error handling - 404
app.use((req, res) => {
  res.status(404).render('error', { 
    pageTitle: 'Page Not Found',
    statusCode: 404,
    message: 'The page you are looking for does not exist'
  });
});

// Error handling - 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    pageTitle: 'Server Error',
    statusCode: 500,
    message: 'Something went wrong on our end'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});