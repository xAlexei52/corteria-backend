// src/services/usuarioService.js
const { Usuario } = require('../config/database');
const crypto = require('crypto');
const emailService = require('./emailService');

/**
 * Servicio para manejar operaciones relacionadas con usuarios
 */
const usuarioService = {
  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario a registrar
   * @returns {Promise<Object>} Usuario creado
   */
  async registrarUsuario(userData) {
    try {
      const usuario = await Usuario.create(userData);
      
      // No devolver la contraseña
      const usuarioSinPassword = usuario.toJSON();
      delete usuarioSinPassword.password;
      
      return usuarioSinPassword;
    } catch (error) {
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        const campo = error.errors[0].path;
        throw new Error(`El ${campo} ya está en uso`);
      }
      throw error;
    }
  },
  
  /**
   * Autentica a un usuario por email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Datos del usuario autenticado
   */
  async login(email, password) {
    // Buscar usuario por email
    const usuario = await Usuario.findOne({ where: { email } });
    
    // Verificar si existe el usuario
    if (!usuario) {
      throw new Error('Credenciales incorrectas');
    }
    
    // Verificar si está activo
    if (!usuario.activo) {
      throw new Error('Usuario inactivo. Contacte al administrador.');
    }
    
    // Verificar contraseña
    const passwordCorrecto = await usuario.verificarPassword(password);
    if (!passwordCorrecto) {
      throw new Error('Credenciales incorrectas');
    }
    
    // Actualizar último login
    await usuario.update({ ultimo_login: new Date() });
    
    // No devolver la contraseña
    const usuarioSinPassword = usuario.toJSON();
    delete usuarioSinPassword.password;
    
    return usuarioSinPassword;
  },

  /**
   * Busca un usuario por ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Usuario encontrado
   */
  async obtenerUsuarioPorId(id) {
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    
    return usuario;
  },

  /**
   * Genera un token para resetear contraseña y envía email
   * @param {string} email - Email del usuario
   * @returns {Promise<boolean>} True si se envió el correo correctamente
   */
  async solicitarResetPassword(email) {
    // Buscar usuario por email
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario) {
      throw new Error('No existe una cuenta asociada a este correo electrónico');
    }
    
    // Generar token aleatorio
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Guardar token encriptado en la base de datos
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Fecha de expiración (1 hora)
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    
    // Actualizar usuario con el token y fecha de expiración
    await usuario.update({
      reset_password_token: resetPasswordToken,
      reset_password_expires: resetPasswordExpires
    });
    
    // Enviar email con el token
    try {
      await emailService.enviarEmailRecuperacion(
        usuario.email, 
        usuario.nombre, 
        resetToken
      );
      return true;
    } catch (error) {
      // Si falla el envío de correo, limpiar el token
      await usuario.update({
        reset_password_token: null,
        reset_password_expires: null
      });
      throw new Error('Error al enviar el correo electrónico de recuperación');
    }
  },
  
  /**
   * Verifica el token y cambia la contraseña
   * @param {string} token - Token de reseteo
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<boolean>} True si se cambió la contraseña correctamente
   */
  async resetPassword(token, newPassword) {
    // Convertir token a formato hasheado
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Buscar usuario con token válido y no expirado
    const usuario = await Usuario.findOne({
      where: {
        reset_password_token: resetPasswordToken,
        reset_password_expires: { [sequelize.Op.gt]: Date.now() }
      }
    });
    
    if (!usuario) {
      throw new Error('Token inválido o expirado');
    }
    
    // Actualizar contraseña (se hasheará automáticamente por el hook beforeSave)
    await usuario.update({
      password: newPassword,
      reset_password_token: null,
      reset_password_expires: null
    });
    
    return true;
  }
};

module.exports = usuarioService;