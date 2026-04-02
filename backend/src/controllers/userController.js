const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * @desc    Update current user's profile
 * @route   PATCH /api/v1/users/me
 * @access  Protected
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return successResponse(res, user.toPublicProfile(), 'Profile updated successfully');
});

/**
 * @desc    Change password
 * @route   PATCH /api/v1/users/me/password
 * @access  Protected
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current and new password are required.', 400);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return errorResponse(res, 'Current password is incorrect.', 401);
  }

  user.password = newPassword;
  await user.save();

  return successResponse(res, null, 'Password changed successfully');
});

/**
 * @desc    Search users by name or email (for assigning tasks)
 * @route   GET /api/v1/users/search?q=&teamId=
 * @access  Protected
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, teamId } = req.query;
  if (!q || q.length < 2) return errorResponse(res, 'Search query must be at least 2 characters.', 400);

  const query = {
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
  };

  // If teamId provided, only search within that team
  if (teamId) {
    const Team = require('../models/Team');
    const team = await Team.findById(teamId).select('members');
    if (team) {
      const memberIds = team.members.map((m) => m.user);
      query._id = { $in: memberIds };
    }
  }

  const users = await User.find(query).select('name email avatar initials').limit(10).lean({ virtuals: true });
  return successResponse(res, users);
});

module.exports = { updateProfile, changePassword, searchUsers };
