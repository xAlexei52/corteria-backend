// src/services/cityService.js
const { City, Usuario, Warehouse, Customer, TrailerEntry, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const cityService = {
  /**
   * Crea una nueva ciudad
   * @param {Object} cityData - Datos de la ciudad
   * @returns {Promise<Object>} Ciudad creada
   */
  async createCity(cityData) {
    // Verificar si ya existe una ciudad con el mismo nombre o código
    const existingCity = await City.findOne({
      where: {
        [Op.or]: [
          { name: cityData.name },
          { code: cityData.code }
        ]
      }
    });
    
    if (existingCity) {
      const field = existingCity.name === cityData.name ? 'name' : 'code';
      throw new Error(`A city with this ${field} already exists`);
    }
    
    const city = await City.create(cityData);
    return city;
  },

  /**
   * Obtiene una ciudad por ID
   * @param {string} id - ID de la ciudad
   * @returns {Promise<Object>} Ciudad encontrada
   */
  async getCityById(id) {
    const city = await City.findByPk(id);
    
    if (!city) {
      throw new Error('City not found');
    }
    
    return city;
  },

  /**
   * Lista ciudades con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de ciudades y metadatos de paginación
   */
  async listCities(filters = {}, pagination = {}) {
    const where = {};
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { code: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await City.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset
    });
    
    return {
      cities: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza una ciudad
   * @param {string} id - ID de la ciudad
   * @param {Object} cityData - Datos a actualizar
   * @returns {Promise<Object>} Ciudad actualizada
   */
  async updateCity(id, cityData) {
    const city = await City.findByPk(id);
    
    if (!city) {
      throw new Error('City not found');
    }
    
    // Verificar si hay conflictos con otros registros
    if (cityData.name || cityData.code) {
      const where = {
        id: { [Op.ne]: id },
        [Op.or]: []
      };
      
      if (cityData.name) {
        where[Op.or].push({ name: cityData.name });
      }
      
      if (cityData.code) {
        where[Op.or].push({ code: cityData.code });
      }
      
      // Solo verificar si hay algún OR para evitar consultas innecesarias
      if (where[Op.or].length > 0) {
        const existingCity = await City.findOne({ where });
        
        if (existingCity) {
          const field = existingCity.name === cityData.name ? 'name' : 'code';
          throw new Error(`A city with this ${field} already exists`);
        }
      }
    }
    
    await city.update(cityData);
    
    return await City.findByPk(id);
  },

  /**
   * Elimina una ciudad (desactivación lógica)
   * @param {string} id - ID de la ciudad
   * @returns {Promise<boolean>} True si se desactivó correctamente
   */
  async deleteCity(id) {
    const transaction = await sequelize.transaction();
    
    try {
      const city = await City.findByPk(id, { transaction });
      
      if (!city) {
        throw new Error('City not found');
      }
      
      // Verificar si hay entidades asociadas a esta ciudad
      const [usersCount, warehousesCount, customersCount, trailerEntriesCount] = await Promise.all([
        Usuario.count({ where: { cityId: id }, transaction }),
        Warehouse.count({ where: { cityId: id }, transaction }),
        Customer.count({ where: { cityId: id }, transaction }),
        TrailerEntry.count({ where: { cityId: id }, transaction })
      ]);
      
      const totalAssociations = usersCount + warehousesCount + customersCount + trailerEntriesCount;
      
      if (totalAssociations > 0) {
        throw new Error(`Cannot delete city with associated entities (${totalAssociations} in total)`);
      }
      
      // Opción 1: Eliminar físicamente
      await city.destroy({ transaction });
      
      // Opción 2: Desactivación lógica (descomentar si prefieres esta opción)
      // await city.update({ active: false }, { transaction });
      
      await transaction.commit();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene una lista de todas las ciudades activas para selectores
   * @returns {Promise<Array>} Lista de ciudades para select
   */
  async getActiveCitiesForSelect() {
    const cities = await City.findAll({
      where: { active: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });
    
    return cities;
  }
};

module.exports = cityService;