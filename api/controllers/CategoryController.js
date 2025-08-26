import Category from '../models/Category.js';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for category image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1 // Only one image per category
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
    }
  }
});

class CategoryController {
  // Get all categories
  static async getAll(req, res) {
    try {
      const categories = await Category.findAll();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get category by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error getting category:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get category with products
  static async getWithProducts(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 12 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await Category.findWithProducts(id, options);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting category with products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Create new category (admin only)
  static async create(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const { name, description } = req.body;

      // Handle image upload
      let image = null;
      if (req.file) {
        image = await CategoryController.saveImage(req.file);
      }

      const categoryData = {
        name,
        description,
        image
      };

      const category = await Category.create(categoryData);

      res.status(201).json({
        success: true,
        message: 'Categoria criada com sucesso',
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error.message === 'Categoria já existe') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update category (admin only)
  static async update(req, res) {
    try {
      const { id } = req.params;
      
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      // Check if category exists
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      const updateData = { ...req.body };

      // Handle new image upload
      if (req.file) {
        // Delete old image if exists
        if (existingCategory.image) {
          CategoryController.deleteImage(existingCategory.image);
        }
        
        updateData.image = await CategoryController.saveImage(req.file);
      }

      const category = await Category.update(id, updateData);

      res.json({
        success: true,
        message: 'Categoria atualizada com sucesso',
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      
      if (error.message === 'Nome da categoria já está em uso') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete category (admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Check if category exists
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      // Delete category image if exists
      if (category.image) {
        CategoryController.deleteImage(category.image);
      }

      const deleted = await Category.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Categoria excluída com sucesso'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      
      if (error.message === 'Não é possível excluir categoria que possui produtos') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get popular categories
  static async getPopular(req, res) {
    try {
      const { limit = 6 } = req.query;
      const categories = await Category.getPopular(parseInt(limit));

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error getting popular categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Search categories
  static async search(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const categories = await Category.search(q.trim());

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error searching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get category statistics (admin only)
  static async getStats(req, res) {
    try {
      const stats = await Category.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting category stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to save uploaded image
  static async saveImage(file) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'categories');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    const filepath = path.join(uploadDir, filename);
    
    // Save file
    fs.writeFileSync(filepath, file.buffer);
    
    // Return relative path
    return `/uploads/categories/${filename}`;
  }

  // Helper method to delete image
  static deleteImage(imagePath) {
    try {
      const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('Error deleting category image:', error);
    }
  }

  // Bulk create categories (admin)
  static async bulkCreate(req, res) {
    try {
      const { categories } = req.body;

      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de categorias é obrigatória'
        });
      }

      const result = await Category.bulkCreate(categories);

      res.status(201).json({
        success: true,
        message: `${result.created} categorias criadas com sucesso`,
        data: {
          created: result.created,
          failed: result.failed,
          errors: result.errors
        }
      });
    } catch (error) {
      console.error('Error bulk creating categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk update categories (admin)
  static async bulkUpdate(req, res) {
    try {
      const { category_ids, update_data } = req.body;

      if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs das categorias são obrigatórios'
        });
      }

      const result = await Category.bulkUpdate(category_ids, update_data);

      res.json({
        success: true,
        message: `${result.updated} categorias atualizadas com sucesso`,
        data: {
          updated: result.updated,
          failed: result.failed
        }
      });
    } catch (error) {
      console.error('Error bulk updating categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk delete categories (admin)
  static async bulkDelete(req, res) {
    try {
      const { category_ids } = req.body;

      if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs das categorias são obrigatórios'
        });
      }

      const result = await Category.bulkDelete(category_ids);

      res.json({
        success: true,
        message: `${result.deleted} categorias excluídas com sucesso`,
        data: {
          deleted: result.deleted,
          failed: result.failed,
          errors: result.errors
        }
      });
    } catch (error) {
      console.error('Error bulk deleting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Export categories (admin)
  static async exportCategories(req, res) {
    try {
      const { format = 'json' } = req.query;
      const categories = await Category.findAll();
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = CategoryController.convertToCSV(categories);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=categories.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=categories.json');
        res.json({
          success: true,
          data: categories,
          exported_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error exporting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Import categories (admin)
  static async importCategories(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
      }

      let categories;
      const fileContent = req.file.buffer.toString();
      
      try {
        if (req.file.mimetype === 'application/json') {
          const data = JSON.parse(fileContent);
          categories = data.data || data;
        } else {
          // Assume CSV format
          categories = CategoryController.parseCSV(fileContent);
        }
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Formato de arquivo inválido'
        });
      }

      if (!Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          message: 'Dados devem ser um array de categorias'
        });
      }

      const result = await Category.bulkCreate(categories);

      res.json({
        success: true,
        message: `Importação concluída: ${result.created} categorias criadas`,
        data: {
          created: result.created,
          failed: result.failed,
          errors: result.errors
        }
      });
    } catch (error) {
      console.error('Error importing categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to convert categories to CSV
  static convertToCSV(categories) {
    if (!categories || categories.length === 0) {
      return 'name,description,image\n';
    }

    const headers = 'name,description,image\n';
    const rows = categories.map(category => {
      const name = (category.name || '').replace(/"/g, '""');
      const description = (category.description || '').replace(/"/g, '""');
      const image = (category.image || '').replace(/"/g, '""');
      return `"${name}","${description}","${image}"`;
    }).join('\n');

    return headers + rows;
  }

  // Helper method to parse CSV
  static parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const categories = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 2) {
        categories.push({
          name: values[0],
          description: values[1] || '',
          image: values[2] || null
        });
      }
    }

    return categories;
  }

  // Get import middleware
  static getImportMiddleware() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos JSON e CSV são permitidos'));
        }
      }
    }).single('file');
  }

  // Get upload middleware
  static getUploadMiddleware() {
    return upload.single('image');
  }
}

export default CategoryController;