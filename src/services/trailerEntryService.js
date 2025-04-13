// src/services/trailerEntryService.js
const { TrailerEntry, Product, Usuario, Warehouse, Inventory, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const trailerEntryService = {
  /**
   * Crea una nueva entrada de trailer
   * @param {Object} entryData - Datos de la entrada
   * @param {string} userId - ID del usuario que crea la entrada
   * @returns {Promise<Object>} Entrada creada
   */
  async createEntry(entryData, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que existe el producto
      const product = await Product.findByPk(entryData.productId);
      
      if (!product) {
        await transaction.rollback();
        throw new Error('Product not found');
      }
      
      // Si se especifica un almacén, verificar que existe
      if (entryData.destinationWarehouseId) {
        const warehouse = await Warehouse.findByPk(entryData.destinationWarehouseId);
        if (!warehouse) {
          await transaction.rollback();
          throw new Error('Warehouse not found');
        }
      }
      
      // Calcular costo por kilo si se proporcionó un costo total
      let costPerKilo = null;
      if (entryData.totalCost && entryData.kilos > 0) {
        costPerKilo = parseFloat(entryData.totalCost) / parseFloat(entryData.kilos);
      }
      
      // Crear la entrada con referencia al creador
      const entry = await TrailerEntry.create({
        ...entryData,
        availableKilos: entryData.kilos, // Inicialmente, todos los kilos están disponibles
        costPerKilo: costPerKilo,
        createdBy: userId
      }, { transaction });
      
      // Si el producto va directo a almacén, actualizar el inventario
      if (entryData.directToWarehouse && entryData.destinationWarehouseId) {
        await Inventory.findOrCreate({
          where: {
            itemType: 'product',
            itemId: entryData.productId,
            warehouseId: entryData.destinationWarehouseId
          },
          defaults: {
            quantity: 0
          },
          transaction
        });
        
        // Incrementar el inventario
        await sequelize.query(
          'UPDATE inventory SET quantity = quantity + ? WHERE item_type = ? AND item_id = ? AND warehouse_id = ?',
          {
            replacements: [entryData.kilos, 'product', entryData.productId, entryData.destinationWarehouseId],
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
        
        // Marcar como movido a almacén
        await entry.update({ movedToWarehouse: true }, { transaction });
      }
      
      await transaction.commit();
      
      // Cargar la entrada con sus relaciones
      return await TrailerEntry.findByPk(entry.id, {
        include: [
          { model: Product, as: 'product' },
          { 
            model: Usuario, 
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email'] 
          },
          { 
            model: Warehouse, 
            as: 'destinationWarehouse' 
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
        },
        { 
          model: Warehouse, 
          as: 'destinationWarehouse' 
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
    
    if (filters.hasAvailableKilos) {
      where.availableKilos = { [Op.gt]: 0 };
    }
    
    if (filters.directToWarehouse !== undefined) {
      where.directToWarehouse = filters.directToWarehouse;
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
        },
        { 
          model: Warehouse, 
          as: 'destinationWarehouse' 
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
    const transaction = await sequelize.transaction();
    
    try {
      const entry = await TrailerEntry.findByPk(id, { transaction });
      
      if (!entry) {
        await transaction.rollback();
        throw new Error('Trailer entry not found');
      }
      
      // Si se cambia el producto, verificar que existe
      if (entryData.productId && entryData.productId !== entry.productId) {
        const product = await Product.findByPk(entryData.productId, { transaction });
        if (!product) {
          await transaction.rollback();
          throw new Error('Product not found');
        }
      }
      
      // Si se cambia el almacén, verificar que existe
      if (entryData.destinationWarehouseId && entryData.destinationWarehouseId !== entry.destinationWarehouseId) {
        const warehouse = await Warehouse.findByPk(entryData.destinationWarehouseId, { transaction });
        if (!warehouse) {
          await transaction.rollback();
          throw new Error('Warehouse not found');
        }
      }
      
      // Recalcular costo por kilo si se cambia el costo total o los kilos
      if ((entryData.totalCost && entryData.totalCost !== entry.totalCost) || 
          (entryData.kilos && entryData.kilos !== entry.kilos)) {
        const totalCost = entryData.totalCost !== undefined ? entryData.totalCost : entry.totalCost;
        const kilos = entryData.kilos !== undefined ? entryData.kilos : entry.kilos;
        
        if (totalCost && kilos > 0) {
          entryData.costPerKilo = parseFloat(totalCost) / parseFloat(kilos);
        }
      }
      
      // Si se actualiza la cantidad de kilos, asegurarse de que availableKilos se actualice proporcionalmente
      if (entryData.kilos !== undefined && entry.kilos !== entryData.kilos) {
        // Verificar si ya se usaron kilos
        const usedKilos = entry.kilos - entry.availableKilos;
        
        // No permitir reducir los kilos por debajo de lo que ya se ha usado
        if (entryData.kilos < usedKilos) {
          await transaction.rollback();
          throw new Error(`Cannot reduce kilos below already used amount (${usedKilos})`);
        }
        
        // Actualizar los kilos disponibles
        entryData.availableKilos = entryData.kilos - usedKilos;
      }
      
      // Si se está cambiando de directToWarehouse=false a true, y no se ha movido aún,
      // mover el producto al almacén
      if (!entry.directToWarehouse && entryData.directToWarehouse === true && 
          !entry.movedToWarehouse && entryData.destinationWarehouseId) {
        
        const warehouseId = entryData.destinationWarehouseId || entry.destinationWarehouseId;
        if (!warehouseId) {
          await transaction.rollback();
          throw new Error('Warehouse ID is required when setting directToWarehouse to true');
        }
        
        // Verificar que no se hayan usado kilos (no hay órdenes de manufactura)
        if (entry.kilos !== entry.availableKilos) {
          await transaction.rollback();
          throw new Error('Cannot set directToWarehouse to true when kilos have already been processed');
        }
        
        // Mover a inventario
        await Inventory.findOrCreate({
          where: {
            itemType: 'product',
            itemId: entry.productId,
            warehouseId: warehouseId
          },
          defaults: {
            quantity: 0
          },
          transaction
        });
        
        // Incrementar el inventario
        await sequelize.query(
          'UPDATE inventory SET quantity = quantity + ? WHERE item_type = ? AND item_id = ? AND warehouse_id = ?',
          {
            replacements: [entry.availableKilos, 'product', entry.productId, warehouseId],
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
        
        entryData.movedToWarehouse = true;
      }
      
      await entry.update(entryData, { transaction });
      
      await transaction.commit();
      
      // Retornar la entrada actualizada con sus relaciones
      return await TrailerEntry.findByPk(entry.id, {
        include: [
          { model: Product, as: 'product' },
          { 
            model: Usuario, 
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email'] 
          },
          { 
            model: Warehouse, 
            as: 'destinationWarehouse' 
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Elimina una entrada
   * @param {string} id - ID de la entrada
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteEntry(id) {
    const transaction = await sequelize.transaction();
    
    try {
      const entry = await TrailerEntry.findByPk(id, { transaction });
      
      if (!entry) {
        await transaction.rollback();
        throw new Error('Trailer entry not found');
      }
      
      // No permitir eliminar si tiene órdenes de manufactura
      if (entry.hasOrder) {
        await transaction.rollback();
        throw new Error('Cannot delete trailer entry with manufacturing orders');
      }
      
      // Si fue movido a almacén, revertir la operación
      if (entry.directToWarehouse && entry.movedToWarehouse && entry.destinationWarehouseId) {
        // Restar del inventario
        await sequelize.query(
          'UPDATE inventory SET quantity = quantity - ? WHERE item_type = ? AND item_id = ? AND warehouse_id = ?',
          {
            replacements: [entry.kilos, 'product', entry.productId, entry.destinationWarehouseId],
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
      }
      
      await entry.destroy({ transaction });
      
      await transaction.commit();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Actualiza los kilos disponibles de una entrada después de crear una orden
   * @param {string} id - ID de la entrada
   * @param {number} kilosToUse - Kilos a descontar
   * @param {boolean} setHasOrder - Si se debe marcar como con orden
   * @returns {Promise<Object>} Entrada actualizada
   */
  async updateAvailableKilos(id, kilosToUse, setHasOrder = true, retryCount = 3) {
    let attempt = 0;
    
    while (attempt < retryCount) {
      const transaction = await sequelize.transaction();
      
      try {
        const entry = await TrailerEntry.findByPk(id, { transaction });
        
        if (!entry) {
          await transaction.rollback();
          throw new Error('Trailer entry not found');
        }
        
        if (entry.availableKilos < kilosToUse) {
          await transaction.rollback();
          throw new Error(`Not enough available kilos. Available: ${entry.availableKilos}, Requested: ${kilosToUse}`);
        }
        
        // Actualizar kilos disponibles
        const newAvailableKilos = parseFloat(entry.availableKilos) - parseFloat(kilosToUse);
        
        const updateData = {
          availableKilos: newAvailableKilos
        };
        
        // Si se solicita, marcar como con orden
        if (setHasOrder && !entry.hasOrder) {
          updateData.hasOrder = true;
        }
        
        await entry.update(updateData, { transaction });
        
        await transaction.commit();
        return await this.getEntryById(id);
      } catch (error) {
        await transaction.rollback();
      
        if (error.name === 'SequelizeDatabaseError' && 
            error.parent && 
            error.parent.code === 'ER_LOCK_WAIT_TIMEOUT' && 
            attempt < 2) {
          console.log(`Lock timeout, retrying attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
        
        throw error;
      }
    }
  },

  /**
   * Obtiene las entradas de trailer que tienen kilos disponibles para procesar
   * @param {Object} filters - Filtros adicionales (ciudad, producto, etc.)
   * @returns {Promise<Array>} Lista de entradas disponibles
   */
  async getAvailableEntries(filters = {}) {
    const where = {
      availableKilos: { [Op.gt]: 0 },
      directToWarehouse: false // Solo las que no van directo a almacén
    };
    
    // Aplicar filtros adicionales
    if (filters.city) {
      where.city = filters.city;
    }
    
    if (filters.productId) {
      where.productId = filters.productId;
    }
    
    const entries = await TrailerEntry.findAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { 
          model: Usuario, 
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ],
      order: [['date', 'ASC']] // Primero las más antiguas
    });
    
    return entries;
  }
};

module.exports = trailerEntryService;