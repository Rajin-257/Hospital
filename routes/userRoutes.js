const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

const bgStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/ai_portrait_bg'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `user-${req.user.id}-bg${ext}`);
  }
});
const uploadBg = multer({
  storage: bgStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
  }
});

// Apply feature permissions middleware
router.use(protect, getFeaturePermissions);

// Profile routes - accessible to any logged in user
router.get('/profile', userController.getProfile);
router.put('/profile/update', userController.updateProfile);
router.post('/profile/change-password', userController.changePassword);

// Laboratorist AI settings (one bg + prompt per user)
router.get('/profile/lab-settings', userController.getLabSettings);
router.post('/profile/lab-settings', uploadBg.single('hospitalBg'), userController.saveLabSettings);

// Admin routes - only accessible to admin users with User Management permission
router.get('/users', checkFeatureAccess('User Management'), userController.getAllUsers);
router.get('/users/:id', checkFeatureAccess('User Management'), userController.getUser);
router.put('/users/:id', checkFeatureAccess('User Management'), userController.updateUser);
router.delete('/users/:id', checkFeatureAccess('User Management'), userController.deleteUser);
router.patch('/users/:id/toggle-status', checkFeatureAccess('User Management'), userController.toggleUserStatus);

module.exports = router;