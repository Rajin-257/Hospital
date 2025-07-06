const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Apply feature permissions middleware
router.use(protect, getFeaturePermissions);

// Set up multer storage for favicon uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/favicons');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'favicon-' + uniqueSuffix + ext);
  }
});

// File filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.ico', '.png', '.jpg', '.jpeg', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .ico, .png, .jpg, .jpeg, and .svg files are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 } // 1MB file size limit
});

// Get settings page - admin/softadmin can access with General Settings permission
router.get('/', checkFeatureAccess('General Settings'), settingController.getSettings);

// Update settings - admin/softadmin can update with General Settings permission
router.post('/', checkFeatureAccess('General Settings'), upload.single('favicon'), settingController.updateSettings);

// Feature permission endpoints - only softadmin can access
router.get('/permissions', checkFeatureAccess('Permission Management'), settingController.getFeaturePermissions);
router.get('/permissions/:moduleName', checkFeatureAccess('Permission Management'), settingController.getFeaturePermissions);
router.put('/permissions/:id', checkFeatureAccess('Permission Management'), settingController.updateFeaturePermission);
router.put('/permissions', checkFeatureAccess('Permission Management'), settingController.batchUpdatePermissions);

// Import test data endpoint - restricted to admin/softadmin with General Settings permission
router.post('/import-test-data', checkFeatureAccess('General Settings'), settingController.importTestData);

// Import feature permissions - only softadmin can access
router.post('/import-feature-permissions', checkFeatureAccess('Permission Management'), settingController.importFeaturePermissions);

// Print Template routes - admin/softadmin can access with General Settings permission
router.get('/print-templates', checkFeatureAccess('General Settings'), settingController.getPrintTemplates);
router.get('/print-templates/:id', checkFeatureAccess('General Settings'), settingController.getPrintTemplate);
router.post('/print-templates', checkFeatureAccess('General Settings'), settingController.createPrintTemplate);
router.put('/print-templates/:id', checkFeatureAccess('General Settings'), settingController.updatePrintTemplate);
router.delete('/print-templates/:id', checkFeatureAccess('General Settings'), settingController.deletePrintTemplate);

module.exports = router;