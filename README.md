# EcoFashion - Brechó Online

Um sistema completo de e-commerce para brechó online, focado em moda sustentável e economia circular.

## 🚀 Funcionalidades

### Frontend
- Interface responsiva e moderna
- Catálogo de produtos com filtros
- Sistema de carrinho de compras
- Autenticação de usuários
- Perfil do usuário e histórico de pedidos

### Backend
- API RESTful completa
- Autenticação JWT
- Upload de imagens
- Sistema de categorias
- Gerenciamento de produtos
- Painel administrativo
- Banco de dados SQLite

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5, CSS3, JavaScript
- Design responsivo
- Fetch API para comunicação com backend

### Backend
- Node.js + Express.js
- SQLite (banco de dados)
- JWT (autenticação)
- Multer (upload de arquivos)
- bcryptjs (hash de senhas)
- CORS, Helmet (segurança)

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm (versão 8 ou superior)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd brecho
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas configurações.

4. **Inicialize o banco de dados**
```bash
npm run db:init
```

5. **Popule o banco com dados iniciais (opcional)**
```bash
npm run db:seed
```

## 🚀 Executando o Projeto

### Desenvolvimento

**Executar backend e frontend simultaneamente:**
```bash
npm run dev:all
```

**Executar apenas o backend:**
```bash
npm run dev:backend
```

**Executar apenas o frontend:**
```bash
npm run dev:frontend
```

### Produção
```bash
npm start
```

## 📚 Documentação da API

### Endpoints Principais

#### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token

#### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Obter produto por ID
- `POST /api/products` - Criar produto (autenticado)
- `PUT /api/products/:id` - Atualizar produto (autenticado)
- `DELETE /api/products/:id` - Deletar produto (autenticado)

#### Categorias
- `GET /api/categories` - Listar categorias
- `GET /api/categories/:id` - Obter categoria por ID
- `POST /api/categories` - Criar categoria (admin)
- `PUT /api/categories/:id` - Atualizar categoria (admin)
- `DELETE /api/categories/:id` - Deletar categoria (admin)

#### Usuários
- `GET /api/users/profile` - Obter perfil (autenticado)
- `PUT /api/users/profile` - Atualizar perfil (autenticado)
- `POST /api/users/change-password` - Alterar senha (autenticado)

#### Carrinho
- `GET /api/cart` - Obter carrinho (autenticado)
- `POST /api/cart/add` - Adicionar item (autenticado)
- `PUT /api/cart/update` - Atualizar item (autenticado)
- `DELETE /api/cart/remove/:id` - Remover item (autenticado)

#### Pedidos
- `GET /api/orders` - Listar pedidos (autenticado)
- `GET /api/orders/:id` - Obter pedido por ID (autenticado)
- `POST /api/orders` - Criar pedido (autenticado)

### Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```
Authorization: Bearer <seu-token-jwt>
```

### Upload de Imagens

Para upload de imagens, use `multipart/form-data`:

```javascript
const formData = new FormData();
formData.append('name', 'Nome do Produto');
formData.append('images', file1);
formData.append('images', file2);

fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

## 🗂️ Estrutura do Projeto

```
brecho/
├── api/                    # Backend
│   ├── config/            # Configurações
│   ├── controllers/       # Controladores
│   ├── middleware/        # Middlewares
│   ├── models/           # Modelos de dados
│   ├── routes/           # Rotas da API
│   ├── scripts/          # Scripts utilitários
│   └── server.js         # Servidor principal
├── admin/                 # Painel administrativo
├── uploads/              # Arquivos enviados
├── index.html            # Frontend principal
├── script.js             # JavaScript do frontend
├── styles.css            # Estilos CSS
└── package.json          # Dependências
```

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- Tokens JWT com expiração
- Validação de entrada
- Rate limiting
- CORS configurado
- Headers de segurança (Helmet)
- Sanitização de dados

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento
- `npm run dev:all` - Inicia backend e frontend
- `npm run db:init` - Inicializa o banco de dados
- `npm run db:seed` - Popula o banco com dados de teste
- `npm run db:reset` - Reseta o banco de dados
- `npm run admin:create` - Cria usuário administrador
- `npm test` - Executa testes
- `npm run lint` - Verifica qualidade do código

## 🌱 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se todas as dependências estão instaladas
2. Confirme se o arquivo `.env` está configurado corretamente
3. Verifique se o banco de dados foi inicializado
4. Consulte os logs do servidor para erros específicos

## 🔄 Atualizações Futuras

- [ ] Sistema de pagamento
- [ ] Notificações em tempo real
- [ ] Chat entre usuários
- [ ] Sistema de avaliações
- [ ] Integração com redes sociais
- [ ] App mobile
- [ ] Análise de dados e relatórios

---

**EcoFashion** - Promovendo moda sustentável através da economia circular 🌱