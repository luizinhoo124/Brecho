import { runQuery, getRow, getAllRows } from '../config/database.js';

class Product {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.original_price = data.original_price;
    this.category_id = data.category_id;
    this.brand = data.brand;
    this.size = data.size;
    this.condition = data.condition;
    this.color = data.color;
    this.material = data.material;
    this.images = data.images;
    this.stock = data.stock;
    this.status = data.status;
    this.seller_id = data.seller_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new product
  static async create(productData) {
    const {
      name, description, price, original_price, category_id,
      brand, size, condition, color, material, images,
      stock = 1, seller_id
    } = productData;

    const sql = `
      INSERT INTO products (
        name, description, price, original_price, category_id,
        brand, size, condition, color, material, images,
        stock, seller_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;

    const result = await runQuery(sql, [
      name, description, price, original_price, category_id,
      brand, size, condition, color, material, imagesJson,
      stock, seller_id
    ]);

    return await Product.findById(result.id);
  }

  // Find product by ID
  static async findById(id) {
    const sql = `
      SELECT p.*, c.name as category_name, u.name as seller_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.id = ?
    `;

    const row = await getRow(sql, [id]);
    if (!row) return null;

    // Parse images JSON
    if (row.images) {
      try {
        row.images = JSON.parse(row.images);
      } catch (e) {
        row.images = [];
      }
    } else {
      row.images = [];
    }

    return new Product(row);
  }

  // Find all products with filters and pagination
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 12,
      category_id,
      search,
      min_price,
      max_price,
      condition,
      status = 'available',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['p.status = ?'];
    let params = [status];

    // Build WHERE conditions
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (min_price) {
      whereConditions.push('p.price >= ?');
      params.push(min_price);
    }

    if (max_price) {
      whereConditions.push('p.price <= ?');
      params.push(max_price);
    }

    if (condition) {
      whereConditions.push('p.condition = ?');
      params.push(condition);
    }

    const whereClause = whereConditions.join(' AND ');

    // Valid sort columns
    const validSortColumns = ['created_at', 'price', 'name'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT p.*, c.name as category_name, u.name as seller_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE ${whereClause}
      ORDER BY p.${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const rows = await getAllRows(sql, params);

    // Parse images for each product
    const products = rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          row.images = [];
        }
      } else {
        row.images = [];
      }
      return new Product(row);
    });

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await getRow(countSql, countParams);
    const total = countResult.total;

    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update product
  static async update(id, productData, sellerId = null) {
    try {
      const { name, description, price, category_id, condition, size, color, images } = productData;
      
      // Build the WHERE clause
      let whereClause = 'id = ?';
      let params = [name, description, price, category_id, condition, size, color, JSON.stringify(images), id];
      
      if (sellerId) {
        whereClause += ' AND seller_id = ?';
        params.push(sellerId);
      }
      
      const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, category_id = ?, 
            condition = ?, size = ?, color = ?, images = ?, updated_at = CURRENT_TIMESTAMP
        WHERE ${whereClause}
      `;
      
      const result = await runQuery(query, params);
      
      if (result.changes === 0) {
        throw new Error('Produto não encontrado ou você não tem permissão para editá-lo');
      }
      
      return await Product.findById(id);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Get product statistics
  static async getStats() {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM products';
      const categoryQuery = `
        SELECT c.name as category, COUNT(p.id) as count 
        FROM categories c 
        LEFT JOIN products p ON c.id = p.category_id 
        GROUP BY c.id, c.name
      `;
      const conditionQuery = `
        SELECT condition, COUNT(*) as count 
        FROM products 
        GROUP BY condition
      `;
      const priceRangeQuery = `
        SELECT 
          CASE 
            WHEN price < 50 THEN 'Até R$ 50'
            WHEN price < 100 THEN 'R$ 50 - R$ 100'
            WHEN price < 200 THEN 'R$ 100 - R$ 200'
            ELSE 'Acima de R$ 200'
          END as price_range,
          COUNT(*) as count
        FROM products
        GROUP BY price_range
      `;
      
      const [total, byCategory, byCondition, byPriceRange] = await Promise.all([
        getRow(totalQuery),
        getAllRows(categoryQuery),
        getAllRows(conditionQuery),
        getAllRows(priceRangeQuery)
      ]);
      
      return {
        total: total.total,
        by_category: byCategory,
        by_condition: byCondition,
        by_price_range: byPriceRange
      };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw error;
    }
  }

  // Bulk update products
  static async bulkUpdate(productIds, updateData) {
    try {
      const { price, condition, category_id } = updateData;
      const setParts = [];
      const params = [];
      
      if (price !== undefined) {
        setParts.push('price = ?');
        params.push(price);
      }
      if (condition !== undefined) {
        setParts.push('condition = ?');
        params.push(condition);
      }
      if (category_id !== undefined) {
        setParts.push('category_id = ?');
        params.push(category_id);
      }
      
      if (setParts.length === 0) {
        throw new Error('Nenhum campo para atualizar foi fornecido');
      }
      
      setParts.push('updated_at = CURRENT_TIMESTAMP');
      
      const placeholders = productIds.map(() => '?').join(',');
      params.push(...productIds);
      
      const query = `
        UPDATE products 
        SET ${setParts.join(', ')}
        WHERE id IN (${placeholders})
      `;
      
      const result = await runQuery(query, params);
      
      return {
        updated: result.changes,
        product_ids: productIds
      };
    } catch (error) {
      console.error('Error bulk updating products:', error);
      throw error;
    }
  }

  // Bulk delete products
  static async bulkDelete(productIds) {
    try {
      const placeholders = productIds.map(() => '?').join(',');
      const query = `DELETE FROM products WHERE id IN (${placeholders})`;
      
      const result = await runQuery(query, productIds);
      
      return {
        deleted: result.changes,
        product_ids: productIds
      };
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      throw error;
    }
  }

  // Bulk create products
  static async bulkCreate(products, sellerId) {
    try {
      const created = [];
      const errors = [];
      
      for (let i = 0; i < products.length; i++) {
        try {
          const productData = {
            ...products[i],
            seller_id: sellerId
          };
          
          const product = await Product.create(productData);
          created.push(product);
        } catch (error) {
          errors.push({
            index: i,
            product: products[i],
            error: error.message
          });
        }
      }
      
      return {
        created: created.length,
        errors: errors.length,
        products: created,
        failed: errors
      };
    } catch (error) {
      console.error('Error bulk creating products:', error);
      throw error;
    }
  }

  // Delete product
  static async delete(id) {
    const sql = 'DELETE FROM products WHERE id = ?';
    const result = await runQuery(sql, [id]);
    return result.changes > 0;
  }

  // Find products by seller
  static async findBySeller(sellerId, options = {}) {
    const { page = 1, limit = 12 } = options;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await getAllRows(sql, [sellerId, limit, offset]);
    const products = rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          row.images = [];
        }
      } else {
        row.images = [];
      }
      return new Product(row);
    });

    return products;
  }

  // Get featured products
  static async getFeatured(limit = 8) {
    const sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'available' AND p.stock > 0
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    const rows = await getAllRows(sql, [limit]);
    return rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          row.images = [];
        }
      } else {
        row.images = [];
      }
      return new Product(row);
    });
  }

  // Update stock
  static async updateStock(id, quantity) {
    const sql = 'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await runQuery(sql, [quantity, id]);
    return result.changes > 0;
  }

  // Check if product is available
  static async isAvailable(id, quantity = 1) {
    const product = await Product.findById(id);
    return product && product.status === 'available' && product.stock >= quantity;
  }
}

export default Product;