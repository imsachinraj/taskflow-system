const Activity = require('../models/Activity');
const { paginatedResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * @desc    Get activity feed for a team
 * @route   GET /api/v1/activities?teamId=&taskId=&page=&limit=
 * @access  Protected + Team Member
 */
const getActivities = asyncHandler(async (req, res) => {
  const { teamId, taskId, page = 1, limit = 30 } = req.query;
  if (!teamId) return errorResponse(res, 'teamId is required.', 400);

  const query = { team: teamId };
  if (taskId) query.task = taskId;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .populate('actor', 'name email avatar initials')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Activity.countDocuments(query),
  ]);

  return paginatedResponse(res, activities, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

module.exports = { getActivities };
