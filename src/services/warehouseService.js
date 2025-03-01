// src/services/warehouseService.js
const { Warehouse, Inventory } = require('../config/database');
const { Op } = require('sequelize');

const warehouseService = {
  /**
   * Crea un nuevo almacén
   * @param {Object} warehouseData - Datos del almacén
   * @returns {Promise<Object>} Almacén creado
   */
  async createWarehouse(warehouseData) {
    const warehouse = await Warehouse.create(warehouseData);
    return warehouse;
  },

  /**
   * Obtiene un almacén por ID
   * @param {string} id - ID del almacén
   * @returns {Promise<Object>} Almacén encontrado
   */
  async getWarehouseById(id) {
    const warehouse = await Warehouse.findByPk(id);
    
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }
    
    return warehouse;
  },

  /**
   * Lista almacenes con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de almacenes y metadatos de paginación
   */
  async listWarehouses(filters = {}, pagination = {}) {
    const where = {};
    
    if (filters.city) {
      where.city = filters.city;
    }
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.isMain !== undefined) {
      where.isMain = filters.isMain;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { address: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Warehouse.findAndCountAll({
      where,
      order: [
        ['city', 'ASC'],
        ['name', 'ASC']
      ],
      limit,
      offset
    });
    
    return {
      warehouses: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un almacén
   * @param {string} id - ID del almacén
   * @param {Object} warehouseData - Datos a actualizar
   * @returns {Promise<Object>} Almacén actualizado
   */
  async updateWarehouse(id, warehouseData) {
    const warehouse = await Warehouse.findByPk(id);
    
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }
    
    // Si se está estableciendo este almacén como principal (isMain=true),
    // desactivar el flag en otros almacenes de la misma ciudad
    if (warehouseData.isMain === true) {
      await Warehouse.update(
        { isMain: false },
        { 
          where: { 
            city: warehouse.city, 
            id: { [Op.ne]: id },
            isMain: true
          } 
        }
      );
    }
    
    await warehouse.update(warehouseData);
    
    return warehouse;
  },

  /**
   * Elimina un almacén (desactivación lógica)
   * @param {string} id - ID del almacén
   * @returns {Promise<boolean>} True si se desactivó correctamente
   */
  async deleteWarehouse(id) {
    const warehouse = await Warehouse.findByPk(id);
    
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }
    
    // Verificar si hay inventario asociado
    const inventoryCount = await Inventory.count({
      where: { warehouseId: id }
    });
    
    if (inventoryCount > 0) {
      throw new Error('Cannot delete warehouse with inventory items. Please transfer items first.');
    }
    
    await warehouse.update({ active: false });
    
    return true;
  },

  /**
   * Obtiene los almacenes por ciudad
   * @param {string} city - Ciudad
   * @returns {Promise<Array>} Lista de almacenes en la ciudad
   */
  async getWarehousesByCity(city) {
    const warehouses = await Warehouse.findAll({
      where: {
        city,
        active: true
      },
      order: [['name', 'ASC']]
    });
    
    return warehouses;
  },

  /**
   * Obtiene el almacén principal de una ciudad
   * @param {string} city - Ciudad
   * @returns {Promise<Object>} Almacén principal
   */
  async getMainWarehouseByCity(city) {
    const warehouse = await Warehouse.findOne({
      where: {
        city,
        isMain: true,
        active: true
      }
    });
    
    if (!warehouse) {
      throw new Error(`No main warehouse found for city: ${city}`);
    }
    
    return warehouse;
  }
};

module.exports = warehouseService;