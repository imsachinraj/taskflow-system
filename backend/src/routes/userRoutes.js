const express = require('express');
const { updateProfile, changePassword, searchUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/search', searchUsers);
router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);

module.exports = router;
