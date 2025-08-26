import express from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '../middleware/auth.js';
import { 
  validateOrder,
  validateOrderUpdate,
  validateId,
  validatePagination,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Protected routes (require authentication)
// Create new order from cart
router.post('/',
  authenticateToken,
  validateOrder,
  handleValidationErrors,
  OrderController.create
);

// Get current user's orders
router.get('/my-orders',
  authenticateToken,
  validatePagination,
  handleValidationErrors,
  OrderController.getUserOrders
);

// Get order by ID (user can only see their own orders, admin can see all)
router.get('/:id',
  authenticateToken,
  validateId(),
  handleValidationErrors,
  OrderController.getById
);

// Cancel order (user can cancel their own orders, admin can cancel any)
router.patch('/:id/cancel',
  authenticateToken,
  validateId(),
  handleValidationErrors,
  OrderController.cancel
);

// Admin routes
// Get all orders
router.get('/',
  authenticateToken,
  requireAdmin,
  validatePagination,
  handleValidationErrors,
  OrderController.getAll
);

// Update order status
router.patch('/:id/status',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  OrderController.updateStatus
);

// Update payment status
router.patch('/:id/payment-status',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  OrderController.updatePaymentStatus
);

// Delete order
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  OrderController.delete
);

// Get order statistics
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  OrderController.getStats
);

// Get recent orders
router.get('/admin/recent',
  authenticateToken,
  requireAdmin,
  OrderController.getRecent
);

// Get monthly revenue
router.get('/admin/revenue',
  authenticateToken,
  requireAdmin,
  OrderController.getMonthlyRevenue
);

// Export orders
router.get('/admin/export',
  authenticateToken,
  requireAdmin,
  OrderController.exportOrders
);

// Bulk operations
router.post('/admin/bulk-update-status',
  authenticateToken,
  requireAdmin,
  OrderController.bulkUpdateStatus
);

router.post('/admin/bulk-cancel',
  authenticateToken,
  requireAdmin,
  OrderController.bulkCancel
);

export default router;