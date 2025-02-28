// src/services/trailerEntryService.js
const { TrailerEntry, Product, Usuario } = require('../config/database');
const { Op } = require('sequelize');

const trailerEntryService = {
  /**
   * Crea una nueva entrada de trailer
   * @param {Object} entryData - Datos de la entrada
   * @param {string} userId - ID del usuario que crea la entrada
   * @returns {Promise<Object>} Entrada creada
   */
  async createEntry(entryData, userId) {
    // Verificar que existe el producto
    const product = await Product.findByPk(entryData.productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Crear la entrada con referencia al creador
    const entry = await TrailerEntry.create({
      ...entryData,
      createdBy: userId
    });
    
    // Cargar la entrada con sus relaciones
    return await TrailerEntry.findByPk(entry.id, {
      include: [
        { model: Product, as: 'product' },
        { 
          model: Usuario, 
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ]
    });
  },

  /**
   * Obtiene una entrada por ID
   * @param {string} id - ID de la entrada
   * @returns {Promise<Object>} Entrada encontrada
   */
  async getEntryById(id) {
    const entry = await TrailerEntry.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { 
          model: Usuario, 
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ]
    });
    
    if (!entry) {
      throw new Error('Trailer entry not found');
    }
    
    return entry;
  },

  /**
   * Lista entradas con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de entradas y metadatos de paginación
   */
  async listEntries(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.city) {
      where.city = filters.city;
    }
    
    if (filters.supplier) {
      where.supplier = { [Op.like]: `%${filters.supplier}%` };
    }
    
    if (filters.productId) {
      where.productId = filters.productId;
    }
    
    if (filters.startDate && filters.endDate) {
      where.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await TrailerEntry.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { 
          model: Usuario, 
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ],
      order: [['date', 'DESC']],
      limit,
      offset
    });
    
    return {
      entries: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza una entrada
   * @param {string} id - ID de la entrada
   * @param {Object} entryData - Datos a actualizar
   * @returns {Promise<Object>} Entrada actualizada
   */
  async updateEntry(id, entryData) {
    const entry = await TrailerEntry.findByPk(id);
    
    if (!entry) {
      throw new Error('Trailer entry not found');
    }
    
    // Si se cambia el producto, verificar que existe
    if (entryData.productId && entryData.productId !== entry.productId) {
      const product = await Product.findByPk(entryData.productId);
      if (!product) {
        throw new Error('Product not found');
      }
    }
    
    await entry.update(entryData);
    
    // Retornar la entrada actualizada con sus relaciones
    return await TrailerEntry.findByPk(entry.id, {
      include: [
        { model: Product, as: 'product' },
        { 
          model: Usuario, 
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ]
    });
  },

  /**
   * Elimina una entrada
   * @param {string} id - ID de la entrada
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteEntry(id) {
    const entry = await TrailerEntry.findByPk(id);
    
    if (!entry) {
      throw new Error('Trailer entry not found');
    }
    
    await entry.destroy();
    
    return true;
  }
};

module.exports = trailerEntryService;