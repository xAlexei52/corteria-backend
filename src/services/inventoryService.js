// src/services/inventoryService.js (actualizado para cityId)
const { Inventory, Warehouse, Product, Supply, City, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const inventoryService = {
  /**
   * Obtiene detalles de un almacén
   * @param {string} warehouseId - ID del almacén
   * @returns {Promise<Object>} Detalles del almacén
   */
  async getWarehouseDetails(warehouseId) {
    const warehouse = await Warehouse.findByPk(warehouseId, {
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    return warehouse;
  },

  /**
   * Actualiza o crea una entrada de inventario
   * @param {string} warehouseId - ID del almacén
   * @param {string} itemType - Tipo de ítem ('product' o 'supply')
   * @param {string} itemId - ID del ítem
   * @param {number} quantity - Cantidad a agregar (positivo) o restar (negativo)
   * @param {Transaction} transaction - Transacción opcional
   * @returns {Promise<Object>} Entrada de inventario actualizada
   */
  async updateInventory(warehouseId, itemType, itemId, quantity, transaction = null) {
    const useTransaction = transaction !== null;
    let ownTransaction = null;
    
    try {
      if (!useTransaction) {
        ownTransaction = await sequelize.transaction();
        transaction = ownTransaction;
      }
      
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
      
      if (ownTransaction) {
        await ownTransaction.commit();
      }
      
      // Refrescar la entrada para obtener los valores actualizados
      return await Inventory.findByPk(inventory.id);
    } catch (error) {
      if (ownTransaction) {
        await ownTransaction.rollback();
      }
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
    
    return inventory ? parseFloat(inventory.quantity) : 0;
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
    if (filters.cityId) {
      warehouseWhere.cityId = filters.cityId;
    }
    
    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    } else {
      // Si no se especifica almacén, filtrar por ciudad
      if (filters.cityId) {
        // Obtener IDs de almacenes de esta ciudad
        const warehouses = await Warehouse.findAll({
          where: { cityId: filters.cityId },
          attributes: ['id']
        });
        where.warehouseId = {
          [Op.in]: warehouses.map(w => w.id)
        };
      }
    }
    
    // Modificar la consulta para incluir correctamente las relaciones
    const { count, rows } = await Inventory.findAndCountAll({
      where,
      include: [
        {
          model: Warehouse,
          as: 'warehouse',
          where: Object.keys(warehouseWhere).length > 0 ? warehouseWhere : undefined,
          include: [
            {
              model: City,
              as: 'city',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        ...(filters.itemType === 'product' ? [
          {
            model: Product,
            as: 'product',
            required: false
          }
        ] : []),
        ...(filters.itemType === 'supply' ? [
          {
            model: Supply,
            as: 'supply',
            required: false
          }
        ] : [])
      ],
      order: [
        [{ model: Warehouse, as: 'warehouse' }, { model: City, as: 'city' }, 'name', 'ASC'],
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
   * @param {string} cityId - ID de la ciudad a consultar
   * @returns {Promise<Object>} Resumen de inventario
   */
  async getProductInventorySummaryByCity(cityId) {
    // Verificar que la ciudad existe
    const city = await City.findByPk(cityId, {
      attributes: ['id', 'name', 'code']
    });
    
    if (!city) {
      throw new Error('City not found');
    }
    
    // Obtener almacenes de la ciudad
    const warehouses = await Warehouse.findAll({
      where: { cityId, active: true },
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
      const totalQuantity = productData.inventory 
        ? productData.inventory.reduce((sum, inv) => sum + parseFloat(inv.quantity), 0)
        : 0;
      
      // Desglose por almacén
      const warehouseBreakdown = warehouses.map(warehouse => {
        const inventoryItem = productData.inventory
          ? productData.inventory.find(inv => inv.warehouseId === warehouse.id)
          : null;
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
        Warehouse.findByPk(sourceWarehouseId, {
          include: [{ model: City, as: 'city', attributes: ['id', 'name', 'code'] }]
        }),
        Warehouse.findByPk(destinationWarehouseId, {
          include: [{ model: City, as: 'city', attributes: ['id', 'name', 'code'] }]
        })
      ]);
      
      if (!sourceWarehouse) {
        await transaction.rollback();
        throw new Error('Source warehouse not found');
      }
      
      if (!destinationWarehouse) {
        await transaction.rollback();
        throw new Error('Destination warehouse not found');
      }
      
      // Verificar que los almacenes pertenezcan a la misma ciudad
      if (sourceWarehouse.cityId !== destinationWarehouse.cityId) {
        await transaction.rollback();
        throw new Error('Warehouses must be in the same city to transfer inventory');
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
              as: 'warehouse',
              include: [{ model: City, as: 'city', attributes: ['id', 'name', 'code'] }]
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
              as: 'warehouse',
              include: [{ model: City, as: 'city', attributes: ['id', 'name', 'code'] }]
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