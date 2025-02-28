// src/middlewares/admin.middleware.js
/**
 * Middleware para verificar si el usuario es administrador
 */
const adminMiddleware = (req, res, next) => {
    try {
      // El usuario ya debe estar autenticado (authMiddleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Verificar si el usuario tiene el rol de administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Admin role required'
        });
      }
      
      next();
    } catch (error) {
      console.error('Admin authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Error in authorization'
      });
    }
  };
  
  module.exports = { adminMiddleware };