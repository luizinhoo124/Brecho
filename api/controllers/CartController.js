import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { validationResult } from 'express-validator';

class CartController {
  // Get user's cart
  static async getCart(req, res) {
    try {
      const userId = req.user.id;
      
      const cartItems = await Cart.getByUser(userId);
      const total = await Cart.getTotal(userId);
      const itemCount = await Cart.getItemCount(userId);

      res.json({
        success: true,
        data: {
          items: cartItems,
          total,
          item_count: itemCount
        }
      });
    } catch (error) {
      console.error('Error getting cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Add item to cart
  static async addItem(req, res) {
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

      const userId = req.user.id;
      const { product_id, quantity = 1 } = req.body;

      // Check if product exists and is available
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      if (product.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: 'Produto não está disponível'
        });
      }

      // Check stock availability
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente. Disponível: ${product.stock}`
        });
      }

      // Check if item already exists in cart
      const existingItem = await Cart.getItem(userId, product_id);
      
      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Quantidade total excede o estoque. Disponível: ${product.stock}`
          });
        }

        const updatedItem = await Cart.updateQuantity(userId, product_id, newQuantity);
        
        res.json({
          success: true,
          message: 'Quantidade atualizada no carrinho',
          data: updatedItem
        });
      } else {
        // Add new item
        const cartItem = await Cart.add(userId, product_id, quantity);
        
        res.status(201).json({
          success: true,
          message: 'Item adicionado ao carrinho',
          data: cartItem
        });
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update item quantity
  static async updateQuantity(req, res) {
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

      const userId = req.user.id;
      const { product_id } = req.params;
      const { quantity } = req.body;

      // Check if item exists in cart
      const existingItem = await Cart.getItem(userId, product_id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }

      // Check product stock
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Quantidade excede o estoque. Disponível: ${product.stock}`
        });
      }

      const updatedItem = await Cart.updateQuantity(userId, product_id, quantity);

      res.json({
        success: true,
        message: 'Quantidade atualizada',
        data: updatedItem
      });
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Remove item from cart
  static async removeItem(req, res) {
    try {
      const userId = req.user.id;
      const { product_id } = req.params;

      // Check if item exists in cart
      const existingItem = await Cart.getItem(userId, product_id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }

      const removed = await Cart.remove(userId, product_id);
      
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }

      res.json({
        success: true,
        message: 'Item removido do carrinho'
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Clear entire cart
  static async clearCart(req, res) {
    try {
      const userId = req.user.id;
      
      const cleared = await Cart.clear(userId);
      
      res.json({
        success: true,
        message: 'Carrinho limpo com sucesso'
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Validate cart (check stock availability)
  static async validateCart(req, res) {
    try {
      const userId = req.user.id;
      
      const validation = await Cart.validateCart(userId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get cart summary
  static async getSummary(req, res) {
    try {
      const userId = req.user.id;
      
      const itemCount = await Cart.getItemCount(userId);
      const total = await Cart.getTotal(userId);
      const validation = await Cart.validateCart(userId);

      res.json({
        success: true,
        data: {
          item_count: itemCount,
          total,
          valid: validation.valid,
          issues: validation.issues || []
        }
      });
    } catch (error) {
      console.error('Error getting cart summary:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Check if product is in cart
  static async checkProduct(req, res) {
    try {
      const userId = req.user.id;
      const { product_id } = req.params;

      const inCart = await Cart.isProductInCart(userId, product_id);
      const item = inCart ? await Cart.getItem(userId, product_id) : null;

      res.json({
        success: true,
        data: {
          in_cart: inCart,
          item
        }
      });
    } catch (error) {
      console.error('Error checking product in cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get cart statistics (admin only)
  static async getStats(req, res) {
    try {
      const stats = await Cart.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting cart stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get popular cart items (admin only)
  static async getPopularItems(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const items = await Cart.getPopularItems(parseInt(limit));

      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('Error getting popular cart items:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Clean old cart items (admin only)
  static async cleanOldItems(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const cleaned = await Cart.cleanOldItems(parseInt(days));

      res.json({
        success: true,
        message: `${cleaned} itens antigos removidos do carrinho`
      });
    } catch (error) {
      console.error('Error cleaning old cart items:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get all user carts (admin only)
  static async getAllCarts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const carts = await Cart.getAllCarts(parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: carts
      });
    } catch (error) {
      console.error('Error getting all carts:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get specific user's cart (admin only)
  static async getUserCart(req, res) {
    try {
      const { user_id } = req.params;
      
      const cartItems = await Cart.getByUser(user_id);
      const total = await Cart.getTotal(user_id);
      const itemCount = await Cart.getItemCount(user_id);

      res.json({
        success: true,
        data: {
          user_id: parseInt(user_id),
          items: cartItems,
          total,
          item_count: itemCount
        }
      });
    } catch (error) {
      console.error('Error getting user cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Clear specific user's cart (admin only)
  static async clearUserCart(req, res) {
    try {
      const { user_id } = req.params;
      
      const cleared = await Cart.clearCart(user_id);
      
      res.json({
        success: true,
        message: `Carrinho do usuário ${user_id} limpo com sucesso`,
        items_removed: cleared
      });
    } catch (error) {
      console.error('Error clearing user cart:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default CartController;