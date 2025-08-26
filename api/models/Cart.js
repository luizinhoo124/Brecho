import { runQuery, getRow, getAllRows } from '../config/database.js';

class Cart {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.product_id = data.product_id;
    this.quantity = data.quantity;
    this.created_at = data.created_at;
  }

  // Add item to cart
  static async addItem(userId, productId, quantity = 1) {
    // Check if product exists and is available
    const productSql = 'SELECT * FROM products WHERE id = ? AND status = "available"';
    const product = await getRow(productSql, [productId]);
    
    if (!product) {
      throw new Error('Produto não encontrado ou não disponível');
    }

    // Check if item already exists in cart
    const existingItem = await Cart.getItem(userId, productId);
    
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      // Check stock availability
      if (newQuantity > product.stock_quantity) {
        throw new Error('Quantidade solicitada excede o estoque disponível');
      }
      
      return await Cart.updateQuantity(userId, productId, newQuantity);
    } else {
      // Check stock availability
      if (quantity > product.stock_quantity) {
        throw new Error('Quantidade solicitada excede o estoque disponível');
      }
      
      // Add new item
      const sql = `
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES (?, ?, ?)
      `;
      
      await runQuery(sql, [userId, productId, quantity]);
      return await Cart.getItem(userId, productId);
    }
  }

  // Get specific cart item
  static async getItem(userId, productId) {
    const sql = `
      SELECT c.*, p.name as product_name, p.price, p.images as product_images,
             p.stock_quantity, p.status as product_status,
             u.name as seller_name
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE c.user_id = ? AND c.product_id = ?
    `;
    
    const row = await getRow(sql, [userId, productId]);
    if (!row) return null;

    const item = new Cart(row);
    item.product_name = row.product_name;
    item.price = row.price;
    item.stock_quantity = row.stock_quantity;
    item.product_status = row.product_status;
    item.seller_name = row.seller_name;
    
    // Parse product images
    if (row.product_images) {
      try {
        item.product_images = JSON.parse(row.product_images);
      } catch (e) {
        item.product_images = [];
      }
    } else {
      item.product_images = [];
    }
    
    return item;
  }

  // Get user's cart
  static async getByUser(userId) {
    const sql = `
      SELECT c.*, p.name as product_name, p.price, p.images as product_images,
             p.stock_quantity, p.status as product_status,
             u.name as seller_name, cat.name as category_name
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE c.user_id = ? AND p.status = 'available'
      ORDER BY c.created_at DESC
    `;
    
    const items = await getAllRows(sql, [userId]);
    
    const cartItems = items.map(row => {
      const item = new Cart(row);
      item.product_name = row.product_name;
      item.price = row.price;
      item.stock_quantity = row.stock_quantity;
      item.product_status = row.product_status;
      item.seller_name = row.seller_name;
      item.category_name = row.category_name;
      
      // Parse product images
      if (row.product_images) {
        try {
          item.product_images = JSON.parse(row.product_images);
        } catch (e) {
          item.product_images = [];
        }
      } else {
        item.product_images = [];
      }
      
      // Calculate item total
      item.item_total = item.price * item.quantity;
      
      return item;
    });

    // Calculate cart totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.item_total, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      items: cartItems,
      summary: {
        item_count: itemCount,
        subtotal: subtotal,
        total: subtotal // Can add shipping, taxes, etc. later
      }
    };
  }

  // Update item quantity
  static async updateQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return await Cart.removeItem(userId, productId);
    }

    // Check stock availability
    const productSql = 'SELECT stock_quantity FROM products WHERE id = ? AND status = "available"';
    const product = await getRow(productSql, [productId]);
    
    if (!product) {
      throw new Error('Produto não encontrado ou não disponível');
    }
    
    if (quantity > product.stock_quantity) {
      throw new Error('Quantidade solicitada excede o estoque disponível');
    }

    const sql = `
      UPDATE cart 
      SET quantity = ?
      WHERE user_id = ? AND product_id = ?
    `;
    
    await runQuery(sql, [quantity, userId, productId]);
    return await Cart.getItem(userId, productId);
  }

  // Remove item from cart
  static async removeItem(userId, productId) {
    const sql = 'DELETE FROM cart WHERE user_id = ? AND product_id = ?';
    const result = await runQuery(sql, [userId, productId]);
    return result.changes > 0;
  }

  // Clear user's cart
  static async clearCart(userId) {
    const sql = 'DELETE FROM cart WHERE user_id = ?';
    const result = await runQuery(sql, [userId]);
    return result.changes;
  }

  // Get cart item count
  static async getItemCount(userId) {
    const sql = `
      SELECT COALESCE(SUM(quantity), 0) as count
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ? AND p.status = 'available'
    `;
    
    const result = await getRow(sql, [userId]);
    return result.count;
  }

  // Get cart total
  static async getCartTotal(userId) {
    const sql = `
      SELECT COALESCE(SUM(p.price * c.quantity), 0) as total
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ? AND p.status = 'available'
    `;
    
    const result = await getRow(sql, [userId]);
    return result.total;
  }

  // Validate cart before checkout
  static async validateCart(userId) {
    const cart = await Cart.getByUser(userId);
    const errors = [];
    
    if (cart.items.length === 0) {
      errors.push('Carrinho está vazio');
      return { valid: false, errors };
    }
    
    for (const item of cart.items) {
      // Check if product is still available
      if (item.product_status !== 'available') {
        errors.push(`Produto "${item.product_name}" não está mais disponível`);
      }
      
      // Check stock quantity
      if (item.quantity > item.stock_quantity) {
        errors.push(`Quantidade solicitada para "${item.product_name}" excede o estoque (${item.stock_quantity} disponível)`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      cart
    };
  }

  // Move cart to order (during checkout)
  static async moveToOrder(userId, orderId) {
    // This would typically be called after creating an order
    // to remove items from cart that were purchased
    const cartItems = await Cart.getByUser(userId);
    
    // Clear the cart
    await Cart.clearCart(userId);
    
    return cartItems;
  }

  // Check if product is in user's cart
  static async isInCart(userId, productId) {
    const sql = 'SELECT 1 FROM cart WHERE user_id = ? AND product_id = ?';
    const result = await getRow(sql, [userId, productId]);
    return !!result;
  }

  // Get cart statistics (admin)
  static async getStats() {
    const queries = {
      total_carts: 'SELECT COUNT(DISTINCT user_id) as count FROM cart',
      total_items: 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart',
      average_items_per_cart: `
        SELECT COALESCE(AVG(item_count), 0) as avg
        FROM (
          SELECT COUNT(*) as item_count
          FROM cart
          GROUP BY user_id
        )
      `,
      abandoned_carts: `
        SELECT COUNT(DISTINCT c.user_id) as count
        FROM cart c
        WHERE c.created_at < datetime('now', '-7 days')
      `
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await getRow(query);
      results[key] = result.count || result.avg || 0;
    }

    return results;
  }

  // Clean up old cart items (maintenance)
  static async cleanupOldItems(daysOld = 30) {
    const sql = `
      DELETE FROM cart 
      WHERE created_at < datetime('now', '-${daysOld} days')
    `;
    
    const result = await runQuery(sql);
    return result.changes;
  }

  // Get popular cart items
  static async getPopularItems(limit = 10) {
    const sql = `
      SELECT p.id, p.name, p.price, p.images,
             COUNT(c.product_id) as times_added,
             SUM(c.quantity) as total_quantity
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE p.status = 'available'
      GROUP BY c.product_id
      ORDER BY times_added DESC, total_quantity DESC
      LIMIT ?
    `;
    
    const items = await getAllRows(sql, [limit]);
    
    return items.map(item => {
      if (item.images) {
        try {
          item.images = JSON.parse(item.images);
        } catch (e) {
          item.images = [];
        }
      } else {
        item.images = [];
      }
      return item;
    });
  }

  // Get all user carts (admin)
  static async getAllCarts(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT u.id as user_id, u.name as user_name, u.email,
             COUNT(c.id) as item_count,
             COALESCE(SUM(p.price * c.quantity), 0) as total_value,
             MAX(c.created_at) as last_updated
      FROM users u
      LEFT JOIN cart c ON u.id = c.user_id
      LEFT JOIN products p ON c.product_id = p.id AND p.status = 'available'
      WHERE EXISTS (SELECT 1 FROM cart WHERE user_id = u.id)
      GROUP BY u.id, u.name, u.email
      ORDER BY last_updated DESC
      LIMIT ? OFFSET ?
    `;
    
    const countSql = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE EXISTS (SELECT 1 FROM cart WHERE user_id = u.id)
    `;
    
    const [carts, countResult] = await Promise.all([
      getAllRows(sql, [limit, offset]),
      getRow(countSql)
    ]);
    
    return {
      carts,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }
}

export default Cart;