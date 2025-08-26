import express from 'express';
import UserController from '../controllers/UserController.js';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '../middleware/auth.js';
import { 
  validateUserRegistration, 
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateId,
  validatePagination,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
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

// Get public user profile
router.get('/:id/public',
  validateId(),
  handleValidationErrors,
  UserController.getPublicProfile
);

// Protected routes (require authentication)
// Get current user profile
router.get('/profile',
  authenticateToken,
  UserController.getProfile
);

// Update current user profile
router.put('/profile',
  authenticateToken,
  validateUserUpdate,
  handleValidationErrors,
  UserController.updateProfile
);

// Change password
router.put('/change-password',
  authenticateToken,
  validatePasswordChange,
  handleValidationErrors,
  UserController.changePassword
);

// Verify token
router.get('/verify-token',
  authenticateToken,
  UserController.verifyToken
);

// Delete own account
router.delete('/profile',
  authenticateToken,
  UserController.deleteOwnAccount
);

// Get user's activity/statistics
router.get('/profile/stats',
  authenticateToken,
  UserController.getUserStats
);

// Admin routes
// Get all users
router.get('/',
  authenticateToken,
  requireAdmin,
  validatePagination,
  handleValidationErrors,
  UserController.getAll
);

// Get user by ID (admin)
router.get('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  UserController.getUserById
);

// Update user (admin)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  validateUserUpdate,
  handleValidationErrors,
  UserController.updateUser
);

// Update user role (admin)
router.patch('/:id/role',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  UserController.updateUserRole
);

// Delete user (admin)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  UserController.deleteUser
);

// Get user statistics (admin)
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  UserController.getUserStatistics
);

// Search users (admin)
router.get('/admin/search',
  authenticateToken,
  requireAdmin,
  validatePagination,
  handleValidationErrors,
  UserController.searchUsers
);

// Bulk operations (admin)
router.post('/admin/bulk-update',
  authenticateToken,
  requireAdmin,
  UserController.bulkUpdateUsers
);

router.post('/admin/bulk-delete',
  authenticateToken,
  requireAdmin,
  UserController.bulkDeleteUsers
);

// Export users (admin)
router.get('/admin/export',
  authenticateToken,
  requireAdmin,
  UserController.exportUsers
);

// User activity logs (admin)
router.get('/:id/activity',
  authenticateToken,
  requireAdmin,
  validateId(),
  validatePagination,
  handleValidationErrors,
  UserController.getUserActivity
);

export default router;