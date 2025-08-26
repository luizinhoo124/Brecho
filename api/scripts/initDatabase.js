import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { initDatabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDB() {
  try {
    console.log('🚀 Inicializando banco de dados...');
    
    // Criar diretórios necessários
    const uploadsDir = join(process.cwd(), 'uploads');
    const productsDir = join(uploadsDir, 'products');
    const categoriesDir = join(uploadsDir, 'categories');
    const logsDir = join(process.cwd(), 'logs');
    
    // Criar diretórios se não existirem
    [uploadsDir, productsDir, categoriesDir, logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Diretório criado: ${dir}`);
      }
    });
    
    // Inicializar banco de dados
    await initDatabase();
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Tabelas criadas: users, categories, products, orders, order_items, cart');
    console.log('👤 Usuário administrador padrão criado');
    console.log('🏷️ Categorias padrão inseridas');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initDB();
}

export default initDB;