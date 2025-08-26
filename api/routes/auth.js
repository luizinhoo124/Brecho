import express from 'express';
import UserController from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateUserRegistration, 
  validateUserLogin,
  validatePasswordReset,
  validatePasswordChange,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Public authentication routes
// User registration
router.post('/register',
  validateUserRegistration,
  handleValidationErrors,
  UserController.register
);

// User login
router.post('/login',
  validateUserLogin,
  handleValidationErrors,
  UserController.login
);

// Check if email exists
router.post('/check-email',
  UserController.checkEmail
);

// Forgot password (initiate password reset)
router.post('/forgot-password',
  UserController.forgotPassword
);

// Reset password with token
router.post('/reset-password',
  validatePasswordReset,
  handleValidationErrors,
  UserController.resetPassword
);

// Verify email with token
router.get('/verify-email/:token',
  UserController.verifyEmail
);

// Resend email verification
router.post('/resend-verification',
  UserController.resendVerification
);

// Protected authentication routes
// Verify current token
router.get('/verify-token',
  authenticateToken,
  UserController.verifyToken
);

// Refresh token
router.post('/refresh-token',
  authenticateToken,
  UserController.refreshToken
);

// Logout (invalidate token)
router.post('/logout',
  authenticateToken,
  UserController.logout
);

// Change password (authenticated user)
router.put('/change-password',
  authenticateToken,
  validatePasswordChange,
  handleValidationErrors,
  UserController.changePassword
);

// Get current user info
router.get('/me',
  authenticateToken,
  UserController.getProfile
);

// Update current user profile
router.put('/me',
  authenticateToken,
  UserController.updateProfile
);

// Delete current user account
router.delete('/me',
  authenticateToken,
  UserController.deleteOwnAccount
);

// Get user sessions/devices
router.get('/sessions',
  authenticateToken,
  UserController.getUserSessions
);

// Logout from all devices
router.post('/logout-all',
  authenticateToken,
  UserController.logoutAll
);

// Two-factor authentication routes
// Enable 2FA
router.post('/2fa/enable',
  authenticateToken,
  UserController.enable2FA
);

// Disable 2FA
router.post('/2fa/disable',
  authenticateToken,
  UserController.disable2FA
);

// Verify 2FA token
router.post('/2fa/verify',
  authenticateToken,
  UserController.verify2FA
);

// Generate 2FA backup codes
router.post('/2fa/backup-codes',
  authenticateToken,
  UserController.generate2FABackupCodes
);

export default router;