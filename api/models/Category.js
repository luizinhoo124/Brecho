import { runQuery, getRow, getAllRows } from '../config/database.js';

class Category {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.image = data.image;
    this.created_at = data.created_at;
  }

  // Create a new category
  static async create(categoryData) {
    const { name, description, image } = categoryData;

    // Check if category already exists
    const existingCategory = await Category.findByName(name);
    if (existingCategory) {
      throw new Error('Categoria já existe');
    }

    const sql = `
      INSERT INTO categories (name, description, image)
      VALUES (?, ?, ?)
    `;

    const result = await runQuery(sql, [name, description, image]);
    return await Category.findById(result.id);
  }

  // Find category by ID
  static async findById(id) {
    const sql = 'SELECT * FROM categories WHERE id = ?';
    const row = await getRow(sql, [id]);
    return row ? new Category(row) : null;
  }

  // Find category by name
  static async findByName(name) {
    const sql = 'SELECT * FROM categories WHERE name = ?';
    const row = await getRow(sql, [name]);
    return row ? new Category(row) : null;
  }

  // Get all categories
  static async findAll() {
    const sql = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'available'
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const rows = await getAllRows(sql);
    return rows.map(row => ({
      ...new Category(row),
      product_count: row.product_count
    }));
  }

  // Update category
  static async update(id, updateData) {
    const allowedFields = ['name', 'description', 'image'];
    const updates = [];
    const params = [];

    // Check if name is being updated and if it already exists
    if (updateData.name) {
      const existingCategory = await Category.findByName(updateData.name);
      if (existingCategory && existingCategory.id !== parseInt(id)) {
        throw new Error('Nome da categoria já está em uso');
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

    params.push(id);
    const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);

    return await Category.findById(id);
  }

  // Delete category
  static async delete(id) {
    // Check if category has products
    const productCountSql = 'SELECT COUNT(*) as count FROM products WHERE category_id = ?';
    const productCount = await getRow(productCountSql, [id]);
    
    if (productCount.count > 0) {
      throw new Error('Não é possível excluir categoria que possui produtos');
    }

    const sql = 'DELETE FROM categories WHERE id = ?';
    const result = await runQuery(sql, [id]);
    return result.changes > 0;
  }

  // Get category with products
  static async findWithProducts(id, options = {}) {
    const { page = 1, limit = 12 } = options;
    const offset = (page - 1) * limit;

    // Get category
    const category = await Category.findById(id);
    if (!category) return null;

    // Get products in this category
    const productsSql = `
      SELECT p.*, u.name as seller_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.category_id = ? AND p.status = 'available'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const products = await getAllRows(productsSql, [id, limit, offset]);
    
    // Parse images for each product
    const parsedProducts = products.map(product => {
      if (product.images) {
        try {
          product.images = JSON.parse(product.images);
        } catch (e) {
          product.images = [];
        }
      } else {
        product.images = [];
      }
      return product;
    });

    // Get total count for pagination
    const countSql = 'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND status = "available"';
    const countResult = await getRow(countSql, [id]);
    const total = countResult.total;

    return {
      category,
      products: parsedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get popular categories (by product count)
  static async getPopular(limit = 6) {
    const sql = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'available'
      GROUP BY c.id
      HAVING product_count > 0
      ORDER BY product_count DESC
      LIMIT ?
    `;

    const rows = await getAllRows(sql, [limit]);
    return rows.map(row => ({
      ...new Category(row),
      product_count: row.product_count
    }));
  }

  // Get category statistics
  static async getStats() {
    const totalCategoriesSql = 'SELECT COUNT(*) as total FROM categories';
    const categoriesWithProductsSql = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM categories c
      INNER JOIN products p ON c.id = p.category_id
      WHERE p.status = 'available'
    `;

    const [totalCategories, categoriesWithProducts] = await Promise.all([
      getRow(totalCategoriesSql),
      getRow(categoriesWithProductsSql)
    ]);

    return {
      total_categories: totalCategories.total,
      categories_with_products: categoriesWithProducts.total
    };
  }

  // Check if category exists
  static async exists(id) {
    const sql = 'SELECT 1 FROM categories WHERE id = ?';
    const result = await getRow(sql, [id]);
    return !!result;
  }

  // Search categories
  static async search(query) {
    const sql = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'available'
      WHERE c.name LIKE ? OR c.description LIKE ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const searchTerm = `%${query}%`;
    const rows = await getAllRows(sql, [searchTerm, searchTerm]);
    
    return rows.map(row => ({
      ...new Category(row),
      product_count: row.product_count
    }));
  }

  // Bulk create categories
  static async bulkCreate(categoriesData) {
    const results = [];
    const errors = [];

    for (let i = 0; i < categoriesData.length; i++) {
      try {
        const category = await Category.create(categoriesData[i]);
        results.push(category);
      } catch (error) {
        errors.push({
          index: i,
          data: categoriesData[i],
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors,
      total: categoriesData.length,
      created: results.length,
      failed: errors.length
    };
  }

  // Bulk update categories
  static async bulkUpdate(updates) {
    const results = [];
    const errors = [];

    for (let i = 0; i < updates.length; i++) {
      try {
        const { id, ...updateData } = updates[i];
        const category = await Category.update(id, updateData);
        results.push(category);
      } catch (error) {
        errors.push({
          index: i,
          data: updates[i],
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors,
      total: updates.length,
      updated: results.length,
      failed: errors.length
    };
  }

  // Bulk delete categories
  static async bulkDelete(ids) {
    const results = [];
    const errors = [];

    for (let i = 0; i < ids.length; i++) {
      try {
        const deleted = await Category.delete(ids[i]);
        if (deleted) {
          results.push(ids[i]);
        } else {
          errors.push({
            index: i,
            id: ids[i],
            error: 'Categoria não encontrada'
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          id: ids[i],
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors,
      total: ids.length,
      deleted: results.length,
      failed: errors.length
    };
  }
}

export default Category;