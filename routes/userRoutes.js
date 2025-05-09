const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { getFeaturePermissions, checkFeatureAccess } = require('../middleware/featurePermission');

// Apply feature permissions middleware
router.use(protect, getFeaturePermissions);

// Profile routes - accessible to any logged in user
router.get('/profile', userController.getProfile);
router.put('/profile/update', userController.updateProfile);
router.post('/profile/change-password', userController.changePassword);

// Admin routes - only accessible to admin users with User Management permission
router.get('/users', checkFeatureAccess('User Management'), userController.getAllUsers);
router.get('/users/:id', checkFeatureAccess('User Management'), userController.getUser);
router.put('/users/:id', checkFeatureAccess('User Management'), userController.updateUser);
router.delete('/users/:id', checkFeatureAccess('User Management'), userController.deleteUser);
router.patch('/users/:id/toggle-status', checkFeatureAccess('User Management'), userController.toggleUserStatus);

module.exports = router;