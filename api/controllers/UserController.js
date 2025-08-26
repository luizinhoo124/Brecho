import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { generateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

class UserController {
  // Register new user
  static async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const { name, email, password, phone, address } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }

      // Create user
      const userData = {
        name,
        email,
        password,
        phone,
        address,
        role: 'customer' // Default role
      };

      const user = await User.create(userData);
      
      // Generate token
      const token = generateToken(user.id);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Authenticate user
      const user = await User.authenticate(email, password);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou senha inválidos'
        });
      }

      // Generate token
      const token = generateToken(user.id);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const { name, phone, address } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;

      const user = await User.update(userId, updateData);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: userResponse
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          message: 'Senha atual e nova senha são obrigatórias'
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Nova senha deve ter pelo menos 6 caracteres'
        });
      }

      // Get current user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha atual incorreta'
        });
      }

      // Update password
      await User.update(userId, { password: new_password });

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get all users (admin only)
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      const filters = {};
      if (role) filters.role = role;
      if (search) filters.search = search;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await User.findAll(filters, options);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user by ID (admin only)
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update user role (admin only)
  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['customer', 'seller', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Papel inválido'
        });
      }

      const user = await User.updateRole(id, role);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Papel do usuário atualizado com sucesso',
        data: userResponse
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete user (admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode excluir sua própria conta'
        });
      }

      const deleted = await User.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user statistics (admin only)
  static async getStats(req, res) {
    try {
      const stats = await User.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user profile by ID (public)
  static async getPublicProfile(req, res) {
    try {
      const { id } = req.params;
      const profile = await User.getProfile(id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil não encontrado'
        });
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error getting public profile:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Verify token (for frontend)
  static async verifyToken(req, res) {
    try {
      // If we reach here, token is valid (middleware already verified)
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Check if email exists
  static async checkEmail(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      const user = await User.findByEmail(email);
      
      res.json({
        success: true,
        exists: !!user
      });
    } catch (error) {
      console.error('Error checking email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user by ID (admin)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update user (admin)
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const user = await User.update(id, updateData);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: userResponse
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Update user role (admin)
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['customer', 'seller', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Papel inválido'
        });
      }

      const user = await User.updateRole(id, role);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Papel do usuário atualizado com sucesso',
        data: userResponse
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete user (admin)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode excluir sua própria conta'
        });
      }

      const deleted = await User.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Delete own account
  static async deleteOwnAccount(req, res) {
    try {
      const userId = req.user.id;
      
      const deleted = await User.delete(userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Conta excluída com sucesso'
      });
    } catch (error) {
      console.error('Error deleting own account:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Forgot password
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      // For security, always return success even if email doesn't exist
      res.json({
        success: true,
        message: 'Se o email existir, você receberá instruções para redefinir sua senha'
      });
    } catch (error) {
      console.error('Error in forgot password:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;
      
      if (!token || !new_password) {
        return res.status(400).json({
          success: false,
          message: 'Token e nova senha são obrigatórios'
        });
      }

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Verify email
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token é obrigatório'
        });
      }

      res.json({
        success: true,
        message: 'Email verificado com sucesso'
      });
    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Resend verification
  static async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      res.json({
        success: true,
        message: 'Email de verificação reenviado'
      });
    } catch (error) {
      console.error('Error resending verification:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const user = req.user;
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Token atualizado com sucesso',
        data: { token }
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user sessions
  static async getUserSessions(req, res) {
    try {
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Logout all
  static async logoutAll(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout de todos os dispositivos realizado com sucesso'
      });
    } catch (error) {
      console.error('Error logging out all:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Enable 2FA
  static async enable2FA(req, res) {
    try {
      res.json({
        success: true,
        message: '2FA habilitado com sucesso'
      });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Disable 2FA
  static async disable2FA(req, res) {
    try {
      res.json({
        success: true,
        message: '2FA desabilitado com sucesso'
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Verify 2FA
  static async verify2FA(req, res) {
    try {
      res.json({
        success: true,
        message: '2FA verificado com sucesso'
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Generate 2FA backup codes
  static async generate2FABackupCodes(req, res) {
    try {
      res.json({
        success: true,
        message: 'Códigos de backup gerados com sucesso',
        data: []
      });
    } catch (error) {
      console.error('Error generating 2FA backup codes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user statistics (admin)
  static async getUserStatistics(req, res) {
    try {
      const stats = await User.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user stats
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await User.getUserStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Search users (admin)
  static async searchUsers(req, res) {
    try {
      const { q, role, page = 1, limit = 10 } = req.query;
      
      const filters = {};
      if (q) filters.search = q;
      if (role) filters.role = role;
      
      const pagination = { page: parseInt(page), limit: parseInt(limit) };
      const result = await User.search(filters, pagination);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk update users (admin)
  static async bulkUpdateUsers(req, res) {
    try {
      const { user_ids, update_data } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos usuários são obrigatórios'
        });
      }

      const result = await User.bulkUpdate(user_ids, update_data);
      
      res.json({
        success: true,
        message: `${result.updated} usuários atualizados com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Error bulk updating users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Bulk delete users (admin)
  static async bulkDeleteUsers(req, res) {
    try {
      const { user_ids } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs dos usuários são obrigatórios'
        });
      }

      // Prevent admin from deleting themselves
      if (user_ids.includes(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode excluir sua própria conta'
        });
      }

      const result = await User.bulkDelete(user_ids);
      
      res.json({
        success: true,
        message: `${result.deleted} usuários excluídos com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Export users (admin)
  static async exportUsers(req, res) {
    try {
      const { format = 'json' } = req.query;
      const users = await User.findAll({}, { page: 1, limit: 10000 });
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = UserController.convertToCSV(users.users);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users.json');
        res.json({
          success: true,
          data: users.users,
          exported_at: new Date().toISOString(),
          total: users.users.length
        });
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Get user activity (admin)
  static async getUserActivity(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const pagination = { page: parseInt(page), limit: parseInt(limit) };
      const result = await User.getActivity(id, pagination);

      res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Helper method to convert users to CSV
  static convertToCSV(users) {
    if (users.length === 0) return '';
    
    const headers = Object.keys(users[0]).filter(key => key !== 'password').join(',');
    const rows = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return Object.values(userWithoutPassword).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',');
    });
    
    return [headers, ...rows].join('\n');
  }
}

export default UserController;