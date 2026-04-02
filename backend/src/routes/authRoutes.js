const express = require('express');
const { register, login, refreshToken, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authValidators } = require('../validators');

const router = express.Router();

router.post('/register', authValidators.register, register);
router.post('/login', authValidators.login, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
