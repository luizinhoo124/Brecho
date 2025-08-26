import { runQuery, getRow, getAllRows } from '../config/database.js';

class Order {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.total_amount = data.total_amount;
    this.status = data.status;
    this.shipping_address = data.shipping_address;
    this.payment_method = data.payment_method;
    this.payment_status = data.payment_status;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new order
  static async create(orderData) {
    const {
      user_id,
      items, // Array of {product_id, quantity, price}
      shipping_address,
      payment_method,
      notes
    } = orderData;

    // Calculate total amount
    let total_amount = 0;
    for (const item of items) {
      total_amount += item.price * item.quantity;
    }

    // Create order
    const orderSql = `
      INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const orderResult = await runQuery(orderSql, [
      user_id,
      total_amount,
      shipping_address,
      payment_method,
      notes
    ]);

    const orderId = orderResult.id;

    // Create order items
    for (const item of items) {
      const itemSql = `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `;
      await runQuery(itemSql, [orderId, item.product_id, item.quantity, item.price]);
    }

    return await Order.findById(orderId);
  }

  // Find order by ID
  static async findById(id) {
    const sql = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    
    const row = await getRow(sql, [id]);
    if (!row) return null;

    const order = new Order(row);
    order.user_name = row.user_name;
    order.user_email = row.user_email;

    // Get order items
    order.items = await Order.getOrderItems(id);

    return order;
  }

  // Get order items
  static async getOrderItems(orderId) {
    const sql = `
      SELECT oi.*, p.name as product_name, p.images as product_images,
             u.name as seller_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE oi.order_id = ?
    `;

    const items = await getAllRows(sql, [orderId]);
    
    return items.map(item => {
      if (item.product_images) {
        try {
          item.product_images = JSON.parse(item.product_images);
        } catch (e) {
          item.product_images = [];
        }
      } else {
        item.product_images = [];
      }
      return item;
    });
  }

  // Find orders by user
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
    `;
    
    const params = [userId];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += `
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const orders = await getAllRows(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams = [userId];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const countResult = await getRow(countSql, countParams);
    const total = countResult.total;

    return {
      orders: orders.map(order => new Order(order)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Find all orders (admin)
  static async findAll(options = {}) {
    const { page = 1, limit = 20, status, user_id } = options;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, u.name as user_name, u.email as user_email,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (user_id) {
      sql += ' AND o.user_id = ?';
      params.push(user_id);
    }

    sql += `
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const orders = await getAllRows(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    if (user_id) {
      countSql += ' AND user_id = ?';
      countParams.push(user_id);
    }
    
    const countResult = await getRow(countSql, countParams);
    const total = countResult.total;

    return {
      orders: orders.map(order => {
        const orderObj = new Order(order);
        orderObj.user_name = order.user_name;
        orderObj.user_email = order.user_email;
        orderObj.item_count = order.item_count;
        return orderObj;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update order status
  static async updateStatus(id, status, notes = null) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Status inválido');
    }

    let sql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [status];

    if (notes) {
      sql += ', notes = ?';
      params.push(notes);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await runQuery(sql, params);
    return await Order.findById(id);
  }

  // Update payment status
  static async updatePaymentStatus(id, paymentStatus) {
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    
    if (!validStatuses.includes(paymentStatus)) {
      throw new Error('Status de pagamento inválido');
    }

    const sql = `
      UPDATE orders 
      SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(sql, [paymentStatus, id]);
    return await Order.findById(id);
  }

  // Cancel order
  static async cancel(id, reason = null) {
    const order = await Order.findById(id);
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      throw new Error('Não é possível cancelar este pedido');
    }

    const notes = reason ? `Cancelado: ${reason}` : 'Pedido cancelado';
    return await Order.updateStatus(id, 'cancelled', notes);
  }

  // Get order statistics
  static async getStats(options = {}) {
    const { start_date, end_date, user_id } = options;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }

    const queries = {
      total_orders: `SELECT COUNT(*) as count FROM orders ${whereClause}`,
      total_revenue: `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders ${whereClause} AND payment_status = 'paid'`,
      pending_orders: `SELECT COUNT(*) as count FROM orders ${whereClause} AND status = 'pending'`,
      completed_orders: `SELECT COUNT(*) as count FROM orders ${whereClause} AND status = 'delivered'`,
      cancelled_orders: `SELECT COUNT(*) as count FROM orders ${whereClause} AND status = 'cancelled'`,
      average_order_value: `SELECT COALESCE(AVG(total_amount), 0) as avg FROM orders ${whereClause} AND payment_status = 'paid'`
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await getRow(query, params);
      results[key] = result.count || result.total || result.avg || 0;
    }

    return results;
  }

  // Get recent orders
  static async getRecent(limit = 10) {
    const sql = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `;

    const orders = await getAllRows(sql, [limit]);
    return orders.map(order => {
      const orderObj = new Order(order);
      orderObj.user_name = order.user_name;
      orderObj.user_email = order.user_email;
      return orderObj;
    });
  }

  // Check if user owns order
  static async isOwner(orderId, userId) {
    const sql = 'SELECT user_id FROM orders WHERE id = ?';
    const result = await getRow(sql, [orderId]);
    return result && result.user_id === userId;
  }

  // Delete order (admin only)
  static async delete(id) {
    // Delete order items first
    await runQuery('DELETE FROM order_items WHERE order_id = ?', [id]);
    
    // Delete order
    const result = await runQuery('DELETE FROM orders WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Get monthly revenue
  static async getMonthlyRevenue(year = new Date().getFullYear()) {
    const sql = `
      SELECT 
        strftime('%m', created_at) as month,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as order_count
      FROM orders 
      WHERE strftime('%Y', created_at) = ? 
        AND payment_status = 'paid'
      GROUP BY strftime('%m', created_at)
      ORDER BY month
    `;

    return await getAllRows(sql, [year.toString()]);
  }

  // Bulk update order status
  static async bulkUpdateStatus(orderIds, status, notes = null) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Status inválido');
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('IDs de pedidos inválidos');
    }

    const placeholders = orderIds.map(() => '?').join(',');
    let sql = `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];

    if (notes) {
      sql += ', notes = ?';
      params.push(notes);
    }

    sql += ` WHERE id IN (${placeholders})`;
    params.push(...orderIds);

    const result = await runQuery(sql, params);
    
    return {
      updated: result.changes,
      total: orderIds.length,
      status: status
    };
  }

  // Bulk cancel orders
  static async bulkCancel(orderIds, reason = null) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('IDs de pedidos inválidos');
    }

    // Check which orders can be cancelled
    const placeholders = orderIds.map(() => '?').join(',');
    const checkSql = `
      SELECT id, status 
      FROM orders 
      WHERE id IN (${placeholders}) 
        AND status NOT IN ('delivered', 'cancelled')
    `;
    
    const validOrders = await getAllRows(checkSql, orderIds);
    const validIds = validOrders.map(order => order.id);

    if (validIds.length === 0) {
      return {
        cancelled: 0,
        total: orderIds.length,
        errors: ['Nenhum pedido pode ser cancelado']
      };
    }

    // Cancel valid orders
    const notes = reason ? `Cancelado em massa: ${reason}` : 'Pedido cancelado em massa';
    const validPlaceholders = validIds.map(() => '?').join(',');
    const updateSql = `
      UPDATE orders 
      SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${validPlaceholders})
    `;

    const result = await runQuery(updateSql, [notes, ...validIds]);
    
    const errors = [];
    if (validIds.length < orderIds.length) {
      errors.push(`${orderIds.length - validIds.length} pedidos não puderam ser cancelados`);
    }

    return {
      cancelled: result.changes,
      total: orderIds.length,
      errors
    };
  }

  // Export orders data
  static async exportData(options = {}) {
    const { format = 'json', start_date, end_date, status, user_id } = options;

    let sql = `
      SELECT 
        o.id,
        o.user_id,
        u.name as user_name,
        u.email as user_email,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        o.shipping_address,
        o.notes,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (start_date) {
      sql += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (user_id) {
      sql += ' AND o.user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await getAllRows(sql, params);

    if (format === 'csv') {
      const headers = [
        'ID', 'User ID', 'User Name', 'User Email', 'Total Amount', 
        'Status', 'Payment Status', 'Payment Method', 'Shipping Address', 
        'Notes', 'Created At', 'Updated At'
      ];
      
      const csvRows = [headers.join(',')];
      
      orders.forEach(order => {
        const row = [
          order.id,
          order.user_id,
          `"${order.user_name || ''}"`,,
          `"${order.user_email || ''}"`,,
          order.total_amount,
          order.status,
          order.payment_status,
          order.payment_method,
          `"${order.shipping_address || ''}"`,,
          `"${order.notes || ''}"`,,
          order.created_at,
          order.updated_at
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }

    return orders;
  }
}

export default Order;