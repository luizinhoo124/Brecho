import express from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { 
  validateProduct, 
  validateProductUpdate, 
  validateId, 
  validatePagination,
  validateSearchTerm,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
// Get all products with filters and pagination
router.get('/', 
  validatePagination,
  handleValidationErrors,
  optionalAuth,
  ProductController.getAll
);

// Search products
router.get('/search',
  validateSearchTerm,
  validatePagination,
  handleValidationErrors,
  optionalAuth,
  ProductController.search
);

// Get featured products
router.get('/featured',
  validatePagination,
  handleValidationErrors,
  ProductController.getFeatured
);

// Get product by ID
router.get('/:id',
  validateId(),
  handleValidationErrors,
  optionalAuth,
  ProductController.getById
);

// Get products by seller
router.get('/seller/:sellerId',
  validateId(),
  validatePagination,
  handleValidationErrors,
  ProductController.getBySeller
);

// Protected routes (require authentication)
// Create new product
router.post('/',
  authenticateToken,
  ProductController.getUploadMiddleware(),
  validateProduct,
  handleValidationErrors,
  ProductController.create
);

// Update product
router.put('/:id',
  authenticateToken,
  validateId(),
  ProductController.getUploadMiddleware(),
  validateProductUpdate,
  handleValidationErrors,
  ProductController.update
);

// Delete product
router.delete('/:id',
  authenticateToken,
  validateId(),
  handleValidationErrors,
  ProductController.delete
);

// Update product stock
router.patch('/:id/stock',
  authenticateToken,
  validateId(),
  handleValidationErrors,
  ProductController.updateStock
);

// Admin only routes
// Get all products (admin view with more details)
router.get('/admin/all',
  authenticateToken,
  requireAdmin,
  validatePagination,
  handleValidationErrors,
  ProductController.getAll
);

// Get product statistics
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  ProductController.getStats
);

// Bulk operations
router.post('/admin/bulk-update',
  authenticateToken,
  requireAdmin,
  ProductController.bulkUpdate
);

router.post('/admin/bulk-delete',
  authenticateToken,
  requireAdmin,
  ProductController.bulkDelete
);

// Export/Import
router.get('/admin/export',
  authenticateToken,
  requireAdmin,
  ProductController.exportProducts
);

router.post('/admin/import',
  authenticateToken,
  requireAdmin,
  ProductController.getImportMiddleware(),
  ProductController.importProducts
);

export default router;