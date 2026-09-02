const express = require('express');
const {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  removeWorkspaceMember,
} = require('../controllers/workspaceController');
const { createInvitation } = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership, checkRole } = require('../middleware/workspaceMiddleware');

const router = express.Router();

// Public / Authenticated General Routes
router.use(protect);

router.post('/', createWorkspace);
router.get('/', getWorkspaces);

// Routes requiring workspace membership
router.get('/:id', checkWorkspaceMembership, getWorkspaceById);
router.patch('/:id', checkWorkspaceMembership, checkRole(['OWNER']), updateWorkspace);
router.delete('/:id', checkWorkspaceMembership, checkRole(['OWNER']), deleteWorkspace);

// Invitations & Team Management
router.post('/:id/invite', checkWorkspaceMembership, checkRole(['OWNER', 'ADMIN']), createInvitation);
router.get('/:id/members', checkWorkspaceMembership, getWorkspaceMembers);
router.patch('/:id/members/:userId/role', checkWorkspaceMembership, checkRole(['OWNER']), updateMemberRole);
router.delete('/:id/members/:userId', checkWorkspaceMembership, checkRole(['OWNER', 'ADMIN']), removeWorkspaceMember);

module.exports = router;
