import express from 'express';
import CategoryController from '../controllers/CategoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { 
  validateCategory,
  validateCategoryUpdate,
  validateId,
  validatePagination,
  validateSearchTerm,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
// Get all categories
router.get('/',
  CategoryController.getAll
);

// Get category by ID
router.get('/:id',
  validateId(),
  handleValidationErrors,
  CategoryController.getById
);

// Get category with products
router.get('/:id/products',
  validateId(),
  validatePagination,
  handleValidationErrors,
  CategoryController.getWithProducts
);

// Get popular categories
router.get('/popular/list',
  CategoryController.getPopular
);

// Search categories
router.get('/search/query',
  validateSearchTerm,
  handleValidationErrors,
  CategoryController.search
);

// Admin routes (require authentication and admin role)
// Create new category
router.post('/',
  authenticateToken,
  requireAdmin,
  CategoryController.getUploadMiddleware(),
  validateCategory,
  handleValidationErrors,
  CategoryController.create
);

// Update category
router.put('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  CategoryController.getUploadMiddleware(),
  validateCategoryUpdate,
  handleValidationErrors,
  CategoryController.update
);

// Delete category
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateId(),
  handleValidationErrors,
  CategoryController.delete
);

// Get category statistics
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  CategoryController.getStats
);

// Bulk operations
router.post('/admin/bulk-create',
  authenticateToken,
  requireAdmin,
  CategoryController.bulkCreate
);

router.post('/admin/bulk-update',
  authenticateToken,
  requireAdmin,
  CategoryController.bulkUpdate
);

router.post('/admin/bulk-delete',
  authenticateToken,
  requireAdmin,
  CategoryController.bulkDelete
);

// Export/Import categories
router.get('/admin/export',
  authenticateToken,
  requireAdmin,
  CategoryController.exportCategories
);

router.post('/admin/import',
  authenticateToken,
  requireAdmin,
  CategoryController.getImportMiddleware(),
  CategoryController.importCategories
);

export default router;