const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Authentication endpoints (Login, Register, Forgot Password)
 * Prevents brute force attacks (Max 15 requests per 15 minutes per IP)
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    errors: ['Rate limit exceeded on authentication endpoints.'],
  },
});

/**
 * Rate Limiter for File Uploads
 * Prevents DOS / Storage flooding attacks (Max 30 uploads per 15 minutes per IP)
 */
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'File upload threshold reached. Please wait before uploading more files.',
    errors: ['Rate limit exceeded on file upload endpoints.'],
  },
});

/**
 * General API Rate Limiter
 * Max 200 requests per 15 minutes
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests sent to the server. Please slow down.',
    errors: ['Global API rate limit exceeded.'],
  },
});

module.exports = {
  authRateLimiter,
  uploadRateLimiter,
  generalRateLimiter,
};
