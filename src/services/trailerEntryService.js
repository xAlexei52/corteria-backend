// src/services/trailerEntryService.js (modificado)
const { TrailerEntry, Product, Usuario, Warehouse, Inventory, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const inventoryService = require('./inventoryService');

const trailerEntryService = {
/**
 * Crea una nueva entrada de trailer
 * @param {Object} entryData - Datos de la entrada
 * @param {string} userId - ID del usuario que crea la entrada
 * @returns {Promise<Object>} Entrada creada
 */
async createEntry(entryData, userId) {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    // Verificar que existe el producto
    const product = await Product.findByPk(entryData.productId, { transaction });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Si no necesita procesamiento, verificar que existe el almacén destino
    if (entryData.needsProcessing === false) {
      if (!entryData.targetWarehouseId) {
        throw new Error('Target warehouse is required when entry does not need processing');
      }
      
      const targetWarehouse = await Warehouse.findByPk(entryData.targetWarehouseId, { transaction });
      if (!targetWarehouse) {
        throw new Error('Target warehouse not found');
      }
    }
    
    // Preparar datos para la creación
    const createData = {
      ...entryData,
      createdBy: userId,
      // availableKilos y processingStatus se manejan en el hook beforeCreate
    };
    
    // Crear la entrada
    const entry = await TrailerEntry.create(createData, { transaction });
    
    // Si no necesita procesamiento, agregar directamente al inventario
    if (entryData.needsProcessing === false && entryData.targetWarehouseId) {
      await inventoryService.updateInventory(
        entryData.targetWarehouseId,
        'product',
        entryData.productId,
        parseFloat(entryData.kilos),
        transaction
      );
    }
    
    await transaction.commit();
    
    // Cargar la entrada con sus relaciones (fuera de la transacción)
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
          as: 'targetWarehouse'
        }
      ]
    });
  } catch (error) {
    // Solo hacer rollback si la transacción está activa
    if (transaction) await transaction.rollback();
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
          as: 'targetWarehouse'
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
    
    if (filters.processingStatus) {
      where.processingStatus = filters.processingStatus;
    }
    
    if (filters.needsProcessing !== undefined) {
      where.needsProcessing = filters.needsProcessing;
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
          as: 'targetWarehouse'
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
        const product = await Product.findByPk(entryData.productId);
        if (!product) {
          await transaction.rollback();
          throw new Error('Product not found');
        }
      }
      
      // Si se cambia needsProcessing de true a false, verificar targetWarehouseId
      if (entry.needsProcessing === true && entryData.needsProcessing === false) {
        if (!entryData.targetWarehouseId) {
          await transaction.rollback();
          throw new Error('Target warehouse is required when entry does not need processing');
        }
        
        const targetWarehouse = await Warehouse.findByPk(entryData.targetWarehouseId);
        if (!targetWarehouse) {
          await transaction.rollback();
          throw new Error('Target warehouse not found');
        }
        
        // Verificar si ya tiene órdenes asignadas
        if (entry.processingStatus === 'partial' || entry.processingStatus === 'completed') {
          await transaction.rollback();
          throw new Error('Cannot change processing requirement when entry already has manufacturing orders');
        }
        
        // Actualizar estado y kilos disponibles
        entryData.processingStatus = 'not_needed';
        entryData.availableKilos = 0;
        
        // Añadir al inventario
        await inventoryService.updateInventory(
          entryData.targetWarehouseId,
          'product',
          entryData.productId || entry.productId,
          parseFloat(entry.kilos),
          transaction
        );
      }
      
      // Si se cambia needsProcessing de false a true
      if (entry.needsProcessing === false && entryData.needsProcessing === true) {
        // Verificar si ya se añadió al inventario
        if (entry.processingStatus === 'not_needed') {
          await transaction.rollback();
          throw new Error('Cannot change processing requirement when entry is already in inventory');
        }
        
        // Actualizar estado y kilos disponibles
        entryData.processingStatus = 'pending';
        entryData.availableKilos = entry.kilos;
      }
      
      // Si se actualiza costo, recalcular costo por kilo
      if (entryData.entryCost !== undefined && entryData.entryCost !== null) {
        const kilos = entryData.kilos || entry.kilos;
        entryData.costPerKilo = parseFloat((entryData.entryCost / kilos).toFixed(2));
      } else if (entryData.kilos !== undefined && entry.entryCost) {
        // Si se actualiza kilos y ya hay un costo, recalcular
        entryData.costPerKilo = parseFloat((entry.entryCost / entryData.kilos).toFixed(2));
      }
      
      // Si se actualiza kilos, actualizar kilos disponibles
      if (entryData.kilos !== undefined && entry.needsProcessing) {
        const usedKilos = entry.kilos - (entry.availableKilos || 0);
        entryData.availableKilos = Math.max(0, entryData.kilos - usedKilos);
        
        // Actualizar estado de procesamiento si corresponde
        if (entryData.availableKilos <= 0 && entry.processingStatus !== 'completed') {
          entryData.processingStatus = 'completed';
        } else if (entryData.availableKilos > 0 && entry.processingStatus === 'completed') {
          entryData.processingStatus = 'partial';
        }
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
            as: 'targetWarehouse'
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
      const entry = await TrailerEntry.findByPk(id, {
        include: [
          {
            model: ManufacturingOrder,
            as: 'manufacturingOrders'
          }
        ],
        transaction
      });
      
      if (!entry) {
        await transaction.rollback();
        throw new Error('Trailer entry not found');
      }
      
      // Verificar si tiene órdenes de manufactura
      if (entry.manufacturingOrders && entry.manufacturingOrders.length > 0) {
        await transaction.rollback();
        throw new Error('Cannot delete trailer entry with manufacturing orders');
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
   * Actualiza el estado de procesamiento de una entrada
   * @param {string} id - ID de la entrada
   * @param {number} usedKilos - Kilos a marcar como usados
   * @returns {Promise<Object>} Entrada actualizada
   */
  /**
 * Actualiza el estado de procesamiento de una entrada
 * @param {string} id - ID de la entrada
 * @param {number} usedKilos - Kilos a marcar como usados
 * @param {Transaction} externalTransaction - Transacción externa (opcional)
 * @returns {Promise<Object>} Entrada actualizada
 */
async updateProcessingStatus(id, usedKilos, externalTransaction = null) {
  let transaction = externalTransaction;
  let needToCommit = false;
  
  try {
    // Solo creamos una nueva transacción si no se proporcionó una externa
    if (!transaction) {
      transaction = await sequelize.transaction();
      needToCommit = true;
    }
    
    // Obtener la entrada con bloqueo para actualización
    const entry = await TrailerEntry.findByPk(id, { 
      transaction,
      lock: true // Bloquear la fila para evitar actualizaciones concurrentes
    });
    
    if (!entry) {
      throw new Error('Trailer entry not found');
    }
    
    if (!entry.needsProcessing) {
      throw new Error('This entry does not require processing');
    }
    
    if (usedKilos > entry.availableKilos) {
      throw new Error(`Cannot use more than available kilos (${entry.availableKilos})`);
    }
    
    // Calcular nuevos kilos disponibles
    const newAvailableKilos = parseFloat((entry.availableKilos - usedKilos).toFixed(2));
    
    // Determinar nuevo estado de procesamiento
    let processingStatus = entry.processingStatus;
    if (newAvailableKilos <= 0) {
      processingStatus = 'completed';
    } else if (processingStatus === 'pending') {
      processingStatus = 'partial';
    }
    
    // Actualizar en la base de datos
    await entry.update({
      availableKilos: newAvailableKilos,
      processingStatus
    }, { transaction });
    
    // Hacemos commit solo si nosotros creamos la transacción
    if (needToCommit) {
      await transaction.commit();
      needToCommit = false;
    }
    
    // Retornar la entrada actualizada
    // Nota: hacemos esta consulta fuera de la transacción para evitar bloqueos
    return await TrailerEntry.findByPk(id);
    
  } catch (error) {
    // Solo hacemos rollback si nosotros creamos la transacción
    if (needToCommit && transaction) {
      await transaction.rollback();
    }
    throw error;
  }
}
};

module.exports = trailerEntryService;