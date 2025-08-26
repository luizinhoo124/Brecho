import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { validationResult } from 'express-validator';

class OrderController {
  // Create new order from cart
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

      const userId = req.user.id;
      const { shipping_address, payment_method, notes } = req.body;

      // Get user's cart items
      const cartItems = await Cart.getByUser(userId);
      
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Carrinho está vazio'
        });
      }

      // Validate cart and calculate total
      const validation = await Cart.validateCart(userId);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Carrinho inválido',
          details: validation.issues
        });
      }

      const total = await Cart.getTotal(userId);

      // Create order
      const orderData = {
        user_id: userId,
        total_amount: total,
        status: 'pending',
        payment_status: 'pending',
        payment_method,
        shipping_address,
        notes
      };

      const order = await Order.create(orderData, cartItems);

      // Clear cart after successful order creation
      await Cart.clear(userId);

      res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get order by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      // Check if user owns the order or is admin
      if (!isAdmin && order.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Get order items
      const items = await Order.getItems(id);
      order.items = items;

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user's orders
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      };

      const result = await Order.findByUser(userId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get all orders (admin only)
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, status, user_id, payment_status } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        user_id: user_id ? parseInt(user_id) : undefined,
        payment_status
      };

      const result = await Order.findAll(options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update order status (admin only)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido'
        });
      }

      const order = await Order.updateStatus(id, status);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Status do pedido atualizado com sucesso',
        data: order
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update payment status (admin only)
  static async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { payment_status } = req.body;

      // Validate payment status
      const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
      if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Status de pagamento inválido'
        });
      }

      const order = await Order.updatePaymentStatus(id, payment_status);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Status de pagamento atualizado com sucesso',
        data: order
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Cancel order
  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { reason } = req.body;

      // Check if order exists and user has permission
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      // Check permissions
      if (!isAdmin && order.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Check if order can be cancelled
      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Pedido não pode ser cancelado neste status'
        });
      }

      const cancelledOrder = await Order.cancel(id, reason);

      res.json({
        success: true,
        message: 'Pedido cancelado com sucesso',
        data: cancelledOrder
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete order (admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await Order.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Pedido excluído com sucesso'
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get order statistics (admin only)
  static async getStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const stats = await Order.getStats(period);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting order stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get recent orders (admin only)
  static async getRecent(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const orders = await Order.getRecent(parseInt(limit));

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getting recent orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get monthly revenue (admin only)
  static async getMonthlyRevenue(req, res) {
    try {
      const { year = new Date().getFullYear() } = req.query;
      
      const revenue = await Order.getMonthlyRevenue(parseInt(year));

      res.json({
        success: true,
        data: revenue
      });
    } catch (error) {
      console.error('Error getting monthly revenue:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Export orders (admin only)
  static async exportOrders(req, res) {
    try {
      const { format = 'csv', status, start_date, end_date } = req.query;
      
      const filters = {
        status,
        start_date,
        end_date
      };

      const orders = await Order.export(filters);
      
      if (format === 'csv') {
        const csv = OrderController.convertToCSV(orders);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.json');
        res.json(orders);
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk update order status (admin only)
  static async bulkUpdateStatus(req, res) {
    try {
      const { order_ids, status } = req.body;

      if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos pedidos são obrigatórios'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
      }

      const result = await Order.bulkUpdateStatus(order_ids, status);
      
      res.json({
        success: true,
        message: 'Status dos pedidos atualizado com sucesso',
        data: result
      });
    } catch (error) {
      console.error('Error bulk updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk cancel orders (admin only)
  static async bulkCancel(req, res) {
    try {
      const { order_ids, reason } = req.body;

      if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos pedidos são obrigatórios'
        });
      }

      const result = await Order.bulkCancel(order_ids, reason);
      
      res.json({
        success: true,
        message: 'Pedidos cancelados com sucesso',
        data: result
      });
    } catch (error) {
      console.error('Error bulk cancelling orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to convert orders to CSV
  static convertToCSV(orders) {
    if (!orders || orders.length === 0) return '';
    
    const headers = ['ID', 'User ID', 'Total Amount', 'Status', 'Payment Status', 'Payment Method', 'Created At'];
    const csvRows = [headers.join(',')];
    
    orders.forEach(order => {
      const row = [
        order.id,
        order.user_id,
        order.total_amount,
        order.status,
        order.payment_status,
        order.payment_method || '',
        order.created_at
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

export default OrderController;