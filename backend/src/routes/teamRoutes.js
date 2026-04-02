const express = require('express');
const {
  getMyTeams, createTeam, getTeam, updateTeam, joinTeam,
  updateMemberRole, removeMember, regenerateInviteCode,
} = require('../controllers/teamController');
const { protect, requireTeamMember, requireTeamRole } = require('../middleware/authMiddleware');
const { teamValidators } = require('../validators');

const router = express.Router();

router.use(protect);

router.get('/', getMyTeams);
router.post('/', teamValidators.create, createTeam);
router.post('/join', joinTeam);

router.get('/:id', requireTeamMember, getTeam);
router.patch('/:id', requireTeamMember, requireTeamRole('admin'), teamValidators.update, updateTeam);
router.patch('/:id/members/:userId/role', requireTeamMember, requireTeamRole('admin'), updateMemberRole);
router.delete('/:id/members/:userId', requireTeamMember, requireTeamRole('admin'), removeMember);
router.post('/:id/invite-code', requireTeamMember, requireTeamRole('admin'), regenerateInviteCode);

module.exports = router;
