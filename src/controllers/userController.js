// src/controllers/userController.js
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

const userController = {
  /**
   * Inicia sesión con un usuario
   * @route POST /api/users/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validar que se proporcionaron email y password
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }
      
      // Intentar login mediante el servicio
      const user = await userService.login(email, password);
      
      // Generar token JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          city: user.city 
        },
        process.env.JWT_SECRET || 'temp-secret-key',
        { expiresIn: '8h' }
      );
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Manejo de errores específicos
      if (error.message.includes('Invalid credentials') || 
          error.message.includes('Inactive user')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  },
  
  /**
   * Registra un nuevo usuario
   * @route POST /api/users/register
   */
  async register(req, res) {
    try {
      const { firstName, lastName, email, password, city, role } = req.body;
      
      // Validación básica
      if (!firstName || !lastName || !email || !password || !city) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: firstName, lastName, email, password, city'
        });
      }
      
      // Validar formato de correo electrónico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Validar longitud de contraseña
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      
      // Registrar usuario mediante el servicio
      const newUser = await userService.registerUser({
        firstName,
        lastName,
        email,
        password,
        city,
        role: role || 'user', // Valor por defecto
        active: false // Inactivo hasta que el administrador lo active
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully. Account is pending activation by an administrator.',
        user: newUser
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Manejar errores específicos
      if (error.message.includes('already in use')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error during registration',
        error: error.message
      });
    }
  },
  
  /**
   * Solicita un token para restablecer la contraseña
   * @route POST /api/users/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your email'
        });
      }
      
      await userService.requestPasswordReset(email);
      
      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, password reset instructions have been sent'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // No revelar información específica para evitar enumeración de usuarios
      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, password reset instructions have been sent'
      });
    }
  },
  
  /**
   * Restablece la contraseña con un token válido
   * @route POST /api/users/reset-password/:token
   */
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }
      
      // Validar contraseña
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      
      await userService.resetPassword(token, password);
      
      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.message === 'Invalid or expired token') {
        return res.status(400).json({
          success: false,
          message: 'The reset link is invalid or has expired. Please request a new one.'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error resetting password',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene el perfil del usuario actual
   * @route GET /api/users/profile
   */
  async getProfile(req, res) {
    try {
      const user = await userService.getUserById(req.user.id);
      
      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching user profile',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza el perfil del usuario actual
   * @route PUT /api/users/profile
   */
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, city } = req.body;
      const updateData = {};
      
      // Solo actualizar los campos proporcionados
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (city) updateData.city = city;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }
      
      const updatedUser = await userService.updateUser(req.user.id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: error.message
      });
    }
  },
  
  /**
   * Cambia la contraseña del usuario actual
   * @route PUT /api/users/change-password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      await userService.changePassword(req.user.id, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: error.message
      });
    }
  },
  
  /**
   * Lista todos los usuarios (solo admin)
   * @route GET /api/users
   */
  async listUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, city, active, role } = req.query;
      
      // Convertir parámetros a tipos apropiados
      const filters = {
        search,
        city,
        active: active === 'true' ? true : (active === 'false' ? false : undefined),
        role
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await userService.listUsers(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List users error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing users',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un usuario por ID (solo admin)
   * @route GET /api/users/:id
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await userService.getUserById(id);
      
      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching user',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un usuario por ID (solo admin)
   * @route PUT /api/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, city, role, active } = req.body;
      
      const updateData = {};
      
      // Solo actualizar los campos proporcionados
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      if (city) updateData.city = city;
      if (role) updateData.role = role;
      if (active !== undefined) updateData.active = active;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }
      
      const updatedUser = await userService.updateUser(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (error.message.includes('already in use')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  },
  
  /**
   * Activa o desactiva un usuario (solo admin)
   * @route PATCH /api/users/:id/toggle-active
   */
  async toggleUserActive(req, res) {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Active status is required'
        });
      }
      
      const user = await userService.toggleUserActive(id, active);
      
      res.status(200).json({
        success: true,
        message: `User ${active ? 'activated' : 'deactivated'} successfully`,
        user
      });
    } catch (error) {
      console.error('Toggle user active error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error toggling user active status',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un usuario (solo admin)
   * @route DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      await userService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting user',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene estadísticas de usuarios (solo admin)
   * @route GET /api/users/stats
   */
  async getUserStats(req, res) {
    try {
      const stats = await userService.getUserStats();
      
      res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching user statistics',
        error: error.message
      });
    }
  }
};

module.exports = userController;