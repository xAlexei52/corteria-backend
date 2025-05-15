// src/middlewares/auth.middleware.js (actualizado)
const jwt = require('jsonwebtoken');
const { Usuario, City } = require('../config/database');

/**
 * Middleware para verificar autenticación mediante JWT
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Verificar que exista el token en el header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado - Token no proporcionado'
            });
        }

        // Obtener el token
        const token = authHeader.split(' ')[1];

        try {
            // Verificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscar el usuario en la base de datos e incluir la ciudad
            const usuario = await Usuario.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }, // Excluir la contraseña
                include: [
                    {
                        model: City,
                        as: 'city',
                        attributes: ['id', 'name', 'code']
                    }
                ]
            });

            // Verificar si el usuario existe y está activo
            if (!usuario || !usuario.active) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado - Usuario no encontrado o inactivo'
                });
            }

            // Agregar el usuario a la request para uso posterior
            req.user = usuario; 
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado - Token expirado'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado - Token inválido'
                });
            }

            throw error;
        }
    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(500).json({
            success: false,
            message: 'Error en la autenticación'
        });
    }
};

module.exports = { authMiddleware };