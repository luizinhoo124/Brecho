import Product from '../models/Product.js';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
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

class ProductController {
  // Get all products with filters and pagination
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        min_price,
        max_price,
        condition,
        size,
        color,
        search,
        seller_id,
        featured,
        sort = 'newest'
      } = req.query;

      const filters = {
        category,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        condition,
        size,
        color,
        search,
        seller_id: seller_id ? parseInt(seller_id) : undefined,
        featured: featured === 'true'
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      };

      const result = await Product.findAll(filters, options);
      
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        filters: filters
      });
    } catch (error) {
      console.error('Error getting products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get single product by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error getting product:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Create new product
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

      const {
        name,
        description,
        price,
        category_id,
        condition,
        size,
        color,
        brand,
        stock_quantity = 1,
        featured = false
      } = req.body;

      // Handle image uploads
      let images = [];
      if (req.files && req.files.length > 0) {
        images = await ProductController.saveImages(req.files);
      }

      const productData = {
        name,
        description,
        price: parseFloat(price),
        category_id: parseInt(category_id),
        condition,
        size,
        color,
        brand,
        stock_quantity: parseInt(stock_quantity),
        featured: featured === 'true' || featured === true,
        seller_id: req.user.id,
        images
      };

      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update product
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

      // Check if product exists and user has permission
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      // Check ownership or admin role
      if (existingProduct.seller_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const updateData = { ...req.body };
      
      // Convert numeric fields
      if (updateData.price) updateData.price = parseFloat(updateData.price);
      if (updateData.category_id) updateData.category_id = parseInt(updateData.category_id);
      if (updateData.stock_quantity) updateData.stock_quantity = parseInt(updateData.stock_quantity);
      if (updateData.featured !== undefined) updateData.featured = updateData.featured === 'true' || updateData.featured === true;

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        const newImages = await ProductController.saveImages(req.files);
        
        // Merge with existing images or replace
        if (req.body.replace_images === 'true') {
          // Delete old images
          if (existingProduct.images && existingProduct.images.length > 0) {
            ProductController.deleteImages(existingProduct.images);
          }
          updateData.images = newImages;
        } else {
          // Append new images
          updateData.images = [...(existingProduct.images || []), ...newImages];
        }
      }

      const product = await Product.update(id, updateData);

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: product
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete product
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Check if product exists and user has permission
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      // Check ownership or admin role
      if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Delete product images
      if (product.images && product.images.length > 0) {
        ProductController.deleteImages(product.images);
      }

      const deleted = await Product.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Produto excluído com sucesso'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get featured products
  static async getFeatured(req, res) {
    try {
      const { limit = 8 } = req.query;
      const products = await Product.getFeatured(parseInt(limit));

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error getting featured products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Search products
  static async search(req, res) {
    try {
      const {
        q: search,
        page = 1,
        limit = 12,
        category,
        min_price,
        max_price,
        condition,
        size,
        color,
        sort = 'newest'
      } = req.query;

      if (!search || search.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const filters = {
        search: search.trim(),
        category,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        condition,
        size,
        color
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      };

      const result = await Product.findAll(filters, options);
      
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        filters: filters,
        search_term: search
      });
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get products by seller
  static async getBySeller(req, res) {
    try {
      const { seller_id } = req.params;
      const { page = 1, limit = 12 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await Product.findBySeller(seller_id, options);

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting seller products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update stock
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { stock_quantity } = req.body;

      if (stock_quantity === undefined || stock_quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantidade de estoque inválida'
        });
      }

      const product = await Product.updateStock(id, parseInt(stock_quantity));
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estoque atualizado com sucesso',
        data: product
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to save uploaded images
  static async saveImages(files) {
    const images = [];
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      const filepath = path.join(uploadDir, filename);
      
      // Save file
      fs.writeFileSync(filepath, file.buffer);
      
      // Store relative path
      images.push(`/uploads/products/${filename}`);
    }

    return images;
  }

  // Helper method to delete images
  static deleteImages(images) {
    for (const imagePath of images) {
      try {
        const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  }

  // Get upload middleware
  static getUploadMiddleware() {
    return upload.array('images', 5);
  }

  // Get import middleware
  static getImportMiddleware() {
    return upload.single('file');
  }

  // Get product statistics (Admin only)
  static async getStats(req, res) {
    try {
      const stats = await Product.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting product stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk update products (Admin only)
  static async bulkUpdate(req, res) {
    try {
      const { product_ids, update_data } = req.body;

      if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos produtos são obrigatórios'
        });
      }

      const result = await Product.bulkUpdate(product_ids, update_data);
      
      res.json({
        success: true,
        message: `${result.updated} produtos atualizados com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Error bulk updating products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk delete products (Admin only)
  static async bulkDelete(req, res) {
    try {
      const { product_ids } = req.body;

      if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos produtos são obrigatórios'
        });
      }

      const result = await Product.bulkDelete(product_ids);
      
      res.json({
        success: true,
        message: `${result.deleted} produtos excluídos com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Export products (Admin only)
  static async exportProducts(req, res) {
    try {
      const { format = 'json' } = req.query;
      const products = await Product.findAll({}, { page: 1, limit: 10000 });
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = ProductController.convertToCSV(products.products);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=products.json');
        res.json({
          success: true,
          data: products.products,
          exported_at: new Date().toISOString(),
          total: products.products.length
        });
      }
    } catch (error) {
      console.error('Error exporting products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Import products (Admin only)
  static async importProducts(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
      }

      const fileContent = req.file.buffer.toString('utf8');
      let products;

      try {
        products = JSON.parse(fileContent);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Formato de arquivo inválido. Use JSON válido.'
        });
      }

      if (!Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          message: 'O arquivo deve conter um array de produtos'
        });
      }

      const result = await Product.bulkCreate(products, req.user.id);
      
      res.json({
        success: true,
        message: `${result.created} produtos importados com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Error importing products:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to convert products to CSV
  static convertToCSV(products) {
    if (products.length === 0) return '';
    
    const headers = Object.keys(products[0]).join(',');
    const rows = products.map(product => 
      Object.values(product).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
}

export default ProductController;