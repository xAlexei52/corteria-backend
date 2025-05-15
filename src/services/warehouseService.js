// src/services/warehouseService.js (actualizado)
const { Warehouse, Inventory, City } = require('../config/database');
const { Op } = require('sequelize');

const warehouseService = {
  /**
   * Crea un nuevo almacén
   * @param {Object} warehouseData - Datos del almacén
   * @returns {Promise<Object>} Almacén creado
   */
  async createWarehouse(warehouseData) {
    // Verificar que la ciudad existe
    const city = await City.findByPk(warehouseData.cityId);
    if (!city) {
      throw new Error('City not found');
    }
    
    const warehouse = await Warehouse.create(warehouseData);
    return warehouse;
  },

  /**
   * Obtiene un almacén por ID
   * @param {string} id - ID del almacén
   * @returns {Promise<Object>} Almacén encontrado
   */
  async getWarehouseById(id) {
    const warehouse = await Warehouse.findByPk(id, {
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
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
    
    if (filters.cityId) {
      where.cityId = filters.cityId;
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
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [
        [{ model: City, as: 'city' }, 'name', 'ASC'],
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
            cityId: warehouse.cityId, 
            id: { [Op.ne]: id },
            isMain: true
          } 
        }
      );
    }
    
    // Si se cambia la ciudad, verificar que existe
    if (warehouseData.cityId && warehouseData.cityId !== warehouse.cityId) {
      const city = await City.findByPk(warehouseData.cityId);
      if (!city) {
        throw new Error('City not found');
      }
    }
    
    await warehouse.update(warehouseData);
    
    return await this.getWarehouseById(id);
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
   * @param {string} cityId - ID de la ciudad
   * @returns {Promise<Array>} Lista de almacenes en la ciudad
   */
  async getWarehousesByCity(cityId) {
    const warehouses = await Warehouse.findAll({
      where: {
        cityId,
        active: true
      },
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    return warehouses;
  },

  /**
   * Obtiene el almacén principal de una ciudad
   * @param {string} cityId - ID de la ciudad
   * @returns {Promise<Object>} Almacén principal
   */
  async getMainWarehouseByCity(cityId) {
    const warehouse = await Warehouse.findOne({
      where: {
        cityId,
        isMain: true,
        active: true
      },
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    if (!warehouse) {
      throw new Error(`No main warehouse found for the specified city`);
    }
    
    return warehouse;
  }
};

module.exports = warehouseService;