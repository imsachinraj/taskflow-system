const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return errorResponse(res, 'Token is no longer valid. User not found.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated.', 403);
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return errorResponse(res, 'Password recently changed. Please log in again.', 401);
    }

    // Update last seen asynchronously (non-blocking)
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please log in again.', 401);
    }
    logger.error(`Auth middleware error: ${error.message}`);
    return errorResponse(res, 'Authentication failed.', 500);
  }
};

/**
 * Restrict to specific roles (system-level)
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};

/**
 * Verify user is a member of the team (team-level)
 */
const requireTeamMember = async (req, res, next) => {
  try {
    const Team = require('../models/Team');
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;

    if (!teamId) return errorResponse(res, 'Team ID is required.', 400);

    const team = await Team.findById(teamId);
    if (!team) return errorResponse(res, 'Team not found.', 404);
    if (!team.isMember(req.user._id)) {
      return errorResponse(res, 'You are not a member of this team.', 403);
    }

    req.team = team;
    req.teamRole = team.getMemberRole(req.user._id);
    next();
  } catch (error) {
    logger.error(`requireTeamMember error: ${error.message}`);
    return errorResponse(res, 'Authorization failed.', 500);
  }
};

/**
 * Require minimum team role
 */
const requireTeamRole = (minimumRole) => {
  const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 };

  return async (req, res, next) => {
    if (!req.team) return errorResponse(res, 'Team context required.', 500);

    const userRole = req.teamRole || req.team.getMemberRole(req.user._id);
    if (!userRole || roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
      return errorResponse(
        res,
        `This action requires at least ${minimumRole} permissions.`,
        403
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo, requireTeamMember, requireTeamRole };
