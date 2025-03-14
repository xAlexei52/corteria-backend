// src/services/inventoryService.js
const { Inventory, Warehouse, Product, Supply, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const inventoryService = {

/**
 * Obtiene detalles de un almacén
 * @param {string} warehouseId - ID del almacén
 * @returns {Promise<Object>} Detalles del almacén
 */
async getWarehouseDetails(warehouseId) {
    const warehouse = await Warehouse.findByPk(warehouseId);
    return warehouse;
  },
  /**
   * Actualiza o crea una entrada de inventario
   * @param {string} warehouseId - ID del almacén
   * @param {string} itemType - Tipo de ítem ('product' o 'supply')
   * @param {string} itemId - ID del ítem
   * @param {number} quantity - Cantidad a agregar (positivo) o restar (negativo)
   * @returns {Promise<Object>} Entrada de inventario actualizada
   */
  async updateInventory(warehouseId, itemType, itemId, quantity) {
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar si ya existe una entrada para este ítem en este almacén
      let inventory = await Inventory.findOne({
        where: {
          warehouseId,
          itemType,
          itemId
        },
        transaction
      });
      
      if (inventory) {
        // Actualizar cantidad existente
        await inventory.update({
          quantity: sequelize.literal(`quantity + ${quantity}`)
        }, { transaction });
      } else {
        // Crear nueva entrada de inventario
        inventory = await Inventory.create({
          warehouseId,
          itemType,
          itemId,
          quantity
        }, { transaction });
      }
      
      await transaction.commit();
      
      // Refrescar la entrada para obtener los valores actualizados
      return await Inventory.findByPk(inventory.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  
  /**
   * Obtiene el inventario actual de un ítem específico
   * @param {string} warehouseId - ID del almacén
   * @param {string} itemType - Tipo de ítem ('product' o 'supply')
   * @param {string} itemId - ID del ítem
   * @returns {Promise<number>} Cantidad en inventario
   */
  async getItemInventory(warehouseId, itemType, itemId) {
    const inventory = await Inventory.findOne({
      where: {
        warehouseId,
        itemType,
        itemId
      }
    });
    
    return inventory ? inventory.quantity : 0;
  },
  
  /**
   * Lista el inventario con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de inventario y metadatos de paginación
   */
  async listInventory(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros para el inventario
    if (filters.itemType) {
      where.itemType = filters.itemType;
    }
    
    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Construir condiciones para almacenes según ciudad
    const warehouseWhere = {};
    if (filters.city) {
      warehouseWhere.city = filters.city;
    }
    
    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    } else {
      // Si no se especifica almacén, filtrar por ciudad
      if (filters.city) {
        // Obtener IDs de almacenes de esta ciudad
        const warehouses = await Warehouse.findAll({
          where: { city: filters.city },
          attributes: ['id']
        });
        where.warehouseId = {
          [Op.in]: warehouses.map(w => w.id)
        };
      }
    }
    
    // Ejecutar consulta
    const { count, rows } = await Inventory.findAndCountAll({
      where,
      include: [
        {
          model: Warehouse,
          as: 'warehouse',
          where: Object.keys(warehouseWhere).length > 0 ? warehouseWhere : undefined
        },
        ...(filters.itemType === 'product' ? [
          {
            model: Product,
            as: 'product'
          }
        ] : []),
        ...(filters.itemType === 'supply' ? [
          {
            model: Supply,
            as: 'supply'
          }
        ] : [])
      ],
      order: [
        [{ model: Warehouse, as: 'warehouse' }, 'city', 'ASC'],
        [{ model: Warehouse, as: 'warehouse' }, 'name', 'ASC'],
        ['itemType', 'ASC']
      ],
      limit,
      offset
    });
    
    return {
      inventory: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },
  
  /**
   * Obtiene un resumen del inventario de productos por ciudad
   * @param {string} city - Ciudad a consultar
   * @returns {Promise<Object>} Resumen de inventario
   */
  async getProductInventorySummaryByCity(city) {
    // Obtener almacenes de la ciudad
    const warehouses = await Warehouse.findAll({
      where: { city, active: true },
      attributes: ['id', 'name']
    });
    
    const warehouseIds = warehouses.map(w => w.id);
    
    // Consultar inventario por producto para estos almacenes
    const products = await Product.findAll({
      where: { active: true },
      attributes: ['id', 'name', 'description'],
      include: [
        {
          model: Inventory,
          as: 'inventory',
          where: {
            itemType: 'product',
            warehouseId: {
              [Op.in]: warehouseIds
            }
          },
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'name']
            }
          ],
          required: false
        }
      ]
    });
    
    // Calcular totales por producto
    const productSummary = products.map(product => {
      const productData = product.toJSON();
      
      // Calcular total por producto
      const totalQuantity = productData.inventory.reduce((sum, inv) => sum + parseFloat(inv.quantity), 0);
      
      // Desglose por almacén
      const warehouseBreakdown = warehouses.map(warehouse => {
        const inventoryItem = productData.inventory.find(inv => inv.warehouseId === warehouse.id);
        return {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          quantity: inventoryItem ? parseFloat(inventoryItem.quantity) : 0
        };
      });
      
      return {
        productId: productData.id,
        productName: productData.name,
        description: productData.description,
        totalQuantity,
        warehouseBreakdown
      };
    });
    
    return {
      city,
      totalProducts: productSummary.length,
      products: productSummary
    };
  },
  
  /**
   * Transfiere inventario entre almacenes
   * @param {Object} transferData - Datos de la transferencia
   * @returns {Promise<Object>} Resultado de la transferencia
   */
  async transferInventory(transferData) {
    const { sourceWarehouseId, destinationWarehouseId, itemType, itemId, quantity } = transferData;
    
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que existan los almacenes
      const [sourceWarehouse, destinationWarehouse] = await Promise.all([
        Warehouse.findByPk(sourceWarehouseId),
        Warehouse.findByPk(destinationWarehouseId)
      ]);
      
      if (!sourceWarehouse) {
        await transaction.rollback();
        throw new Error('Source warehouse not found');
      }
      
      if (!destinationWarehouse) {
        await transaction.rollback();
        throw new Error('Destination warehouse not found');
      }
      
      // Verificar que haya suficiente inventario en el almacén de origen
      const sourceInventory = await Inventory.findOne({
        where: {
          warehouseId: sourceWarehouseId,
          itemType,
          itemId
        },
        transaction
      });
      
      if (!sourceInventory || sourceInventory.quantity < quantity) {
        await transaction.rollback();
        throw new Error(`Insufficient inventory in source warehouse: ${sourceInventory ? sourceInventory.quantity : 0} available`);
      }
      
      // Restar del almacén de origen
      await sourceInventory.update({
        quantity: sequelize.literal(`quantity - ${quantity}`)
      }, { transaction });
      
      // Sumar al almacén de destino
      let destinationInventory = await Inventory.findOne({
        where: {
          warehouseId: destinationWarehouseId,
          itemType,
          itemId
        },
        transaction
      });
      
      if (destinationInventory) {
        await destinationInventory.update({
          quantity: sequelize.literal(`quantity + ${quantity}`)
        }, { transaction });
      } else {
        destinationInventory = await Inventory.create({
          warehouseId: destinationWarehouseId,
          itemType,
          itemId,
          quantity
        }, { transaction });
      }
      
      await transaction.commit();
      
      // Retornar resultado de la transferencia
      const [updatedSourceInventory, updatedDestinationInventory] = await Promise.all([
        Inventory.findOne({
          where: {
            warehouseId: sourceWarehouseId,
            itemType,
            itemId
          },
          include: [
            {
              model: Warehouse,
              as: 'warehouse'
            }
          ]
        }),
        Inventory.findOne({
          where: {
            warehouseId: destinationWarehouseId,
            itemType,
            itemId
          },
          include: [
            {
              model: Warehouse,
              as: 'warehouse'
            }
          ]
        })
      ]);
      
      return {
        transferred: quantity,
        source: updatedSourceInventory,
        destination: updatedDestinationInventory
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

module.exports = inventoryService;