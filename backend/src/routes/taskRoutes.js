const express = require('express');
const {
  getTasks, getTask, createTask, updateTask, deleteTask, bulkUpdateStatus, getTaskAnalytics,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { taskValidators } = require('../validators');

const router = express.Router();

router.use(protect);

router.get('/', getTasks);
router.get('/analytics', getTaskAnalytics);
router.get('/:id', getTask);
router.post('/', taskValidators.create, createTask);
router.patch('/bulk-update', bulkUpdateStatus);
router.patch('/:id', taskValidators.update, updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
