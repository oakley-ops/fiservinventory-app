const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController.js');
const authMiddleware = require('../middleware/authMiddleware');

// User routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, UserController.updateProfile);

module.exports = router;