const { body, validationResult } = require('express-validator');

/**
 * Middleware that checks validation results and returns standardized error response
 */
const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => `${err.path}: ${err.msg}`);

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your inputs.',
      errors: formattedErrors,
    });
  };
};

// Validation sets for auth, workspaces, channels, messages
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const workspaceValidation = [
  body('name').trim().notEmpty().withMessage('Workspace name is required').isLength({ min: 2, max: 50 }).withMessage('Workspace name must be between 2 and 50 characters'),
];

const channelValidation = [
  body('name').trim().notEmpty().withMessage('Channel name is required'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  workspaceValidation,
  channelValidation,
};
