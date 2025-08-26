import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import { body, validationResult } from 'express-validator';

// Validation middleware functions
export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateSearchTerm = (req, res, next) => {
  const { q, search } = req.query;
  const searchTerm = q || search;
  
  if (searchTerm) {
    // Sanitize search term
    req.query.q = sanitizeHtml(searchTerm, { allowedTags: [], allowedAttributes: {} });
    req.query.search = req.query.q;
    
    // Validate length
    if (req.query.q.length > 100) {
      return res.status(400).json({ error: 'Search term too long' });
    }
  }
  
  next();
};

export const validateProductData = (req, res, next) => {
  const { name, price, description, category_id } = req.body;
  const errors = [];
  
  // Validate name
  if (!name || name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }
  
  // Validate price
  if (!price || isNaN(price) || parseFloat(price) <= 0) {
    errors.push('Price must be a positive number');
  }
  
  // Validate description
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  // Validate category_id
  if (!category_id || isNaN(category_id)) {
    errors.push('Valid category ID is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  req.body.description = sanitizeHtml(description.trim(), { allowedTags: ['p', 'br', 'strong', 'em'], allowedAttributes: {} });
  req.body.price = parseFloat(price);
  req.body.category_id = parseInt(category_id);
  
  next();
};

export const validateUserData = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];
  
  // Validate name
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Validate email
  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }
  
  // Validate password (only for registration)
  if (password && !validatePassword(password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase and number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  if (name) req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (email) req.body.email = email.toLowerCase().trim();
  
  next();
};

export const validateCategoryData = (req, res, next) => {
  const { name, description } = req.body;
  const errors = [];
  
  // Validate name
  if (!name || name.trim().length < 2) {
    errors.push('Category name must be at least 2 characters long');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (description) {
    req.body.description = sanitizeHtml(description.trim(), { allowedTags: ['p', 'br'], allowedAttributes: {} });
  }
  
  next();
};

export const validateOrderData = (req, res, next) => {
  const { shipping_address, payment_method } = req.body;
  const errors = [];
  
  // Validate shipping address
  if (!shipping_address || shipping_address.trim().length < 10) {
    errors.push('Shipping address must be at least 10 characters long');
  }
  
  // Validate payment method
  const validPaymentMethods = ['credit_card', 'debit_card', 'pix', 'boleto'];
  if (!payment_method || !validPaymentMethods.includes(payment_method)) {
    errors.push('Valid payment method is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  req.body.shipping_address = sanitizeHtml(shipping_address.trim(), { allowedTags: [], allowedAttributes: {} });
  
  next();
};

export const validateCartData = (req, res, next) => {
  const { product_id, quantity } = req.body;
  const errors = [];
  
  // Validate product_id
  if (!product_id || isNaN(product_id)) {
    errors.push('Valid product ID is required');
  }
  
  // Validate quantity
  if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
    errors.push('Quantity must be a positive number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Convert to integers
  req.body.product_id = parseInt(product_id);
  req.body.quantity = parseInt(quantity);
  
  next();
};

// Generic validation helpers
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
};

export const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  req.query.page = Math.max(1, parseInt(page) || 1);
  req.query.limit = Math.min(100, Math.max(1, parseInt(limit) || 10));
  
  next();
};

export const validateSorting = (allowedFields) => {
  return (req, res, next) => {
    const { sort_by, sort_order = 'asc' } = req.query;
    
    if (sort_by && !allowedFields.includes(sort_by)) {
      return res.status(400).json({ error: 'Invalid sort field' });
    }
    
    if (sort_order && !['asc', 'desc'].includes(sort_order.toLowerCase())) {
      return res.status(400).json({ error: 'Sort order must be asc or desc' });
    }
    
    req.query.sort_by = sort_by;
    req.query.sort_order = sort_order.toLowerCase();
    
    next();
  };
};

export const validateSortOptions = validateSorting;

// Handle validation errors middleware
export const handleValidationErrors = (req, res, next) => {
  // This middleware can be used to handle express-validator errors
  // For now, it just passes through
  next();
};

// Additional validation helpers
export const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ error: `Valid ${paramName} is required` });
    }
    
    req.params[paramName] = parseInt(id);
    next();
  };
};

export const validateOptionalId = (req, res, next) => {
  const { id } = req.params;
  
  if (id && (isNaN(id) || parseInt(id) <= 0)) {
    return res.status(400).json({ error: 'Valid ID is required' });
  }
  
  if (id) {
    req.params.id = parseInt(id);
  }
  
  next();
};

// Alias for validateProductData
export const validateProduct = validateProductData;

// Alias for validateUserData
export const validateUser = validateUserData;

// Alias for validateCategoryData
export const validateCategory = validateCategoryData;

// Alias for validateOrderData
export const validateOrder = validateOrderData;

// Alias for validateCartData
export const validateCart = validateCartData;

// Additional specific validations
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  
  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }
  
  if (!password || password.length < 1) {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validateRegister = validateUserData;

export const validatePasswordReset = (req, res, next) => {
  const { email } = req.body;
  
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validatePasswordChange = (req, res, next) => {
  const { current_password, new_password } = req.body;
  const errors = [];
  
  if (!current_password) {
    errors.push('Current password is required');
  }
  
  if (!new_password || !validatePassword(new_password)) {
    errors.push('New password must be at least 8 characters with uppercase, lowercase and number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

export const validateUpdateProfile = (req, res, next) => {
  const { name, email } = req.body;
  const errors = [];
  
  if (name && name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (email && !validateEmail(email)) {
    errors.push('Valid email is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  if (name) req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (email) req.body.email = email.toLowerCase().trim();
  
  next();
};

// Product specific validations
export const validateProductUpdate = (req, res, next) => {
  const { name, price, description, category_id, stock_quantity } = req.body;
  const errors = [];
  
  // Validate name (optional for update)
  if (name && name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }
  
  // Validate price (optional for update)
  if (price && (isNaN(price) || parseFloat(price) <= 0)) {
    errors.push('Price must be a positive number');
  }
  
  // Validate description (optional for update)
  if (description && description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  // Validate category_id (optional for update)
  if (category_id && isNaN(category_id)) {
    errors.push('Valid category ID is required');
  }
  
  // Validate stock_quantity (optional for update)
  if (stock_quantity !== undefined && (isNaN(stock_quantity) || parseInt(stock_quantity) < 0)) {
    errors.push('Stock quantity must be a non-negative number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  if (name) req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (description) req.body.description = sanitizeHtml(description.trim(), { allowedTags: ['p', 'br', 'strong', 'em'], allowedAttributes: {} });
  if (price) req.body.price = parseFloat(price);
  if (category_id) req.body.category_id = parseInt(category_id);
  if (stock_quantity !== undefined) req.body.stock_quantity = parseInt(stock_quantity);
  
  next();
};

// Category specific validations
export const validateCategoryUpdate = (req, res, next) => {
  const { name, description } = req.body;
  const errors = [];
  
  // Validate name (optional for update)
  if (name && name.trim().length < 2) {
    errors.push('Category name must be at least 2 characters long');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  if (name) req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (description) req.body.description = sanitizeHtml(description.trim(), { allowedTags: ['p', 'br'], allowedAttributes: {} });
  
  next();
};

// User specific validations
export const validateUserUpdate = (req, res, next) => {
  const { name, email, role } = req.body;
  const errors = [];
  
  // Validate name (optional for update)
  if (name && name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Validate email (optional for update)
  if (email && !validateEmail(email)) {
    errors.push('Valid email is required');
  }
  
  // Validate role (optional for update)
  if (role && !['user', 'admin'].includes(role)) {
    errors.push('Role must be either user or admin');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  if (name) req.body.name = sanitizeHtml(name.trim(), { allowedTags: [], allowedAttributes: {} });
  if (email) req.body.email = email.toLowerCase().trim();
  
  next();
};

// Order specific validations
export const validateOrderUpdate = (req, res, next) => {
  const { status, payment_status, shipping_address } = req.body;
  const errors = [];
  
  // Validate status (optional for update)
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Invalid order status');
  }
  
  // Validate payment status (optional for update)
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  if (payment_status && !validPaymentStatuses.includes(payment_status)) {
    errors.push('Invalid payment status');
  }
  
  // Validate shipping address (optional for update)
  if (shipping_address && shipping_address.trim().length < 10) {
    errors.push('Shipping address must be at least 10 characters long');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Sanitize data
  if (shipping_address) req.body.shipping_address = sanitizeHtml(shipping_address.trim(), { allowedTags: [], allowedAttributes: {} });
  
  next();
};

// Stock validation
export const validateStockUpdate = (req, res, next) => {
  const { stock_quantity } = req.body;
  
  if (stock_quantity === undefined || isNaN(stock_quantity) || parseInt(stock_quantity) < 0) {
    return res.status(400).json({ error: 'Stock quantity must be a non-negative number' });
  }
  
  req.body.stock_quantity = parseInt(stock_quantity);
  next();
};

// Bulk operations validation
export const validateBulkOperation = (req, res, next) => {
  const { ids, action } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array is required' });
  }
  
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'Action is required' });
  }
  
  // Validate all IDs are numbers
  const invalidIds = ids.filter(id => isNaN(id) || parseInt(id) <= 0);
  if (invalidIds.length > 0) {
    return res.status(400).json({ error: 'All IDs must be valid positive numbers' });
  }
  
  req.body.ids = ids.map(id => parseInt(id));
  next();
};

// Validação específica para login de usuário
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

// Validação para registro de usuário
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  handleValidationErrors
];

// Alias para compatibilidade
export const validateUserRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  handleValidationErrors
];

// Validação para atualização de perfil
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone deve ser válido'),
  handleValidationErrors
];

// Validação para item do carrinho
export const validateCartItem = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('ID do produto deve ser um número inteiro positivo'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantidade deve ser um número entre 1 e 100'),
  body('size')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Tamanho deve ter entre 1 e 10 caracteres'),
  body('color')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cor deve ter entre 1 e 50 caracteres'),
  handleValidationErrors
];

// Validação para atualização de item do carrinho
export const validateCartItemUpdate = [
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantidade deve ser um número entre 1 e 100'),
  body('size')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Tamanho deve ter entre 1 e 10 caracteres'),
  body('color')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cor deve ter entre 1 e 50 caracteres'),
  handleValidationErrors
];

// Validação para checkout
export const validateCheckout = [
  body('shipping_address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Endereço de entrega deve ter entre 10 e 500 caracteres'),
  body('payment_method')
    .isIn(['credit_card', 'debit_card', 'pix', 'boleto'])
    .withMessage('Método de pagamento inválido'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres'),
  handleValidationErrors
];

// Alias para compatibilidade
export const validateCartUpdate = validateCartItemUpdate;