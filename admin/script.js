// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Global variables
let authToken = localStorage.getItem('admin_token');
let currentUser = null;
let currentEditingProduct = null;
let currentEditingCategory = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const productModal = document.getElementById('product-modal');
const categoryModal = document.getElementById('category-modal');
const loginForm = document.getElementById('login-form');
const productForm = document.getElementById('product-form');
categoryForm = document.getElementById('category-form');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    if (authToken) {
        validateToken();
    } else {
        showLoginModal();
    }
}

function setupEventListeners() {
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', handleMenuClick);
    });

    // Sidebar toggle
    document.querySelector('.sidebar-toggle')?.addEventListener('click', toggleSidebar);

    // Modal controls
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    productForm.addEventListener('submit', handleProductSubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);

    // Button clicks
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
    document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
    document.getElementById('logout').addEventListener('click', handleLogout);

    // Modal backdrop clicks
    [loginModal, productModal, categoryModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });
}

// Authentication functions
async function validateToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.data;
            document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
            hideLoginModal();
            loadDashboard();
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Token validation failed:', error);
        authToken = null;
        localStorage.removeItem('admin_token');
        showLoginModal();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            localStorage.setItem('admin_token', authToken);
            document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
            hideLoginModal();
            loadDashboard();
            showNotification('Login realizado com sucesso!', 'success');
        } else {
            showNotification(data.message || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Erro de conexão', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('admin_token');
    showLoginModal();
    showNotification('Logout realizado com sucesso!', 'success');
}

// Modal functions
function showLoginModal() {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideLoginModal() {
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openProductModal(product = null) {
    currentEditingProduct = product;
    const title = document.getElementById('product-modal-title');
    
    if (product) {
        title.textContent = 'Editar Produto';
        fillProductForm(product);
    } else {
        title.textContent = 'Adicionar Produto';
        productForm.reset();
    }
    
    loadCategoriesForSelect();
    productModal.classList.add('active');
}

function openCategoryModal(category = null) {
    currentEditingCategory = category;
    const title = document.getElementById('category-modal-title');
    
    if (category) {
        title.textContent = 'Editar Categoria';
        fillCategoryForm(category);
    } else {
        title.textContent = 'Adicionar Categoria';
        categoryForm.reset();
    }
    
    categoryModal.classList.add('active');
}

function closeModals() {
    [loginModal, productModal, categoryModal].forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Navigation functions
function handleMenuClick(e) {
    e.preventDefault();
    
    const section = e.currentTarget.dataset.section;
    if (!section) return;
    
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        products: 'Produtos',
        categories: 'Categorias',
        orders: 'Pedidos',
        users: 'Usuários'
    };
    document.getElementById('page-title').textContent = titles[section];
    
    // Show corresponding section
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Load section data
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// Dashboard functions
async function loadDashboard() {
    try {
        // Load statistics
        const [productsRes, ordersRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/products/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE_URL}/orders/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE_URL}/users/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const [productsData, ordersData, usersData] = await Promise.all([
            productsRes.json(),
            ordersRes.json(),
            usersRes.json()
        ]);

        // Update dashboard stats
        document.getElementById('total-products').textContent = productsData.data?.total || 0;
        document.getElementById('total-orders').textContent = ordersData.data?.total || 0;
        document.getElementById('total-users').textContent = usersData.data?.total || 0;
        document.getElementById('total-revenue').textContent = 
            `R$ ${(ordersData.data?.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Products functions
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayProducts(data.data);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Erro ao carregar produtos', 'error');
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('products-tbody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category_name || 'Sem categoria'}</td>
            <td>R$ ${parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>${product.stock || 0}</td>
            <td><span class="status-badge ${product.stock > 0 ? 'status-active' : 'status-inactive'}">
                ${product.stock > 0 ? 'Em estoque' : 'Sem estoque'}
            </span></td>
            <td>
                <button class="btn btn-warning" onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        category_id: parseInt(formData.get('category_id')),
        stock: parseInt(formData.get('stock')),
        brand: formData.get('brand')
    };
    
    try {
        const url = currentEditingProduct 
            ? `${API_BASE_URL}/products/${currentEditingProduct.id}`
            : `${API_BASE_URL}/products`;
        
        const method = currentEditingProduct ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(
                currentEditingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!',
                'success'
            );
            closeModals();
            loadProducts();
        } else {
            showNotification(data.message || 'Erro ao salvar produto', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Erro de conexão', 'error');
    }
}

function fillProductForm(product) {
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price || '';
    document.getElementById('product-category').value = product.category_id || '';
    document.getElementById('product-stock').value = product.stock || '';
    document.getElementById('product-brand').value = product.brand || '';
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Produto excluído com sucesso!', 'success');
            loadProducts();
        } else {
            showNotification(data.message || 'Erro ao excluir produto', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Erro de conexão', 'error');
    }
}

// Categories functions
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        if (data.success) {
            displayCategories(data.data);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Erro ao carregar categorias', 'error');
    }
}

function displayCategories(categories) {
    const tbody = document.getElementById('categories-tbody');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma categoria encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>${category.id}</td>
            <td>${category.name}</td>
            <td>${category.description || 'Sem descrição'}</td>
            <td>${category.product_count || 0}</td>
            <td>
                <button class="btn btn-warning" onclick="openCategoryModal(${JSON.stringify(category).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(categoryForm);
    const categoryData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    try {
        const url = currentEditingCategory 
            ? `${API_BASE_URL}/categories/${currentEditingCategory.id}`
            : `${API_BASE_URL}/categories`;
        
        const method = currentEditingCategory ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(categoryData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(
                currentEditingCategory ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!',
                'success'
            );
            closeModals();
            loadCategories();
        } else {
            showNotification(data.message || 'Erro ao salvar categoria', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Erro de conexão', 'error');
    }
}

function fillCategoryForm(category) {
    document.getElementById('category-name').value = category.name || '';
    document.getElementById('category-description').value = category.description || '';
}

async function deleteCategory(categoryId) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Categoria excluída com sucesso!', 'success');
            loadCategories();
        } else {
            showNotification(data.message || 'Erro ao excluir categoria', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function loadCategoriesForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('product-category');
            select.innerHTML = '<option value="">Selecione uma categoria</option>';
            
            data.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories for select:', error);
    }
}

// Orders functions
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.data);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Erro ao carregar pedidos', 'error');
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-tbody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum pedido encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.user_name || order.user_email}</td>
            <td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
            <td>R$ ${parseFloat(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                <button class="btn btn-warning" onclick="viewOrder(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Users functions
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Erro ao carregar usuários', 'error');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name || 'Não informado'}</td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.role === 'admin' ? 'status-active' : 'status-pending'}">
                ${user.role || 'user'}
            </span></td>
            <td>${new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn btn-warning" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 3000;
                animation: slideInRight 0.3s ease;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .notification-success { background: #27ae60; }
            .notification-error { background: #e74c3c; }
            .notification-info { background: #3498db; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: auto;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Placeholder functions for future implementation
function viewOrder(orderId) {
    showNotification('Funcionalidade em desenvolvimento', 'info');
}

function editUser(userId) {
    showNotification('Funcionalidade em desenvolvimento', 'info');
}