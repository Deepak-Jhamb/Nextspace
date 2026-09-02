const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

/**
 * Middleware: Verifies authenticated user is a member of the target workspace
 */
const checkWorkspaceMembership = async (req, res, next) => {
  try {
    const workspaceId = req.params.id || req.params.workspaceId || req.body.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID parameter is required',
      });
    }

    // Check workspace existence
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check user membership
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this workspace.',
      });
    }

    // Attach workspace & member details to request
    req.workspace = workspace;
    req.workspaceMember = member;

    next();
  } catch (error) {
    console.error('[Workspace Membership Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error checking workspace permissions',
    });
  }
};

/**
 * Middleware factory: Enforces role permissions
 * @param {Array<string>} allowedRoles - e.g. ['OWNER', 'ADMIN']
 */
const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.workspaceMember) {
      return res.status(403).json({
        success: false,
        message: 'Workspace membership context missing',
      });
    }

    if (!allowedRoles.includes(req.workspaceMember.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = {
  checkWorkspaceMembership,
  checkRole,
};
