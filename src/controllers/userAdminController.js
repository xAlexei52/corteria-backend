// src/controllers/userAdminController.js
const userService = require('../services/userService');

const userAdminController = {
  /**
   * Lista todos los usuarios
   * @route GET /api/admin/users
   */
  async listUsers(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
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
   * Activa o desactiva un usuario
   * @route PATCH /api/admin/users/:id/toggle-active
   */
  async toggleUserActive(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
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
   * Actualiza permisos y ciudad de un usuario
   * @route PATCH /api/admin/users/:id/permissions
   */
  async updateUserPermissions(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
      const { id } = req.params;
      const { role, city } = req.body;
      
      if (role === undefined && city === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Role or city is required'
        });
      }
      
      // No permitir que un administrador cambie su propio rol
      if (id === req.user.id && role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own admin role'
        });
      }
      
      const user = await userService.updateUserPermissions(id, { role, city });
      
      res.status(200).json({
        success: true,
        message: 'User permissions updated successfully',
        user
      });
    } catch (error) {
      console.error('Update user permissions error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (error.message.includes('Invalid role')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating user permissions',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un usuario por ID
   * @route GET /api/admin/users/:id
   */
  async getUserById(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
      const { id } = req.params;
      
      const user = await userService.getUserById(id);
      
      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get user error:', error);
      
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
 * Actualiza datos de un usuario como administrador
 * @route PUT /api/admin/users/:id
 */
async updateUser(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
      const { id } = req.params;
      const { 
        firstName, lastName, email, 
        password, role, city, active 
      } = req.body;
      
      // Verificar que se proporcionen datos para actualizar
      if (!firstName && !lastName && !email && !password && 
          role === undefined && city === undefined && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'No data provided for update'
        });
      }
      
      // No permitir que un administrador se quite sus propios privilegios
      if (id === req.user.id && role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own admin role'
        });
      }
      
      const user = await userService.updateUserAsAdmin(id, {
        firstName, lastName, email, password, role, city, active
      });
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (error.message === 'Email already in use by another user') {
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
  }
};

module.exports = userAdminController;