const express = require('express');
const { getActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', getActivities);

module.exports = router;
