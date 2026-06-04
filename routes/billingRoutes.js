const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const billingController = require('../controllers/billingController');
const medicalReportController = require('../controllers/medicalReportController');
const doctorController = require('../controllers/doctorController');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess, checkAnyFeatureAccess } = require('../middleware/featurePermission');

const billingPhotoDir = path.join(__dirname, '../public/uploads/billing_photos');
const medicalReportDir = path.join(__dirname, '../public/uploads/medical_reports');
if (!fs.existsSync(billingPhotoDir)) {
  fs.mkdirSync(billingPhotoDir, { recursive: true });
}
if (!fs.existsSync(medicalReportDir)) {
  fs.mkdirSync(medicalReportDir, { recursive: true });
}

const billingPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, billingPhotoDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const prefix = file.fieldname === 'passportPhoto' ? 'passport' : 'bill';
    cb(null, `${prefix}-${req.params.id}-${Date.now()}${ext}`);
  }
});

const billingPhotoFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    return cb(null, true);
  }
  cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
};

const uploadBillingPhoto = multer({
  storage: billingPhotoStorage,
  fileFilter: billingPhotoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const medicalReportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, medicalReportDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `xray-${req.params.id}-${Date.now()}${ext}`);
  }
});

const uploadMedicalReportXray = multer({
  storage: medicalReportStorage,
  fileFilter: billingPhotoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Apply feature permissions middleware to all billing routes
router.use(protect, getFeaturePermissions);

// Main billing page
router.get('/', checkFeatureAccess('Billing Management'), billingController.renderBillingPage);

// Today's invoice list
router.get('/invoices/today', checkFeatureAccess('Billing Management'), billingController.renderTodayInvoiceList);
router.get('/invoices/today/download', checkFeatureAccess('Billing Management'), billingController.downloadTodayInvoiceList);
router.post('/invoices/today/download-bundle', checkFeatureAccess('Billing Management'), billingController.downloadSelectedInvoiceBundle);
router.get('/passport-photo/:id/download', checkFeatureAccess('Billing Management'), billingController.downloadPassportPhoto);

// Create billing - no permission check needed as this is a core function
router.post('/', checkFeatureAccess('Billing Management'), billingController.createBilling);

// Patient photo capture (after billing is created)
router.get('/photo/:id', checkFeatureAccess('Billing Management'), billingController.renderBillingPhotoPage);
router.post('/photo/:id', checkFeatureAccess('Billing Management'), uploadBillingPhoto.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 }
]), billingController.uploadBillingPhoto);
router.post('/photo/:id/ai-portrait', checkFeatureAccess('Billing Management'), uploadBillingPhoto.single('photo'), billingController.generateAiPortrait);

// Get billing receipt - accessible to anyone who can access billing
router.get('/receipt/:id', checkFeatureAccess('Billing Management'), billingController.getBilling);

// Medical report per invoice
router.get('/medical-report/:id', checkFeatureAccess('Billing Management'), medicalReportController.renderMedicalReportForm);
router.post('/medical-report/:id', checkFeatureAccess('Billing Management'), uploadMedicalReportXray.single('xray_image'), medicalReportController.saveMedicalReport);
router.get('/medical-report/:id/print', checkFeatureAccess('Billing Management'), medicalReportController.renderMedicalReportPrint);

// Get billings by patient
router.get('/patient/:patientId', checkAnyFeatureAccess(['Billing Management', 'Patient Dashboard']), billingController.getBillingsByPatient);

// Get unbilled appointments - for Schedule Appointment feature
router.get('/patient/:patientId/unbilled-appointments', 
  checkFeatureAccess('Schedule Appointment'), 
  billingController.getUnbilledAppointments
);

// Update appointment billing status - for Schedule Appointment feature
router.put('/appointments/update-status', 
  checkFeatureAccess('Schedule Appointment'), 
  billingController.updateAppointmentBillingStatus
);

// Process payment
router.put('/:id/payment', checkFeatureAccess('Billing Management'), billingController.processPayment);

// Edit billing page route
router.get('/edit/:id', checkFeatureAccess('Billing Management'), billingController.editBillingPage);

// Update billing route
router.put('/:id', checkFeatureAccess('Billing Management'), billingController.updateBilling);

// Delete billing route
router.delete('/:id', checkFeatureAccess('Billing Management'), billingController.deleteBilling);

// Special routes for doctor and marketing manager creation from billing page
// These bypass the normal permission checks for these operations
router.post('/doctor', protect, doctorController.createDoctor);
router.post('/marketing-manager', protect, (req, res) => {
  // Ensure the role is set to marketing
  req.body.role = 'marketing';
  authController.register(req, res);
});

module.exports = router;