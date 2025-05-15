// src/services/userService.js (versión completa)
const { Usuario, City } = require('../config/database');
const crypto = require('crypto');
const { Op } = require('sequelize');
const emailService = require('./emailService');

/**
 * Servicio para manejar operaciones relacionadas con usuarios
 */
const userService = {
  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario a registrar
   * @returns {Promise<Object>} Usuario creado
   */
  async registerUser(userData) {
    try {
      const usuario = await Usuario.create(userData);
      
      // No devolver la contraseña
      const userWithoutPassword = usuario.toJSON();
      delete userWithoutPassword.password;
      
      return userWithoutPassword;
    } catch (error) {
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        throw new Error(`The ${field} is already in use`);
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
    // Buscar usuario por email e incluir la ciudad
    const usuario = await Usuario.findOne({ 
      where: { email },
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    // Verificar si existe el usuario
    if (!usuario) {
      throw new Error('Invalid credentials');
    }
    
    // Verificar si está activo
    if (!usuario.active) {
      throw new Error('Inactive user. Please contact the administrator.');
    }
    
    // Verificar contraseña
    const isPasswordCorrect = await usuario.verifyPassword(password);
    if (!isPasswordCorrect) {
      throw new Error('Invalid credentials');
    }
    
    // Actualizar último login
    await usuario.update({ lastLogin: new Date() });
    
    // No devolver la contraseña
    const userWithoutPassword = usuario.toJSON();
    delete userWithoutPassword.password;
    
    return userWithoutPassword;
  },

  /**
   * Obtiene un usuario por ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Usuario encontrado
   */
  async getUserById(id) {
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    if (!usuario) {
      throw new Error('User not found');
    }
    
    return usuario;
  },

  /**
   * Lista todos los usuarios con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda (opcional)
   * @param {Object} pagination - Opciones de paginación (opcional)
   * @returns {Promise<Object>} Lista de usuarios y metadatos de paginación
   */
  async listUsers(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros si existen
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar opciones de paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Buscar usuarios con los filtros aplicados y paginación
    const { count, rows } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    return {
      users: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },


  /**
   * Activa o desactiva un usuario
   * @param {string} id - ID del usuario
   * @param {boolean} active - Estado de activación
   * @returns {Promise<Object>} Usuario actualizado
   */
  async toggleUserActive(id, active) {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('User not found');
    }
    
    await usuario.update({ active });
    
    // No devolver la contraseña
    const userWithoutPassword = usuario.toJSON();
    delete userWithoutPassword.password;
    
    return userWithoutPassword;
  },

  /**
   * Genera un token para resetear contraseña y envía email
   * @param {string} email - Email del usuario
   * @returns {Promise<boolean>} True si se envió el correo correctamente
   */
  async requestPasswordReset(email) {
    // Buscar usuario por email
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario) {
      throw new Error('No account associated with this email');
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
      resetPasswordToken,
      resetPasswordExpires
    });
    
    // Enviar email con el token
    try {
      await emailService.sendPasswordResetEmail(
        usuario.email, 
        `${usuario.firstName} ${usuario.lastName}`, 
        resetToken
      );
      return true;
    } catch (error) {
      // Si falla el envío de correo, limpiar el token
      await usuario.update({
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
      throw new Error('Error sending password recovery email');
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
        resetPasswordToken,
        resetPasswordExpires: { [Op.gt]: Date.now() }
      }
    });
    
    if (!usuario) {
      throw new Error('Invalid or expired token');
    }
    
    // Actualizar contraseña (se hasheará automáticamente por el hook beforeUpdate)
    await usuario.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
    
    return true;
  },

  /**
   * Actualiza información de un usuario
   * @param {string} id - ID del usuario
   * @param {Object} userData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateUser(id, userData) {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('User not found');
    }
    
    // Evitar la actualización del correo si ya existe
    if (userData.email && userData.email !== usuario.email) {
      const existingUser = await Usuario.findOne({ 
        where: { 
          email: userData.email,
          id: { [Op.ne]: id } // No incluir el usuario actual
        } 
      });
      
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }
    
    await usuario.update(userData);
    
    // No devolver la contraseña
    const userWithoutPassword = usuario.toJSON();
    delete userWithoutPassword.password;
    
    return userWithoutPassword;
  },

  /**
   * Cambia la contraseña de un usuario
   * @param {string} id - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<boolean>} True si se cambió la contraseña correctamente
   */
  async changePassword(id, currentPassword, newPassword) {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('User not found');
    }
    
    // Verificar contraseña actual
    const isPasswordCorrect = await usuario.verifyPassword(currentPassword);
    if (!isPasswordCorrect) {
      throw new Error('Current password is incorrect');
    }
    
    // Actualizar contraseña
    await usuario.update({ password: newPassword });
    
    return true;
  },

  /**
   * Elimina un usuario del sistema
   * @param {string} id - ID del usuario a eliminar
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteUser(id) {
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      throw new Error('User not found');
    }
    
    await usuario.destroy();
    
    return true;
  },

  /**
   * Obtiene estadísticas básicas de usuarios
   * @returns {Promise<Object>} Estadísticas de usuarios
   */
  async getUserStats() {
    const totalUsers = await Usuario.count();
    const activeUsers = await Usuario.count({ where: { active: true } });
    const inactiveUsers = totalUsers - activeUsers;
    
    // Distribución por ciudades
    const cities = await Usuario.findAll({
      attributes: ['city', [sequelize.fn('count', sequelize.col('id')), 'count']],
      group: ['city'],
      raw: true
    });
    
    // Distribución por roles
    const roles = await Usuario.findAll({
      attributes: ['role', [sequelize.fn('count', sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });
    
    // Usuarios nuevos en los últimos 30 días
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    const newUsers = await Usuario.count({
      where: {
        createdAt: { [Op.gte]: lastMonth }
      }
    });
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsers,
      citiesDistribution: cities,
      rolesDistribution: roles
    };
  },
  // src/services/userService.js
// Añadir estos métodos al userService existente

/**
 * Lista todos los usuarios con filtros opcionales
 * @param {Object} filters - Filtros para la búsqueda
 * @param {Object} pagination - Opciones de paginación
 * @returns {Promise<Object>} Lista de usuarios y metadatos de paginación
 */
async listUsers(filters = {}, pagination = {}) {
  const where = {};
  
  // Aplicar filtros
  if (filters.city) {
    where.city = filters.city;
  }
  
  if (filters.active !== undefined) {
    where.active = filters.active;
  }
  
  if (filters.role) {
    where.role = filters.role;
  }
  
  if (filters.search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${filters.search}%` } },
      { lastName: { [Op.like]: `%${filters.search}%` } },
      { email: { [Op.like]: `%${filters.search}%` } }
    ];
  }
  
  // Configurar paginación
  const limit = pagination.limit || 10;
  const page = parseInt(pagination.page) || 1;
  const offset = (page - 1) * limit;
  
  // Ejecutar consulta
  const { count, rows } = await Usuario.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    order: [
      ['lastName', 'ASC'],
      ['firstName', 'ASC']
    ],
    limit,
    offset
  });
  
  return {
    users: rows,
    pagination: {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    }
  };
},

/**
 * Activa o desactiva un usuario
 * @param {string} id - ID del usuario
 * @param {boolean} active - Estado de activación
 * @returns {Promise<Object>} Usuario actualizado
 */
async toggleUserActive(id, active) {
  const user = await Usuario.findByPk(id, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  await user.update({ active });
  
  return user;
},

/**
 * Asigna permisos y ciudad a un usuario
 * @param {string} id - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @returns {Promise<Object>} Usuario actualizado
 */
async updateUserPermissions(id, userData) {
  const user = await Usuario.findByPk(id, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const updateData = {};
  
  if (userData.role !== undefined) {
    // Validar rol
    const validRoles = ['admin', 'manager', 'user', 'sales', 'warehouse'];
    if (!validRoles.includes(userData.role)) {
      throw new Error(`Invalid role. Valid roles are: ${validRoles.join(', ')}`);
    }
    updateData.role = userData.role;
  }
  
  if (userData.cityId !== undefined) {
    // Verificar que la ciudad existe
    const city = await City.findByPk(userData.cityId);
    if (!city) {
      throw new Error('City not found');
    }
    updateData.cityId = userData.cityId;
  }
  
  await user.update(updateData);
  
  return await Usuario.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: City,
        as: 'city',
        attributes: ['id', 'name', 'code']
      }
    ]
  });
},

/**
 * Actualiza información de un usuario (para administradores)
 * @param {string} id - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @returns {Promise<Object>} Usuario actualizado
 */
async updateUserAsAdmin(id, userData) {
  const user = await Usuario.findByPk(id);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Determinar qué campos se pueden actualizar
  const updateData = {};
  
  if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
  if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
  if (userData.email !== undefined) {
    // Verificar que el email no esté en uso por otro usuario
    if (userData.email !== user.email) {
      const existingUser = await Usuario.findOne({ 
        where: { 
          email: userData.email,
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingUser) {
        throw new Error('Email already in use by another user');
      }
    }
    updateData.email = userData.email;
  }
  
  if (userData.role !== undefined) updateData.role = userData.role;
  if (userData.city !== undefined) updateData.city = userData.city;
  if (userData.active !== undefined) updateData.active = userData.active;
  
  // Actualizar contraseña si se proporciona
  if (userData.password) {
    // La contraseña se hashea automáticamente en el hook beforeUpdate del modelo
    updateData.password = userData.password;
  }
  
  await user.update(updateData);
  
  // Retornar usuario actualizado sin la contraseña
  const updatedUser = await Usuario.findByPk(id, {
    attributes: { exclude: ['password'] }
  });
  
  return updatedUser;
}
};

module.exports = userService;