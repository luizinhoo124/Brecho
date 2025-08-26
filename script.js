// Configuração da API
const API_BASE_URL = 'http://localhost:3001/api';

// Configuração do Tailwind CSS
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#2F855A',
                secondary: '#38A169',
                accent: '#DD6B20',
                light: '#F7FAFC',
                dark: '#2D3748'
            }
        }
    }
};

// Estado global da aplicação
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];
let categories = [];

// Funcionalidades interativas da página
document.addEventListener('DOMContentLoaded', function() {
    // Funções de API
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    // Funções de autenticação
    async function login(email, password) {
        try {
            const data = await apiRequest('/users/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateAuthUI();
            return data;
        } catch (error) {
            throw error;
        }
    }

    async function register(userData) {
        try {
            const data = await apiRequest('/users/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateAuthUI();
            return data;
        } catch (error) {
            throw error;
        }
    }

    function logout() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateAuthUI();
    }

    // Funções de produtos
    async function loadProducts() {
        try {
            const data = await apiRequest('/products');
            products = data.data || [];
            renderProducts(products);
            return products;
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
        }
    }

    async function loadCategories() {
        try {
            const data = await apiRequest('/categories');
            categories = data.data || [];
            renderCategoryFilters();
            return categories;
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    // Renderização de produtos
    function renderProducts(productsToRender) {
        const productsContainer = document.querySelector('#produtos .grid');
        if (!productsContainer) return;
        
        productsContainer.innerHTML = productsToRender.map(product => `
            <div class="bg-white rounded-xl overflow-hidden shadow-md card-hover product-card" data-category="${product.category_id}">
                <div class="relative">
                    <img src="${product.image_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 300 300\'><rect width=\'300\' height=\'300\' fill=\'%23F7FAFC\'/><text x=\'150\' y=\'150\' text-anchor=\'middle\' dy=\'.3em\' font-family=\'Arial\' font-size=\'16\' fill=\'%23666\'>${product.name}</text></svg>'}" alt="${product.name}" class="w-full h-48 object-cover">
                    ${product.discount > 0 ? `<div class="absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded">-${product.discount}%</div>` : ''}
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2">${product.name}</h3>
                    <p class="text-gray-600 text-sm mb-2">${product.description}</p>
                    <div class="flex items-center mb-2">
                        <div class="flex text-yellow-400">
                            ${generateStars(product.rating || 4)}
                        </div>
                        <span class="text-gray-600 text-sm ml-2">(${product.reviews_count || 0})</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <div>
                            ${product.discount > 0 ? `<span class="text-red-500 line-through text-sm">R$ ${(product.price / (1 - product.discount/100)).toFixed(2)}</span>` : ''}
                            <span class="text-primary font-bold ${product.discount > 0 ? 'ml-2' : ''}">R$ ${product.price.toFixed(2)}</span>
                        </div>
                        <button onclick="addToCart(${product.id})" class="bg-primary text-white p-2 rounded-full hover:bg-secondary transition">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return [
            ...Array(fullStars).fill('<i class="fas fa-star"></i>'),
            ...(hasHalfStar ? ['<i class="fas fa-star-half-alt"></i>'] : []),
            ...Array(emptyStars).fill('<i class="far fa-star"></i>')
        ].join('');
    }

    // Renderização de filtros de categoria
    function renderCategoryFilters() {
        const filtersContainer = document.querySelector('.category-filters');
        if (!filtersContainer || !categories.length) return;
        
        const filtersHTML = [
            '<button class="category-filter bg-primary text-white px-4 py-2 rounded-full" data-category="all">Todos</button>',
            ...categories.map(category => 
                `<button class="category-filter bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300" data-category="${category.id}">${category.name}</button>`
            )
        ].join('');
        
        filtersContainer.innerHTML = filtersHTML;
        
        // Adicionar event listeners aos filtros
        const categoryFilters = document.querySelectorAll('.category-filter');
        categoryFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                // Remove active class from all filters
                categoryFilters.forEach(f => f.classList.remove('bg-primary', 'text-white'));
                categoryFilters.forEach(f => f.classList.add('bg-gray-200', 'text-gray-700'));
                
                // Add active class to clicked filter
                filter.classList.remove('bg-gray-200', 'text-gray-700');
                filter.classList.add('bg-primary', 'text-white');
                
                const categoryId = filter.dataset.category;
                filterProducts(categoryId);
            });
        });
    }

    function filterProducts(categoryId) {
        const filteredProducts = categoryId === 'all' 
            ? products 
            : products.filter(product => product.category_id.toString() === categoryId);
        
        renderProducts(filteredProducts);
    }

    // Filtros de categoria de produtos
    const filterButtons = document.querySelectorAll('.category-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe 'active' de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' ao botão clicado
            this.classList.add('active');
        });
    });
    
    // Animação das barras de progresso quando entram na viewport
    const progressBars = document.querySelectorAll('.progress-bar');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Salva a largura original
                const width = entry.target.style.width;
                // Reseta a largura para 0
                entry.target.style.width = '0';
                // Anima para a largura original após um pequeno delay
                setTimeout(() => {
                    entry.target.style.width = width;
                }, 100);
            }
        });
    }, { threshold: 0.5 });
    
    // Observa todas as barras de progresso
    progressBars.forEach(bar => {
        observer.observe(bar);
    });
    
    // Funcionalidade de scroll suave para links de navegação
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Newsletter form
    const newsletterForm = document.querySelector('form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            const button = this.querySelector('button');
            const originalText = button.textContent;
            button.textContent = 'Enviando...';
            button.disabled = true;
            
            try {
                // Aqui você pode adicionar a chamada para a API de newsletter
                // await apiRequest('/newsletter/subscribe', {
                //     method: 'POST',
                //     body: JSON.stringify({ email })
                // });
                
                // Simular envio por enquanto
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                button.textContent = 'Inscrito!';
                button.classList.add('bg-green-500');
                showNotification('Inscrição realizada com sucesso!', 'success');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.classList.remove('bg-green-500');
                    this.reset();
                }, 2000);
            } catch (error) {
                button.textContent = originalText;
                button.disabled = false;
                showNotification('Erro ao realizar inscrição', 'error');
            }
        });
    }
    
    // Funcionalidades do carrinho
    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        showNotification(`${product.name} adicionado ao carrinho!`, 'success');
    }
    
    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    }
    
    function updateCartQuantity(productId, quantity) {
        const item = cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                removeFromCart(productId);
            } else {
                item.quantity = quantity;
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartUI();
            }
        }
    }
    
    function updateCartUI() {
        const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
        const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        // Atualizar contador do carrinho no header
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'block' : 'none';
        }
    }
    
    // Funcionalidades de autenticação UI
    function updateAuthUI() {
        const loginButton = document.querySelector('.login-button');
        const userMenu = document.querySelector('.user-menu');
        
        if (currentUser) {
            if (loginButton) loginButton.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
                userMenu.querySelector('.user-name').textContent = currentUser.name;
            }
        } else {
            if (loginButton) loginButton.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
    
    // Sistema de notificações
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Inicialização da aplicação
    async function initApp() {
        // Verificar se há usuário logado
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser && authToken) {
            currentUser = JSON.parse(savedUser);
            updateAuthUI();
        }
        
        // Carregar dados iniciais
        await loadCategories();
        await loadProducts();
        
        // Atualizar UI do carrinho
        updateCartUI();
    }
    
    // Expor funções globalmente para uso nos botões
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateCartQuantity = updateCartQuantity;
    window.login = login;
    window.register = register;
    window.logout = logout;
    
    // Inicializar aplicação
    initApp();
    
    // Menu mobile toggle (se necessário)
    const mobileMenuButton = document.querySelector('.fa-bars');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            // Implementar funcionalidade do menu mobile se necessário
            console.log('Menu mobile clicado');
        });
    }
});

// Animação CSS adicional para o pulse
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);