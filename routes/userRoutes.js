const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Profile routes - accessible to any logged in user
router.get('/profile', protect, userController.getProfile);
router.put('/profile/update', protect, userController.updateProfile);
router.post('/profile/change-password', protect, userController.changePassword);

// Admin routes - only accessible to admin users
router.use('/users', protect, authorize('admin'));
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.patch('/users/:id/toggle-status', userController.toggleUserStatus);

module.exports = router; 