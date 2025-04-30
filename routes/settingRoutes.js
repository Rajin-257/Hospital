const express = require('express');
const router = express.Router();
const { 
  getSettings, 
  updateSettings, 
  getFeaturePermissions, 
  updateFeaturePermission,
  batchUpdatePermissions
} = require('../controllers/settingController');
const { isAuth, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Get settings page - only admin can access
router.get('/', isAuth, isAdmin, getSettings);

// Update settings - only admin can update
router.post('/', isAuth, isAdmin, upload.single('favicon'), updateSettings);

// Feature permission endpoints
router.get('/permissions', isAuth, isAdmin, getFeaturePermissions);
router.get('/permissions/:moduleName', isAuth, isAdmin, getFeaturePermissions);
router.put('/permissions/:id', isAuth, isAdmin, updateFeaturePermission);
router.put('/permissions', isAuth, isAdmin, batchUpdatePermissions);

module.exports = router; 