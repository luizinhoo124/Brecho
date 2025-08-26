import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '../../database.sqlite');

// Create database connection
export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('📦 Connected to SQLite database');
  }
});

// Initialize database tables
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          avatar TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          original_price DECIMAL(10,2),
          category_id INTEGER,
          brand TEXT,
          size TEXT,
          condition TEXT,
          color TEXT,
          material TEXT,
          images TEXT, -- JSON array of image URLs
          stock INTEGER DEFAULT 1,
          status TEXT DEFAULT 'available',
          seller_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (seller_id) REFERENCES users(id)
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          shipping_address TEXT,
          payment_method TEXT,
          payment_status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Cart table
      db.run(`
        CREATE TABLE IF NOT EXISTS cart (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Insert default categories
      const categories = [
        { name: 'Vestidos', description: 'Vestidos femininos de segunda mão' },
        { name: 'Camisetas', description: 'Camisetas e tops' },
        { name: 'Calças', description: 'Calças e jeans' },
        { name: 'Sapatos', description: 'Calçados femininos e masculinos' },
        { name: 'Acessórios', description: 'Bolsas, joias e acessórios' },
        { name: 'Casacos', description: 'Jaquetas e casacos' }
      ];

      const insertCategory = db.prepare(`
        INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)
      `);

      categories.forEach(category => {
        insertCategory.run(category.name, category.description);
      });

      insertCategory.finalize();

      // Create admin user if not exists
      db.get('SELECT id FROM users WHERE email = ?', ['admin@ecofashion.com'], (err, row) => {
        if (err) {
          console.error('Error checking admin user:', err);
          reject(err);
        } else if (!row) {
          // Create default admin user (password: admin123)
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          
          db.run(`
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
          `, ['Admin', 'admin@ecofashion.com', hashedPassword, 'admin'], (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
              reject(err);
            } else {
              console.log('✅ Default admin user created (email: admin@ecofashion.com, password: admin123)');
              resolve();
            }
          });
        } else {
          console.log('✅ Database initialized successfully');
          resolve();
        }
      });
    });
  });
};

// Helper function to run queries with promises
export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper function to get single row
export const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper function to get all rows
export const getAllRows = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export default db;