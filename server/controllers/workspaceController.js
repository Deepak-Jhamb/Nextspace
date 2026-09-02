const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Invitation = require('../models/Invitation');
const { createAndDispatchNotification } = require('./notificationController');

/**
 * @desc    Create new workspace (Creator becomes OWNER)
 * @route   POST /api/workspaces
 * @access  Private
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required',
      });
    }

    // Create workspace
    const workspace = await Workspace.create({
      name: name.trim(),
      ownerId: req.user._id,
    });

    // Add creator as OWNER in WorkspaceMember
    const member = await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'OWNER',
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
      role: member.role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all workspaces user belongs to
 * @route   GET /api/workspaces
 * @access  Private
 */
const getWorkspaces = async (req, res, next) => {
  try {
    // Find all memberships for current user
    const memberships = await WorkspaceMember.find({ userId: req.user._id })
      .populate({
        path: 'workspaceId',
        populate: { path: 'ownerId', select: 'name email avatar' },
      })
      .sort({ createdAt: -1 });

    const workspaces = memberships
      .filter((m) => m.workspaceId !== null)
      .map((m) => ({
        ...m.workspaceId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single workspace details
 * @route   GET /api/workspaces/:id
 * @access  Private (Member only)
 */
const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = req.workspace;
    const member = req.workspaceMember;

    res.status(200).json({
      success: true,
      workspace: {
        ...workspace.toObject(),
        role: member.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workspace details
 * @route   PATCH /api/workspaces/:id
 * @access  Private (OWNER only)
 */
const updateWorkspace = async (req, res, next) => {
  try {
    const { name, plan } = req.body;
    const workspace = req.workspace;

    if (name) workspace.name = name.trim();
    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) {
      workspace.plan = plan;
      // Adjust storage limits based on plan
      if (plan === 'free') workspace.storageLimit = 1073741824; // 1 GB
      if (plan === 'pro') workspace.storageLimit = 107374182400; // 100 GB
      if (plan === 'enterprise') workspace.storageLimit = 1099511627776; // 1 TB
    }

    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete workspace
 * @route   DELETE /api/workspaces/:id
 * @access  Private (OWNER only)
 */
const deleteWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;

    // Delete workspace, members, and pending invitations
    await Workspace.findByIdAndDelete(workspaceId);
    await WorkspaceMember.deleteMany({ workspaceId });
    await Invitation.deleteMany({ workspaceId });

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get members of a workspace
 * @route   GET /api/workspaces/:id/members
 * @access  Private (Member only)
 */
const getWorkspaceMembers = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email avatar role createdAt')
      .sort({ role: 1, joinedAt: 1 });

    const formattedMembers = members.map((m) => ({
      memberId: m._id,
      user: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedMembers.length,
      members: formattedMembers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change workspace member role
 * @route   PATCH /api/workspaces/:id/members/:userId/role
 * @access  Private (OWNER only)
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles to assign: ADMIN, MEMBER',
      });
    }

    const memberToUpdate = await WorkspaceMember.findOne({ workspaceId, userId }).populate('userId', 'name');
    if (!memberToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Workspace member not found',
      });
    }

    // Cannot change OWNER's role
    if (memberToUpdate.role === 'OWNER') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify the role of the workspace Owner',
      });
    }

    memberToUpdate.role = role;
    await memberToUpdate.save();

    await createAndDispatchNotification({
      workspaceId,
      type: 'ROLE_CHANGE',
      message: `${memberToUpdate.userId?.name || 'Member'}'s workspace role was updated to ${role}`,
    });

    res.status(200).json({
      success: true,
      message: `Member role updated to ${role}`,
      member: memberToUpdate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from workspace
 * @route   DELETE /api/workspaces/:id/members/:userId
 * @access  Private (OWNER or ADMIN)
 */
const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;

    const memberToRemove = await WorkspaceMember.findOne({ workspaceId, userId });
    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: 'Workspace member not found',
      });
    }

    // Cannot remove the OWNER
    if (memberToRemove.role === 'OWNER') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the workspace Owner',
      });
    }

    // ADMIN cannot remove another ADMIN (only OWNER can)
    if (req.workspaceMember.role === 'ADMIN' && memberToRemove.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot remove other Admins. Only the Owner can remove Admins.',
      });
    }

    await WorkspaceMember.findByIdAndDelete(memberToRemove._id);

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  removeWorkspaceMember,
};
