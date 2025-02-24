const usuarioService = require('../services/usuarioService');
const jwt = require('jsonwebtoken');

const usuarioController = {
  /**
   * Inicia sesión con un usuario
   * @route POST /api/usuarios/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validar que se proporcionaron email y password
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Por favor proporcione email y contraseña'
        });
      }
      
      // Intentar login mediante el servicio
      const usuario = await usuarioService.login(email, password);
      
      // Generar token JWT
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET || 'secreto-temporal',
        { expiresIn: '8h' }
      );
      
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        data: usuario
      });
    } catch (error) {
      console.error('Error en login:', error);
      
      // Manejo de errores específicos
      if (error.message.includes('Credenciales incorrectas') || 
          error.message.includes('Usuario inactivo')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      });
    }
  },
  
  /**
   * Registra un nuevo usuario
   * @route POST /api/usuarios/registro
   */
  async registrar(req, res) {
    try {
      const { nombre, usuario, email, password, rol } = req.body;
      
      // Validación básica
      if (!nombre || !usuario || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: nombre, usuario, email, password'
        });
      }
      
      // Registrar usuario mediante el servicio
      const nuevoUsuario = await usuarioService.registrarUsuario({
        nombre,
        usuario,
        email,
        password,
        rol: rol || 'operador' // Valor por defecto
      });
      
      res.status(201).json({
        success: true,
        message: 'Usuario registrado correctamente',
        data: nuevoUsuario
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      
      // Manejar errores específicos
      if (error.message.includes('ya está en uso')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  },
  
  /**
   * Solicita un token para restablecer la contraseña
   * @route POST /api/usuarios/olvido-password
   */
  async olvidoPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Por favor proporcione su correo electrónico'
        });
      }
      
      await usuarioService.solicitarResetPassword(email);
      
      res.status(200).json({
        success: true,
        message: 'Se ha enviado un correo con las instrucciones para restablecer su contraseña'
      });
    } catch (error) {
      console.error('Error en olvido-password:', error);
      
      // No revelar información específica para evitar enumeración de usuarios
      if (error.message.includes('No existe una cuenta')) {
        return res.status(404).json({
          success: false,
          message: 'Si el correo existe en nuestra base de datos, recibirá instrucciones para restablecer su contraseña'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud de recuperación de contraseña',
        error: error.message
      });
    }
  },
  
  /**
   * Restablece la contraseña con un token válido
   * @route POST /api/usuarios/reset-password/:token
   */
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token y nueva contraseña son requeridos'
        });
      }
      
      // Validar contraseña
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }
      
      await usuarioService.resetPassword(token, password);
      
      res.status(200).json({
        success: true,
        message: 'Contraseña restablecida correctamente. Ya puede iniciar sesión con su nueva contraseña.'
      });
    } catch (error) {
      console.error('Error en reset-password:', error);
      
      if (error.message === 'Token inválido o expirado') {
        return res.status(400).json({
          success: false,
          message: 'El enlace de restablecimiento es inválido o ha expirado. Por favor solicite uno nuevo.'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al restablecer la contraseña',
        error: error.message
      });
    }
  }
};

module.exports = usuarioController;