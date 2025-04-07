const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController.js');
const authMiddleware = require('../middleware/authMiddleware');
const roleAuthorization = require('../middleware/roleMiddleware');

// Public routes
router.post('/login', UserController.login);

// Admin-only routes
router.post('/register', authMiddleware, roleAuthorization(['admin']), UserController.register);
router.get('/all', authMiddleware, roleAuthorization(['admin']), UserController.getAllUsers);
router.get('/:id', authMiddleware, roleAuthorization(['admin']), UserController.getUserById);
router.put('/:id', authMiddleware, roleAuthorization(['admin']), UserController.updateUser);
router.delete('/:id', authMiddleware, roleAuthorization(['admin']), UserController.deleteUser);

// User profile routes - accessible to authenticated users for their own profile
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, UserController.updateProfile);

module.exports = router;