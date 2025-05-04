const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes - only accessible to logged in users with admin role
router.use(protect);
router.use(authorize('admin'));

// User list and detail routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/toggle-status', userController.toggleUserStatus);

module.exports = router; 