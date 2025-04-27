const express = require('express');
const staffController = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// staff Routes
router.get('/new', authorize('admin'), staffController.showCreateStaffForm);
router.get('/:id/edit', authorize('admin'), staffController.showEditStaffForm);

// Create new staff
router.post('/', authorize('admin'), staffController.createStaff);

// Get all staff
router.get('/', authorize('admin'), staffController.getAllStaff);

// Get staff by ID
router.get('/:id', authorize('admin'), staffController.getStaffById);

// Update staff
router.put('/:id', authorize('admin'), staffController.updateStaff);

// Delete staff
router.delete('/:id', authorize('admin'), staffController.deleteStaff);

// Get staff by position
router.get('/position/:position', authorize('admin'), staffController.getStaffByPosition);

module.exports = router;