import bcrypt from 'bcryptjs';
import { runQuery, getRow, getAllRows } from '../config/database.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.role = data.role;
    this.avatar = data.avatar;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    // Never expose password
  }

  // Create a new user
  static async create(userData) {
    const { name, email, password, role = 'user' } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, password, role, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const result = await runQuery(sql, [name, email, hashedPassword, role]);
    return await User.findById(result.id);
  }

  // Find user by ID
  static async findById(id) {
    const sql = 'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE id = ?';
    const row = await getRow(sql, [id]);
    return row ? new User(row) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = 'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE email = ?';
    const row = await getRow(sql, [email]);
    return row ? new User(row) : null;
  }

  // Find user by email with password (for authentication)
  static async findByEmailWithPassword(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = await getRow(sql, [email]);
    return row;
  }

  // Authenticate user
  static async authenticate(email, password) {
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new Error('Email ou senha inválidos');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Email ou senha inválidos');
    }

    // Return user without password
    return new User(user);
  }

  // Update user
  static async update(id, updateData) {
    const allowedFields = ['name', 'email', 'avatar'];
    const updates = [];
    const params = [];

    // Check if email is being updated and if it's already in use
    if (updateData.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        throw new Error('Email já está em uso');
      }
    }

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);

    return await User.findById(id);
  }

  // Update password
  static async updatePassword(id, currentPassword, newPassword) {
    // Get user with password
    const sql = 'SELECT * FROM users WHERE id = ?';
    const user = await getRow(sql, [id]);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateSql = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await runQuery(updateSql, [hashedPassword, id]);

    return true;
  }

  // Delete user
  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    const result = await runQuery(sql, [id]);
    return result.changes > 0;
  }

  // Get all users (admin only)
  static async findAll(options = {}) {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE name LIKE ? OR email LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const sql = `
      SELECT id, name, email, role, avatar, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const rows = await getAllRows(sql, params);
    const users = rows.map(row => new User(row));

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countParams = search ? [searchTerm, searchTerm] : [];
    const countResult = await getRow(countSql, countParams);
    const total = countResult.total;

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update user role (admin only)
  static async updateRole(id, role) {
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error('Role inválido');
    }

    const sql = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await runQuery(sql, [role, id]);
    
    if (result.changes === 0) {
      throw new Error('Usuário não encontrado');
    }

    return await User.findById(id);
  }

  // Get user statistics
  static async getStats() {
    const totalUsersSql = 'SELECT COUNT(*) as total FROM users WHERE role = "user"';
    const totalAdminsSql = 'SELECT COUNT(*) as total FROM users WHERE role = "admin"';
    const recentUsersSql = `
      SELECT COUNT(*) as total FROM users 
      WHERE created_at >= datetime('now', '-30 days')
    `;

    const [totalUsers, totalAdmins, recentUsers] = await Promise.all([
      getRow(totalUsersSql),
      getRow(totalAdminsSql),
      getRow(recentUsersSql)
    ]);

    return {
      total_users: totalUsers.total,
      total_admins: totalAdmins.total,
      recent_users: recentUsers.total
    };
  }

  // Check if user exists
  static async exists(id) {
    const sql = 'SELECT 1 FROM users WHERE id = ?';
    const result = await getRow(sql, [id]);
    return !!result;
  }

  // Get user profile with additional info
  static async getProfile(id) {
    const user = await User.findById(id);
    if (!user) return null;

    // Get user's product count
    const productCountSql = 'SELECT COUNT(*) as count FROM products WHERE seller_id = ?';
    const productCount = await getRow(productCountSql, [id]);

    // Get user's order count
    const orderCountSql = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
    const orderCount = await getRow(orderCountSql, [id]);

    return {
      ...user,
      stats: {
        products_count: productCount.count,
        orders_count: orderCount.count
      }
    };
  }

  // Get comprehensive statistics (admin)
  static async getStatistics() {
    const totalUsersSql = 'SELECT COUNT(*) as total FROM users';
    const totalCustomersSql = 'SELECT COUNT(*) as total FROM users WHERE role = "customer"';
    const totalSellersSql = 'SELECT COUNT(*) as total FROM users WHERE role = "seller"';
    const totalAdminsSql = 'SELECT COUNT(*) as total FROM users WHERE role = "admin"';
    const recentUsersSql = `
      SELECT COUNT(*) as total FROM users 
      WHERE created_at >= datetime('now', '-30 days')
    `;
    const activeUsersSql = `
      SELECT COUNT(DISTINCT user_id) as total FROM orders 
      WHERE created_at >= datetime('now', '-30 days')
    `;

    const [totalUsers, totalCustomers, totalSellers, totalAdmins, recentUsers, activeUsers] = await Promise.all([
      getRow(totalUsersSql),
      getRow(totalCustomersSql),
      getRow(totalSellersSql),
      getRow(totalAdminsSql),
      getRow(recentUsersSql),
      getRow(activeUsersSql)
    ]);

    return {
      total_users: totalUsers.total,
      total_customers: totalCustomers.total,
      total_sellers: totalSellers.total,
      total_admins: totalAdmins.total,
      recent_users: recentUsers.total,
      active_users: activeUsers.total
    };
  }

  // Get user-specific stats
  static async getUserStats(userId) {
    const productCountSql = 'SELECT COUNT(*) as count FROM products WHERE seller_id = ?';
    const orderCountSql = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
    const totalSpentSql = 'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = ? AND status = "completed"';
    const cartItemsSql = 'SELECT COUNT(*) as count FROM cart WHERE user_id = ?';

    const [productCount, orderCount, totalSpent, cartItems] = await Promise.all([
      getRow(productCountSql, [userId]),
      getRow(orderCountSql, [userId]),
      getRow(totalSpentSql, [userId]),
      getRow(cartItemsSql, [userId])
    ]);

    return {
      products_count: productCount.count,
      orders_count: orderCount.count,
      total_spent: totalSpent.total,
      cart_items: cartItems.count
    };
  }

  // Search users with filters
  static async search(filters = {}, pagination = {}) {
    const { search, role } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT id, name, email, role, avatar, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const rows = await getAllRows(sql, params);
    const users = rows.map(row => new User(row));

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await getRow(countSql, countParams);
    const total = countResult.total;

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Bulk update users
  static async bulkUpdate(userIds, updateData) {
    if (!userIds || userIds.length === 0) {
      throw new Error('IDs dos usuários são obrigatórios');
    }

    const allowedFields = ['role', 'name', 'email'];
    const updates = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    const placeholders = userIds.map(() => '?').join(',');
    params.push(...userIds);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id IN (${placeholders})`;
    const result = await runQuery(sql, params);

    return {
      updated: result.changes,
      user_ids: userIds
    };
  }

  // Bulk delete users
  static async bulkDelete(userIds) {
    if (!userIds || userIds.length === 0) {
      throw new Error('IDs dos usuários são obrigatórios');
    }

    const placeholders = userIds.map(() => '?').join(',');
    const sql = `DELETE FROM users WHERE id IN (${placeholders})`;
    const result = await runQuery(sql, userIds);

    return {
      deleted: result.changes,
      user_ids: userIds
    };
  }

  // Get user activity (simplified - would need activity logging table in real app)
  static async getActivity(userId, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    // For now, we'll return order history as activity
    const sql = `
      SELECT 
        'order' as activity_type,
        id as activity_id,
        'Pedido realizado' as description,
        total_amount as amount,
        status,
        created_at
      FROM orders 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await getAllRows(sql, [userId, limit, offset]);

    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countResult = await getRow(countSql, [userId]);
    const total = countResult.total;

    return {
      activities: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

export default User;