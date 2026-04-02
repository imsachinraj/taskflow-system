const express = require('express');
const { getComments, addComment, updateComment, deleteComment, toggleReaction } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { commentValidators } = require('../validators');

const router = express.Router();
router.use(protect);

router.get('/', getComments);
router.post('/', commentValidators.create, addComment);
router.patch('/:id', updateComment);
router.delete('/:id', deleteComment);
router.post('/:id/reactions', toggleReaction);

module.exports = router;
