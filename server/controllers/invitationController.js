const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const WorkspaceMember = require('../models/WorkspaceMember');
const User = require('../models/User');
const { emitToWorkspace } = require('../config/socket');
const { createAndDispatchNotification } = require('./notificationController');

/**
 * @desc    Invite user to workspace by email
 * @route   POST /api/workspaces/:id/invite
 * @access  Private (OWNER or ADMIN only)
 */
const createInvitation = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const targetEmail = email.toLowerCase().trim();
    const assignedRole = role && ['ADMIN', 'MEMBER'].includes(role) ? role : 'MEMBER';

    // Check if user is already a member
    const existingUser = await User.findOne({ email: targetEmail });
    if (existingUser) {
      const isAlreadyMember = await WorkspaceMember.findOne({
        workspaceId,
        userId: existingUser._id,
      });

      if (isAlreadyMember) {
        return res.status(400).json({
          success: false,
          message: 'User with this email is already a member of this workspace',
        });
      }
    }

    // Check Subscription member limits
    const Subscription = require('../models/Subscription');
    let subscription = await Subscription.findOne({ workspaceId });
    const maxMembers = subscription ? subscription.maxMembers : 5;
    const currentMemberCount = await WorkspaceMember.countDocuments({ workspaceId });

    if (currentMemberCount >= maxMembers) {
      return res.status(403).json({
        success: false,
        message: `Workspace member limit reached (${maxMembers} members max on your current plan). Please upgrade your workspace subscription to invite more team members.`,
        errors: ['Member limit exceeded'],
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create or update invitation
    let invitation = await Invitation.findOne({ workspaceId, email: targetEmail, status: 'PENDING' });

    if (invitation) {
      invitation.role = assignedRole;
      invitation.token = token;
      invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await invitation.save();
    } else {
      invitation = await Invitation.create({
        workspaceId,
        email: targetEmail,
        role: assignedRole,
        token,
      });
    }

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite/${token}`;

    console.log(`[Workspace Invitation]: Invited ${targetEmail} as ${assignedRole}. Link: ${inviteUrl}`);

    // Socket.IO Emission & Notification
    emitToWorkspace(workspaceId, 'member:invited', {
      email: targetEmail,
      role: assignedRole,
      invitedBy: req.user.name,
    });

    await createAndDispatchNotification({
      workspaceId,
      type: 'INVITATION',
      message: `${req.user.name} invited ${targetEmail} to join workspace as ${assignedRole}`,
      excludeUserId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${targetEmail}`,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        token: invitation.token,
        inviteUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept workspace invitation using token
 * @route   POST /api/invitations/:token/accept
 * @access  Private (Authenticated User)
 */
const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation token',
      });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been accepted',
      });
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: 'This invitation link has expired',
      });
    }

    // Check if user is already in workspace
    let member = await WorkspaceMember.findOne({
      workspaceId: invitation.workspaceId,
      userId: req.user._id,
    });

    if (!member) {
      member = await WorkspaceMember.create({
        workspaceId: invitation.workspaceId,
        userId: req.user._id,
        role: invitation.role,
      });
    }

    invitation.status = 'ACCEPTED';
    await invitation.save();

    await createAndDispatchNotification({
      workspaceId: invitation.workspaceId,
      type: 'SYSTEM',
      message: `${req.user.name} accepted invitation and joined the workspace`,
      excludeUserId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Invitation accepted! You are now a member of the workspace.',
      workspaceId: invitation.workspaceId,
      role: member.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvitation,
  acceptInvitation,
};
