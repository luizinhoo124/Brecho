import express from 'express';
import CartController from '../controllers/CartController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { 
  validateCartItem,
  validateCartUpdate,
  validateId,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticateToken);

// Get user's cart
router.get('/',
  CartController.getCart
);

// Get cart summary (item count, total, validation status)
router.get('/summary',
  CartController.getSummary
);

// Add item to cart
router.post('/items',
  validateCartItem,
  handleValidationErrors,
  CartController.addItem
);

// Update item quantity
router.put('/items/:product_id',
  validateId('product_id'),
  validateCartUpdate,
  handleValidationErrors,
  CartController.updateQuantity
);

// Remove item from cart
router.delete('/items/:product_id',
  validateId('product_id'),
  handleValidationErrors,
  CartController.removeItem
);

// Clear entire cart
router.delete('/clear',
  CartController.clearCart
);

// Validate cart (check stock availability)
router.get('/validate',
  CartController.validateCart
);

// Check if specific product is in cart
router.get('/check/:product_id',
  validateId('product_id'),
  handleValidationErrors,
  CartController.checkProduct
);

// Admin routes
// Get cart statistics
router.get('/admin/stats',
  requireAdmin,
  CartController.getStats
);

// Get popular cart items
router.get('/admin/popular-items',
  requireAdmin,
  CartController.getPopularItems
);

// Clean old cart items
router.delete('/admin/clean-old',
  requireAdmin,
  CartController.cleanOldItems
);

// Get all user carts (admin)
router.get('/admin/all',
  requireAdmin,
  CartController.getAllCarts
);

// Get specific user's cart (admin)
router.get('/admin/user/:user_id',
  requireAdmin,
  validateId('user_id'),
  handleValidationErrors,
  CartController.getUserCart
);

// Clear specific user's cart (admin)
router.delete('/admin/user/:user_id/clear',
  requireAdmin,
  validateId('user_id'),
  handleValidationErrors,
  CartController.clearUserCart
);

export default router;