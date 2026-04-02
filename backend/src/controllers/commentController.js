const { validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { successResponse, createdResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { getIO } = require('../sockets');

/**
 * @desc    Get all comments for a task
 * @route   GET /api/v1/comments?taskId=
 * @access  Protected + Team Member
 */
const getComments = asyncHandler(async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return errorResponse(res, 'taskId is required.', 400);

  const comments = await Comment.find({ task: taskId, isDeleted: false, parentComment: null })
    .populate('author', 'name email avatar initials')
    .populate({
      path: 'replies',
      populate: { path: 'author', select: 'name email avatar initials' },
    })
    .sort({ createdAt: 1 })
    .lean();

  return successResponse(res, comments);
});

/**
 * @desc    Add a comment to a task
 * @route   POST /api/v1/comments
 * @access  Protected + Team Member
 */
const addComment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

  const { content, taskId, parentCommentId, mentions } = req.body;

  const task = await Task.findById(taskId).select('team title');
  if (!task) return errorResponse(res, 'Task not found.', 404);

  const comment = await Comment.create({
    content,
    task: taskId,
    author: req.user._id,
    parentComment: parentCommentId || null,
    mentions: mentions || [],
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'name email avatar initials')
    .lean();

  await Activity.create({
    type: 'comment_added',
    actor: req.user._id,
    team: task.team,
    task: taskId,
    meta: { commentId: comment._id, taskTitle: task.title },
  });

  // Emit real-time event to team room
  getIO().to(`team:${task.team.toString()}`).emit('comment:added', {
    taskId,
    comment: populatedComment,
  });

  return createdResponse(res, populatedComment, 'Comment added successfully');
});

/**
 * @desc    Update a comment
 * @route   PATCH /api/v1/comments/:id
 * @access  Protected + Comment Author
 */
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return errorResponse(res, 'Content is required.', 400);

  const comment = await Comment.findById(req.params.id);
  if (!comment) return errorResponse(res, 'Comment not found.', 404);
  if (comment.author.toString() !== req.user._id.toString()) {
    return errorResponse(res, 'You can only edit your own comments.', 403);
  }

  comment.content = content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'name email avatar initials')
    .lean();

  const task = await Task.findById(comment.task).select('team');
  getIO().to(`team:${task.team.toString()}`).emit('comment:updated', {
    taskId: comment.task,
    comment: populatedComment,
  });

  return successResponse(res, populatedComment, 'Comment updated');
});

/**
 * @desc    Delete a comment (soft delete)
 * @route   DELETE /api/v1/comments/:id
 * @access  Protected + Comment Author or Team Admin
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return errorResponse(res, 'Comment not found.', 404);

  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isAdmin = req.teamRole && ['admin', 'owner'].includes(req.teamRole);

  if (!isAuthor && !isAdmin) {
    return errorResponse(res, 'You do not have permission to delete this comment.', 403);
  }

  comment.isDeleted = true;
  comment.content = '[Comment deleted]';
  await comment.save();

  const task = await Task.findById(comment.task).select('team');
  getIO().to(`team:${task.team.toString()}`).emit('comment:deleted', {
    taskId: comment.task,
    commentId: comment._id,
  });

  return successResponse(res, null, 'Comment deleted');
});

/**
 * @desc    Toggle reaction on a comment
 * @route   POST /api/v1/comments/:id/reactions
 * @access  Protected + Team Member
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return errorResponse(res, 'Emoji is required.', 400);

  const comment = await Comment.findById(req.params.id);
  if (!comment) return errorResponse(res, 'Comment not found.', 404);

  const existingIndex = comment.reactions.findIndex(
    (r) => r.emoji === emoji && r.user.toString() === req.user._id.toString()
  );

  if (existingIndex > -1) {
    comment.reactions.splice(existingIndex, 1);
  } else {
    comment.reactions.push({ emoji, user: req.user._id });
  }

  await comment.save();
  return successResponse(res, comment.reactions);
});

module.exports = { getComments, addComment, updateComment, deleteComment, toggleReaction };
