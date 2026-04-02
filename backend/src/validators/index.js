const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and a number'),
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
};

const taskValidators = {
  create: [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
    body('teamId').isMongoId().withMessage('Valid team ID is required'),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    body('assignees').optional().isArray().withMessage('Assignees must be an array'),
    body('assignees.*').optional().isMongoId().withMessage('Each assignee must be a valid user ID'),
    body('dueDate').optional().isISO8601().withMessage('Valid date is required'),
    body('storyPoints').optional().isInt({ min: 0, max: 100 }).withMessage('Story points must be 0–100'),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid task ID is required'),
    body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
  ],
};

const teamValidators = {
  create: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2–100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
  ],
  update: [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2–100 characters'),
  ],
};

const commentValidators = {
  create: [
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1–2000 characters'),
    body('taskId').isMongoId().withMessage('Valid task ID is required'),
    body('parentCommentId').optional().isMongoId().withMessage('Valid parent comment ID is required'),
    body('mentions').optional().isArray(),
    body('mentions.*').optional().isMongoId(),
  ],
};

module.exports = { authValidators, taskValidators, teamValidators, commentValidators };
