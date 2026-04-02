const { validationResult } = require('express-validator');
const Team = require('../models/Team');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { successResponse, createdResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { getIO } = require('../sockets');

/**
 * @desc    Get all teams for current user
 * @route   GET /api/v1/teams
 * @access  Protected
 */
const getMyTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ 'members.user': req.user._id, isActive: true })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar initials')
    .lean({ virtuals: true });

  return successResponse(res, teams);
});

/**
 * @desc    Create a new team
 * @route   POST /api/v1/teams
 * @access  Protected
 */
const createTeam = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

  const { name, description, isPublic } = req.body;

  const team = await Team.create({
    name,
    description,
    owner: req.user._id,
    settings: { isPublic: isPublic || false },
    members: [{ user: req.user._id, role: 'owner', joinedAt: new Date() }],
  });

  // Add team to user's teams array
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });

  const populatedTeam = await Team.findById(team._id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar initials')
    .lean({ virtuals: true });

  return createdResponse(res, populatedTeam, 'Team created successfully');
});

/**
 * @desc    Get single team by ID
 * @route   GET /api/v1/teams/:id
 * @access  Protected + Team Member
 */
const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('owner', 'name email avatar initials')
    .populate('members.user', 'name email avatar initials lastSeen')
    .lean({ virtuals: true });

  if (!team) return errorResponse(res, 'Team not found.', 404);
  return successResponse(res, team);
});

/**
 * @desc    Update team details
 * @route   PATCH /api/v1/teams/:id
 * @access  Protected + Team Admin
 */
const updateTeam = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

  const { name, description, settings } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (settings) updates.settings = { ...req.team.settings, ...settings };

  const team = await Team.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar initials')
    .lean({ virtuals: true });

  getIO().to(`team:${req.params.id}`).emit('team:updated', team);
  return successResponse(res, team, 'Team updated successfully');
});

/**
 * @desc    Join team via invite code
 * @route   POST /api/v1/teams/join
 * @access  Protected
 */
const joinTeam = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return errorResponse(res, 'Invite code is required.', 400);

  const team = await Team.findOne({
    inviteCode: inviteCode.toUpperCase(),
    inviteCodeExpires: { $gt: new Date() },
    isActive: true,
  });

  if (!team) return errorResponse(res, 'Invalid or expired invite code.', 404);

  if (team.isMember(req.user._id)) {
    return errorResponse(res, 'You are already a member of this team.', 409);
  }

  team.members.push({ user: req.user._id, role: 'member', joinedAt: new Date() });
  await team.save();

  await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });

  await Activity.create({
    type: 'member_joined',
    actor: req.user._id,
    team: team._id,
    meta: { userName: req.user.name },
  });

  const populatedTeam = await Team.findById(team._id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar initials')
    .lean({ virtuals: true });

  getIO().to(`team:${team._id.toString()}`).emit('team:member_joined', {
    team: populatedTeam,
    user: req.user.toPublicProfile(),
  });

  return successResponse(res, populatedTeam, `Successfully joined ${team.name}`);
});

/**
 * @desc    Update a member's role
 * @route   PATCH /api/v1/teams/:id/members/:userId/role
 * @access  Protected + Team Admin
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const { id: teamId, userId } = req.params;

  const validRoles = ['member', 'admin', 'viewer'];
  if (!validRoles.includes(role)) {
    return errorResponse(res, `Role must be one of: ${validRoles.join(', ')}`, 400);
  }

  const team = await Team.findById(teamId);
  if (!team) return errorResponse(res, 'Team not found.', 404);

  const memberIndex = team.members.findIndex((m) => m.user.toString() === userId);
  if (memberIndex === -1) return errorResponse(res, 'User is not a member of this team.', 404);

  // Cannot change owner's role
  if (team.members[memberIndex].role === 'owner') {
    return errorResponse(res, 'Cannot change the owner\'s role.', 403);
  }

  team.members[memberIndex].role = role;
  await team.save();

  await Activity.create({
    type: 'member_role_changed',
    actor: req.user._id,
    team: teamId,
    meta: { userId, newRole: role },
  });

  return successResponse(res, team, 'Member role updated successfully');
});

/**
 * @desc    Remove a member from team
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @access  Protected + Team Admin
 */
const removeMember = asyncHandler(async (req, res) => {
  const { id: teamId, userId } = req.params;
  const team = await Team.findById(teamId);
  if (!team) return errorResponse(res, 'Team not found.', 404);

  const member = team.members.find((m) => m.user.toString() === userId);
  if (!member) return errorResponse(res, 'User is not a member of this team.', 404);
  if (member.role === 'owner') return errorResponse(res, 'Cannot remove the team owner.', 403);

  team.members = team.members.filter((m) => m.user.toString() !== userId);
  await team.save();
  await User.findByIdAndUpdate(userId, { $pull: { teams: teamId } });

  getIO().to(`team:${teamId}`).emit('team:member_removed', { userId, teamId });

  return successResponse(res, null, 'Member removed from team');
});

/**
 * @desc    Regenerate team invite code
 * @route   POST /api/v1/teams/:id/invite-code
 * @access  Protected + Team Admin
 */
const regenerateInviteCode = asyncHandler(async (req, res) => {
  const { v4: uuidv4 } = require('uuid');
  const newCode = uuidv4().split('-')[0].toUpperCase();

  const team = await Team.findByIdAndUpdate(
    req.params.id,
    {
      inviteCode: newCode,
      inviteCodeExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    { new: true }
  );

  return successResponse(res, { inviteCode: team.inviteCode, expiresAt: team.inviteCodeExpires });
});

module.exports = { getMyTeams, createTeam, getTeam, updateTeam, joinTeam, updateMemberRole, removeMember, regenerateInviteCode };
