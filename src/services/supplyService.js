// src/services/supplyService.js
const { Supply } = require('../config/database');
const { Op } = require('sequelize');

const supplyService = {
  /**
   * Crea un nuevo insumo
   * @param {Object} supplyData - Datos del insumo
   * @returns {Promise<Object>} Insumo creado
   */
  async createSupply(supplyData) {
    const supply = await Supply.create(supplyData);
    return supply;
  },

  /**
   * Obtiene un insumo por ID
   * @param {string} id - ID del insumo
   * @returns {Promise<Object>} Insumo encontrado
   */
  async getSupplyById(id) {
    const supply = await Supply.findByPk(id);
    
    if (!supply) {
      throw new Error('Supply not found');
    }
    
    return supply;
  },

  /**
   * Lista insumos con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de insumos y metadatos de paginación
   */
  async listSupplies(filters = {}, pagination = {}) {
    const where = {};
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } },
        { unit: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Supply.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset
    });
    
    return {
      supplies: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un insumo
   * @param {string} id - ID del insumo
   * @param {Object} supplyData - Datos a actualizar
   * @returns {Promise<Object>} Insumo actualizado
   */
  async updateSupply(id, supplyData) {
    const supply = await Supply.findByPk(id);
    
    if (!supply) {
      throw new Error('Supply not found');
    }
    
    await supply.update(supplyData);
    
    return supply;
  },

  /**
   * Elimina un insumo (desactivación lógica)
   * @param {string} id - ID del insumo
   * @returns {Promise<boolean>} True si se desactivó correctamente
   */
  async deleteSupply(id) {
    const supply = await Supply.findByPk(id);
    
    if (!supply) {
      throw new Error('Supply not found');
    }
    
    await supply.update({ active: false });
    
    return true;
  }
};

module.exports = supplyService;