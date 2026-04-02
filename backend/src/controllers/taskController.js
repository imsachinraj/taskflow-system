const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { successResponse, createdResponse, paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { getIO } = require('../sockets');

/**
 * @desc    Get all tasks for a team (with filtering, sorting, pagination)
 * @route   GET /api/v1/tasks?teamId=&status=&priority=&assignee=&page=&limit=
 * @access  Protected + Team Member
 */
const getTasks = asyncHandler(async (req, res) => {
  const {
    teamId,
    status,
    priority,
    assignee,
    tags,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isArchived = false,
  } = req.query;

  if (!teamId) return errorResponse(res, 'teamId is required.', 400);

  const query = { team: teamId, isArchived: isArchived === 'true' };

  if (status) query.status = { $in: status.split(',') };
  if (priority) query.priority = { $in: priority.split(',') };
  if (assignee) query.assignees = { $in: assignee.split(',') };
  if (tags) query.tags = { $in: tags.split(',') };
  if (search) query.$text = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignees', 'name email avatar initials')
      .populate('createdBy', 'name email avatar initials')
      .lean({ virtuals: true }),
    Task.countDocuments(query),
  ]);

  return paginatedResponse(res, tasks, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    hasNextPage: skip + tasks.length < total,
  });
});

/**
 * @desc    Get single task by ID
 * @route   GET /api/v1/tasks/:id
 * @access  Protected + Team Member
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignees', 'name email avatar initials')
    .populate('createdBy', 'name email avatar initials')
    .populate('statusHistory.changedBy', 'name avatar')
    .lean({ virtuals: true });

  if (!task) return errorResponse(res, 'Task not found.', 404);
  return successResponse(res, task);
});

/**
 * @desc    Create a new task
 * @route   POST /api/v1/tasks
 * @access  Protected + Team Member
 */
const createTask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

  const { title, description, status, priority, teamId, assignees, dueDate, tags, storyPoints } = req.body;

  // Get max order for new task in this status column
  const maxOrderTask = await Task.findOne({ team: teamId, status: status || 'todo' })
    .sort({ order: -1 })
    .select('order');

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    team: teamId,
    createdBy: req.user._id,
    assignees: assignees || [],
    dueDate,
    tags,
    storyPoints,
    order: maxOrderTask ? maxOrderTask.order + 1 : 0,
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email avatar initials')
    .populate('createdBy', 'name email avatar initials')
    .lean({ virtuals: true });

  // Log activity
  await Activity.create({
    type: 'task_created',
    actor: req.user._id,
    team: teamId,
    task: task._id,
    meta: { taskTitle: title },
  });

  // Emit real-time event
  getIO().to(`team:${teamId}`).emit('task:created', populatedTask);

  return createdResponse(res, populatedTask, 'Task created successfully');
});

/**
 * @desc    Update a task
 * @route   PATCH /api/v1/tasks/:id
 * @access  Protected + Team Member
 */
const updateTask = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

  const task = await Task.findById(req.params.id);
  if (!task) return errorResponse(res, 'Task not found.', 404);

  const allowedUpdates = ['title', 'description', 'priority', 'assignees', 'dueDate', 'tags', 'storyPoints', 'subtasks'];
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Handle status change separately for history tracking
  if (req.body.status && req.body.status !== task.status) {
    const previousStatus = task.status;
    updates.status = req.body.status;
    updates.$push = {
      statusHistory: {
        from: previousStatus,
        to: req.body.status,
        changedBy: req.user._id,
      },
    };

    await Activity.create({
      type: 'task_status_changed',
      actor: req.user._id,
      team: task.team,
      task: task._id,
      meta: { from: previousStatus, to: req.body.status, taskTitle: task.title },
    });
  }

  // Handle priority change activity
  if (req.body.priority && req.body.priority !== task.priority) {
    await Activity.create({
      type: 'priority_changed',
      actor: req.user._id,
      team: task.team,
      task: task._id,
      meta: { from: task.priority, to: req.body.priority, taskTitle: task.title },
    });
  }

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
    .populate('assignees', 'name email avatar initials')
    .populate('createdBy', 'name email avatar initials')
    .lean({ virtuals: true });

  // Emit real-time update
  getIO().to(`team:${task.team.toString()}`).emit('task:updated', updatedTask);

  return successResponse(res, updatedTask, 'Task updated successfully');
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Protected + Team Admin
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return errorResponse(res, 'Task not found.', 404);

  const teamId = task.team.toString();
  await task.deleteOne();

  await Activity.create({
    type: 'task_deleted',
    actor: req.user._id,
    team: teamId,
    meta: { taskTitle: task.title },
  });

  getIO().to(`team:${teamId}`).emit('task:deleted', { taskId: req.params.id });

  return successResponse(res, null, 'Task deleted successfully');
});

/**
 * @desc    Bulk update task statuses (for drag-and-drop Kanban)
 * @route   PATCH /api/v1/tasks/bulk-update
 * @access  Protected + Team Member
 */
const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { tasks } = req.body; // [{ id, status, order }]

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return errorResponse(res, 'Tasks array is required.', 400);
  }

  const bulkOps = tasks.map(({ id, status, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { status, order } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  // Get teamId from first task to broadcast
  const firstTask = await Task.findById(tasks[0].id).select('team');
  if (firstTask) {
    getIO().to(`team:${firstTask.team.toString()}`).emit('tasks:bulk_updated', tasks);
  }

  return successResponse(res, null, 'Tasks updated successfully');
});

/**
 * @desc    Get task analytics for a team
 * @route   GET /api/v1/tasks/analytics?teamId=
 * @access  Protected + Team Member
 */
const getTaskAnalytics = asyncHandler(async (req, res) => {
  const { teamId } = req.query;
  if (!teamId) return errorResponse(res, 'teamId is required.', 400);

  const [statusBreakdown, priorityBreakdown, completionTrend, overdueTasks] = await Promise.all([
    Task.aggregate([
      { $match: { team: require('mongoose').Types.ObjectId.createFromHexString(teamId), isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { team: require('mongoose').Types.ObjectId.createFromHexString(teamId), isArchived: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      {
        $match: {
          team: require('mongoose').Types.ObjectId.createFromHexString(teamId),
          completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.countDocuments({
      team: teamId,
      dueDate: { $lt: new Date() },
      status: { $nin: ['done', 'cancelled'] },
    }),
  ]);

  return successResponse(res, {
    statusBreakdown,
    priorityBreakdown,
    completionTrend,
    overdueTasks,
  });
});

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, bulkUpdateStatus, getTaskAnalytics };
