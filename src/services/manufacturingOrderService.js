// src/services/manufacturingOrderService.js
const { 
    ManufacturingOrder, 
    OrderExpense, 
    TrailerEntry, 
    Product, 
    Usuario, 
    Warehouse,
    Recipe,
    RecipeSupply,
    Supply,
    FixedExpense,
    sequelize 
  } = require('../config/database');
  const inventoryService = require('./inventoryService');
  const { Op } = require('sequelize');
  const { v4: uuidv4 } = require('uuid');
  
  const manufacturingOrderService = {
    /**
     * Genera un número de orden único
     * @returns {string} Número de orden
     */
    generateOrderNumber() {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      return `ORD-${year}${month}${day}-${random}`;
    },
  
    /**
     * Crea una nueva orden de manufactura
     * @param {Object} orderData - Datos de la orden
     * @param {string} userId - ID del usuario que crea la orden
     * @returns {Promise<Object>} Orden creada
     */
    async createOrder(orderData, userId) {
      const transaction = await sequelize.transaction();
      
      try {
        // Verificar que existe la entrada de trailer
        const trailerEntry = await TrailerEntry.findByPk(orderData.trailerEntryId);
        
        if (!trailerEntry) {
          await transaction.rollback();
          throw new Error('Trailer entry not found');
        }
        
        // Verificar que la entrada no tenga ya una orden
        if (trailerEntry.hasOrder) {
          await transaction.rollback();
          throw new Error('This trailer entry already has a manufacturing order');
        }
        
        // Verificar que existe el producto
        const product = await Product.findByPk(orderData.productId);
        
        if (!product) {
          await transaction.rollback();
          throw new Error('Product not found');
        }
        
        // Verificar que existe el almacén de destino
        const warehouse = await Warehouse.findByPk(orderData.destinationWarehouseId);
        
        if (!warehouse) {
          await transaction.rollback();
          throw new Error('Destination warehouse not found');
        }
        
        // Verificar que los kilos a procesar no excedan los kilos disponibles
        if (orderData.kilosToProcess > trailerEntry.kilos) {
          await transaction.rollback();
          throw new Error(`Cannot process more than available kilos (${trailerEntry.kilos})`);
        }
        
        // Generar número de orden único
        const orderNumber = this.generateOrderNumber();
        
        // Crear la orden
        const order = await ManufacturingOrder.create({
          orderNumber,
          status: 'pending',
          kilosToProcess: orderData.kilosToProcess,
          boxesEstimated: orderData.boxesEstimated || null,
          notes: orderData.notes || null,
          city: trailerEntry.city, // La ciudad se toma de la entrada de trailer
          trailerEntryId: orderData.trailerEntryId,
          productId: orderData.productId,
          createdById: userId,
          destinationWarehouseId: orderData.destinationWarehouseId
        }, { transaction });
        
        await sequelize.query(
          'UPDATE trailer_entries SET has_order = true WHERE id = ?',
          {
            replacements: [orderData.trailerEntryId],
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
        
        await transaction.commit();
        
        // Retornar la orden con sus relaciones
        return await this.getOrderById(order.id);
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
  
    /**
     * Obtiene una orden por ID
     * @param {string} id - ID de la orden
     * @returns {Promise<Object>} Orden encontrada
     */
    async getOrderById(id) {
      const order = await ManufacturingOrder.findByPk(id, {
        include: [
          {
            model: TrailerEntry,
            as: 'trailerEntry'
          },
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Recipe,
                as: 'recipe'
              }
            ]
          },
          {
            model: Usuario,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Warehouse,
            as: 'destinationWarehouse'
          },
          {
            model: OrderExpense,
            as: 'expenses'
          }
        ]
      });
      
      if (!order) {
        throw new Error('Manufacturing order not found');
      }
      
      return order;
    },
  
    /**
     * Lista órdenes con filtros opcionales
     * @param {Object} filters - Filtros para la búsqueda
     * @param {Object} pagination - Opciones de paginación
     * @returns {Promise<Object>} Lista de órdenes y metadatos de paginación
     */
    async listOrders(filters = {}, pagination = {}) {
      const where = {};
      
      // Aplicar filtros
      if (filters.city) {
        where.city = filters.city;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.startDate && filters.endDate) {
        where.createdAt = {
          [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
        };
      } else if (filters.startDate) {
        where.createdAt = { [Op.gte]: new Date(filters.startDate) };
      } else if (filters.endDate) {
        where.createdAt = { [Op.lte]: new Date(filters.endDate) };
      }
      
      if (filters.productId) {
        where.productId = filters.productId;
      }
      
      // Configurar paginación
      const limit = pagination.limit || 10;
      const page = pagination.page || 1;
      const offset = (page - 1) * limit;
      
      // Ejecutar consulta
      const { count, rows } = await ManufacturingOrder.findAndCountAll({
        where,
        include: [
          {
            model: TrailerEntry,
            as: 'trailerEntry'
          },
          {
            model: Product,
            as: 'product'
          },
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
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      
      return {
        orders: rows,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      };
    },
  
    /**
     * Actualiza el estado de una orden
     * @param {string} id - ID de la orden
     * @param {string} status - Nuevo estado
     * @param {Object} additionalData - Datos adicionales según el estado
     * @returns {Promise<Object>} Orden actualizada
     */
    async updateOrderStatus(id, status, additionalData = {}) {
      const transaction = await sequelize.transaction();
      
      try {
        const order = await ManufacturingOrder.findByPk(id);
        
        if (!order) {
          await transaction.rollback();
          throw new Error('Manufacturing order not found');
        }
        
        const updateData = { status };
        
        // Agregar datos según el estado
        switch (status) {
          case 'in_progress':
            updateData.startDate = additionalData.startDate || new Date();
            break;
          case 'completed':
            updateData.endDate = additionalData.endDate || new Date();
            
            // Si se completó y hay costos, calcular costo por kilo
            if (order.totalCost) {
              updateData.costPerKilo = parseFloat((order.totalCost / order.kilosToProcess).toFixed(2));
            }
            
            // Actualizar inventario en el almacén de destino
            await inventoryService.updateInventory(
                order.destinationWarehouseId,
                'product',
                order.productId,
                order.kilosToProcess
            );

            break;
          case 'cancelled':
            // Si se cancela, liberar la entrada de trailer
            await TrailerEntry.update(
              { hasOrder: false },
              { 
                where: { id: order.trailerEntryId },
                transaction
              }
            );
            break;
        }
        
        await order.update(updateData, { transaction });
        
        await transaction.commit();
        
        return await this.getOrderById(id);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
  
    /**
     * Elimina una orden (solo si está en estado pendiente)
     * @param {string} id - ID de la orden
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async deleteOrder(id) {
      const transaction = await sequelize.transaction();
      
      try {
        const order = await ManufacturingOrder.findByPk(id);
        
        if (!order) {
          await transaction.rollback();
          throw new Error('Manufacturing order not found');
        }
        
        // Solo se pueden eliminar órdenes pendientes
        if (order.status !== 'pending') {
          await transaction.rollback();
          throw new Error(`Cannot delete order with status: ${order.status}. Only pending orders can be deleted.`);
        }
        
        // Liberar la entrada de trailer
        await TrailerEntry.update(
          { hasOrder: false },
          { 
            where: { id: order.trailerEntryId },
            transaction
          }
        );
        
        // Eliminar los gastos asociados
        await OrderExpense.destroy({
          where: { manufacturingOrderId: id },
          transaction
        });
        
        // Eliminar la orden
        await order.destroy({ transaction });
        
        await transaction.commit();
        
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
  
    /**
     * Calcula los gastos para una orden de manufactura
     * @param {string} orderId - ID de la orden
     * @returns {Promise<Object>} Resumen de gastos
     */
    async calculateExpenses(orderId) {
      const transaction = await sequelize.transaction();
      
      try {
        const order = await this.getOrderById(orderId);
        
        if (!order) {
          await transaction.rollback();
          throw new Error('Manufacturing order not found');
        }
        
        // Verificar que el producto tenga una receta asignada
        if (!order.product.recipe) {
          await transaction.rollback();
          throw new Error(`Product ${order.product.name} does not have a recipe assigned`);
        }
        
        // Obtener los insumos de la receta
        const recipeWithSupplies = await Recipe.findByPk(order.product.recipe.id, {
          include: [
            {
              model: RecipeSupply,
              as: 'supplies',
              include: [
                {
                  model: Supply,
                  as: 'supply'
                }
              ]
            }
          ]
        });
        
        const supplies = recipeWithSupplies.supplies;
        
        // Calcular gastos de insumos
        let totalSupplyCost = 0;
        const supplyExpenses = [];
        
        for (const recipeSupply of supplies) {
          const supply = recipeSupply.supply;
          const quantityNeeded = recipeSupply.quantity * order.kilosToProcess;
          const cost = quantityNeeded * supply.costPerUnit;
          
          supplyExpenses.push({
            id: uuidv4(),
            name: supply.name,
            amount: parseFloat(cost.toFixed(2)),
            type: 'supply',
            notes: `${quantityNeeded.toFixed(3)} ${supply.unit} at ${supply.costPerUnit} per ${supply.unit}`,
            manufacturingOrderId: orderId
          });
          
          totalSupplyCost += cost;
        }
        
        // Calcular gastos fijos diarios para la ciudad
        const fixedExpenses = await FixedExpense.findAll({
          where: {
            city: order.city,
            active: true
          }
        });
        
        let totalFixedCost = 0;
        const fixedExpensesEntries = [];
        
        // Calcular días de procesamiento (o usar 1 si no hay fechas de inicio/fin)
        let processingDays = 1;
        
        if (order.startDate && order.endDate) {
          const start = new Date(order.startDate);
          const end = new Date(order.endDate);
          const diffTime = Math.abs(end - start);
          processingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Al menos 1 día
        }
        
        for (const expense of fixedExpenses) {
          // Convertir gasto al equivalente diario
          let dailyAmount = 0;
          
          switch (expense.period) {
            case 'daily':
              dailyAmount = expense.amount;
              break;
            case 'weekly':
              dailyAmount = expense.amount / 7;
              break;
            case 'monthly':
              dailyAmount = expense.amount / 30;
              break;
            case 'yearly':
              dailyAmount = expense.amount / 365;
              break;
            default:
              dailyAmount = expense.amount / 30; // Por defecto mensual
          }
          
          // Calcular costo para los días de procesamiento
          const cost = dailyAmount * processingDays;
          
          fixedExpensesEntries.push({
            id: uuidv4(),
            name: expense.name,
            amount: parseFloat(cost.toFixed(2)),
            type: 'fixed',
            notes: `Daily cost: ${dailyAmount.toFixed(2)} for ${processingDays} days`,
            manufacturingOrderId: orderId
          });
          
          totalFixedCost += cost;
        }
        
        // Eliminar gastos existentes
        await OrderExpense.destroy({
          where: { manufacturingOrderId: orderId },
          transaction
        });
        
        // Crear nuevos gastos
        await OrderExpense.bulkCreate([...supplyExpenses, ...fixedExpensesEntries], { transaction });
        
        // Actualizar costo total de la orden
        const totalCost = totalSupplyCost + totalFixedCost;
        const costPerKilo = parseFloat((totalCost / order.kilosToProcess).toFixed(2));

        const utilityPerKilo = parseFloat(order.product.pricePerKilo) - costPerKilo;
        const utilityPercentage = (utilityPerKilo / parseFloat(order.product.pricePerKilo)) * 100;
        
        await order.update({
          totalCost,
          costPerKilo
        }, { transaction });
        
        await transaction.commit();
        
        // Retornar resumen de gastos
        return {
          orderId,
          orderNumber: order.orderNumber,
          product: order.product.name,
          kilosToProcess: order.kilosToProcess,
          supplyCost: parseFloat(totalSupplyCost.toFixed(2)),
          fixedCost: parseFloat(totalFixedCost.toFixed(2)),
          totalCost: parseFloat(totalCost.toFixed(2)),
          costPerKilo,
          expenses: [...supplyExpenses, ...fixedExpensesEntries],
          profitability: {
            sellingPricePerKilo: parseFloat(order.product.pricePerKilo),
            utilityPerKilo: utilityPerKilo.toFixed(2),
            utilityPercentage: utilityPercentage.toFixed(2),
            totalUtility: (utilityPerKilo * order.kilosToProcess).toFixed(2)
          }
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    /**
 * Obtiene análisis de gastos por producto en un período dado
 * @param {Object} params - Parámetros de búsqueda
 * @param {string} params.productId - ID del producto (opcional)
 * @param {string} params.startDate - Fecha inicial (opcional)
 * @param {string} params.endDate - Fecha final (opcional)
 * @param {string} params.city - Ciudad (opcional)
 * @returns {Promise<Object>} Análisis de gastos
 */
async getProductExpenseAnalysis(params = {}) {
  const { productId, startDate, endDate, city } = params;
  
  const where = {};
  
  // Filtrar por producto si se proporciona
  if (productId) {
    where.productId = productId;
  }
  
  // Filtrar por ciudad si se proporciona
  if (city) {
    where.city = city;
  }
  
  // Filtrar por rango de fechas
  if (startDate && endDate) {
    where.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  } else if (startDate) {
    where.createdAt = { [Op.gte]: new Date(startDate) };
  } else if (endDate) {
    where.createdAt = { [Op.lte]: new Date(endDate) };
  }
  
  // Obtener órdenes que cumplan los criterios
  const orders = await ManufacturingOrder.findAll({
    where,
    include: [
      {
        model: Product,
        as: 'product'
      },
      {
        model: OrderExpense,
        as: 'expenses'
      }
    ]
  });
  
  if (orders.length === 0) {
    return {
      message: 'No orders found with the specified criteria',
      data: []
    };
  }
  
  // Agrupar órdenes por producto
  const productGroups = {};
  
  orders.forEach(order => {
    const productId = order.productId;
    const productName = order.product.name;
    
    if (!productGroups[productId]) {
      productGroups[productId] = {
        productId,
        productName,
        orders: [],
        totalKilos: 0,
        totalCost: 0,
        expensesByType: {
          supply: 0,
          fixed: 0,
          other: 0
        }
      };
    }
    
    // Añadir datos de la orden
    productGroups[productId].orders.push({
      id: order.id,
      orderNumber: order.orderNumber,
      kilos: parseFloat(order.kilosToProcess),
      cost: parseFloat(order.totalCost),
      costPerKilo: parseFloat(order.costPerKilo),
      date: order.createdAt
    });
    
    // Acumular totales
    productGroups[productId].totalKilos += parseFloat(order.kilosToProcess);
    productGroups[productId].totalCost += parseFloat(order.totalCost);
    
    // Acumular gastos por tipo
    order.expenses.forEach(expense => {
      productGroups[productId].expensesByType[expense.type] += parseFloat(expense.amount);
    });
  });
  
  // Calcular promedios y realizar análisis adicional
  const productAnalysis = Object.values(productGroups).map(group => {
    const avgCostPerKilo = group.totalCost / group.totalKilos;
    const avgPrice = parseFloat(orders.find(o => o.productId === group.productId).product.pricePerKilo);
    const avgProfit = avgPrice - avgCostPerKilo;
    const profitPercentage = (avgProfit / avgPrice) * 100;
    
    // Calcular proporción de cada tipo de gasto
    const totalExpenses = group.expensesByType.supply + group.expensesByType.fixed + group.expensesByType.other;
    const expensePercentages = {
      supply: (group.expensesByType.supply / totalExpenses) * 100,
      fixed: (group.expensesByType.fixed / totalExpenses) * 100,
      other: (group.expensesByType.other / totalExpenses) * 100
    };
    
    return {
      productId: group.productId,
      productName: group.productName,
      totalKilosProcessed: group.totalKilos.toFixed(2),
      totalCost: group.totalCost.toFixed(2),
      averageCostPerKilo: avgCostPerKilo.toFixed(2),
      averageProfitPerKilo: avgProfit.toFixed(2),
      profitabilityPercentage: profitPercentage.toFixed(2),
      ordersCount: group.orders.length,
      expenseAnalysis: {
        supplyExpenses: {
          total: group.expensesByType.supply.toFixed(2),
          percentage: expensePercentages.supply.toFixed(2)
        },
        fixedExpenses: {
          total: group.expensesByType.fixed.toFixed(2),
          percentage: expensePercentages.fixed.toFixed(2)
        },
        otherExpenses: {
          total: group.expensesByType.other.toFixed(2),
          percentage: expensePercentages.other.toFixed(2)
        }
      }
    };
  });
  
  return {
    period: {
      start: startDate || 'All time',
      end: endDate || 'Current date'
    },
    products: productAnalysis
  };
},
  // Añadir dentro de manufacturingOrderService.js

/**
 * Calcula la utilidad para una orden de manufactura
 * @param {string} orderId - ID de la orden
 * @returns {Promise<Object>} Información de utilidad
 */
async calculateProfitability(orderId) {
  const order = await this.getOrderById(orderId);
  
  if (!order) {
    throw new Error('Manufacturing order not found');
  }
  
  // Verificar que exista el costo por kilo y el producto tenga precio
  if (!order.costPerKilo || !order.product.pricePerKilo) {
    throw new Error('Cost per kilo or selling price not available');
  }
  
  const costPerKilo = parseFloat(order.costPerKilo);
  const pricePerKilo = parseFloat(order.product.pricePerKilo);
  const kilosToProcess = parseFloat(order.kilosToProcess);
  
  // Calcular utilidades
  const profitPerKilo = pricePerKilo - costPerKilo;
  const profitPercentage = (profitPerKilo / pricePerKilo) * 100;
  const totalProfit = profitPerKilo * kilosToProcess;
  
  // Obtener y categorizar los gastos para un mejor desglose
  const expenses = await OrderExpense.findAll({
    where: { manufacturingOrderId: orderId }
  });
  
  // Agrupar por tipo
  const supplyExpenses = expenses.filter(e => e.type === 'supply');
  const fixedExpenses = expenses.filter(e => e.type === 'fixed');
  const otherExpenses = expenses.filter(e => e.type === 'other');
  
  // Calcular totales por categoría
  const totalSupplyCost = supplyExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const totalFixedCost = fixedExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const totalOtherCost = otherExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  // Calcular porcentajes del costo total
  const totalCost = parseFloat(order.totalCost);
  const supplyPercentage = (totalSupplyCost / totalCost) * 100;
  const fixedPercentage = (totalFixedCost / totalCost) * 100;
  const otherPercentage = (totalOtherCost / totalCost) * 100;
  
  // Calcular punto de equilibrio (cantidad necesaria para cubrir costos)
  // Punto de equilibrio = Costo Fijo Total / (Precio por unidad - Costo Variable por unidad)
  // Asumimos que los costos de insumos son variables y los demás son fijos
  const fixedCosts = totalFixedCost + totalOtherCost;
  const variableCostPerKilo = totalSupplyCost / kilosToProcess;
  const breakEvenKilos = fixedCosts / (pricePerKilo - variableCostPerKilo);
  
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    product: order.product.name,
    kilosToProcess,
    costAnalysis: {
      totalCost,
      costPerKilo,
      costBreakdown: {
        supplies: {
          total: totalSupplyCost,
          percentage: supplyPercentage.toFixed(2)
        },
        fixed: {
          total: totalFixedCost,
          percentage: fixedPercentage.toFixed(2)
        },
        other: {
          total: totalOtherCost,
          percentage: otherPercentage.toFixed(2)
        }
      }
    },
    profitability: {
      sellingPricePerKilo: pricePerKilo,
      profitPerKilo: profitPerKilo.toFixed(2),
      profitPercentage: profitPercentage.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      breakEvenPoint: {
        kilos: breakEvenKilos.toFixed(2),
        percentage: (breakEvenKilos / kilosToProcess * 100).toFixed(2)
      }
    }
  };
}
  };
  
  module.exports = manufacturingOrderService;