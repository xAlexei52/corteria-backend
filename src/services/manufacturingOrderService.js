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
  ProcessedProduct,
  ProductionInput,
  ProductionStage,
  Inventory,
  sequelize 
} = require('../config/database');
const trailerEntryService = require('./trailerEntryService');
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
  async createOrder(orderData, userId, attemptCount = 0) {
    // Permitir hasta 3 intentos
    const maxAttempts = 3;
    
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Verificar que existe la entrada de trailer
        const trailerEntry = await TrailerEntry.findByPk(orderData.trailerEntryId, { transaction });
        
        if (!trailerEntry) {
          await transaction.rollback();
          throw new Error('Trailer entry not found');
        }
        
        // Verificar que la entrada tiene kilos disponibles y no va directo a almacén
        if (trailerEntry.directToWarehouse) {
          await transaction.rollback();
          throw new Error('Cannot create manufacturing order for entries marked as direct to warehouse');
        }
        
        if (trailerEntry.availableKilos <= 0) {
          await transaction.rollback();
          throw new Error('This trailer entry has no available kilos');
        }
        
        // Verificar que los kilos a procesar no excedan los disponibles
        if (orderData.kilosToProcess > trailerEntry.availableKilos) {
          await transaction.rollback();
          throw new Error(`Cannot process more than available kilos (${trailerEntry.availableKilos})`);
        }
        
        // Verificar que existe el producto
        const product = await Product.findByPk(orderData.productId, { transaction });
        
        if (!product) {
          await transaction.rollback();
          throw new Error('Product not found');
        }
        
        // Verificar que existe el almacén de destino
        const warehouse = await Warehouse.findByPk(orderData.destinationWarehouseId, { transaction });
        
        if (!warehouse) {
          await transaction.rollback();
          throw new Error('Destination warehouse not found');
        }
        
        // Generar número de orden único
        const orderNumber = this.generateOrderNumber();
        
        // Calcular costo de materia prima basado en la entrada de trailer
        const rawMaterialCost = trailerEntry.costPerKilo 
          ? parseFloat(trailerEntry.costPerKilo) * parseFloat(orderData.kilosToProcess)
          : null;
        
        // Crear la orden
        const order = await ManufacturingOrder.create({
          orderNumber,
          status: 'pending',
          kilosToProcess: orderData.kilosToProcess,
          boxesEstimated: orderData.boxesEstimated || null,
          notes: orderData.notes || null,
          rawMaterialCost: rawMaterialCost,
          expectedYield: orderData.expectedYield || 100.00,
          city: trailerEntry.city, // La ciudad se toma de la entrada de trailer
          trailerEntryId: orderData.trailerEntryId,
          productId: orderData.productId,
          createdById: userId,
          destinationWarehouseId: orderData.destinationWarehouseId
        }, { transaction });
        
        // Actualizar los kilos disponibles directamente dentro de esta transacción
        // en lugar de llamar al servicio que crea su propia transacción
        const newAvailableKilos = parseFloat(trailerEntry.availableKilos) - parseFloat(orderData.kilosToProcess);
        
        // Actualizar la entrada directamente
        await trailerEntry.update({
          availableKilos: newAvailableKilos,
          hasOrder: true
        }, { transaction });
        
        // Crear las etapas de producción iniciales basadas en la receta si existe
        if (product.recipe_id) {
          const recipe = await Recipe.findByPk(product.recipe_id, {
            include: [
              {
                model: RecipeSupply,
                as: 'supplies',
                include: [{ model: Supply, as: 'supply' }]
              }
            ],
            transaction
          });
          
          if (recipe) {
            // Crear etapa inicial con la materia prima
            await ProductionStage.create({
              manufacturingOrderId: order.id,
              name: 'Materia Prima',
              sequence: 0,
              initialKilos: orderData.kilosToProcess,
              finalKilos: orderData.kilosToProcess,
              yield: 100.00,
              initialCost: rawMaterialCost || 0,
              additionalCost: 0,
              finalCost: rawMaterialCost || 0,
              costPerKilo: trailerEntry.costPerKilo || 0,
              status: 'completed',
              startDate: new Date(),
              endDate: new Date(),
              description: 'Materia prima inicial'
            }, { transaction });
            
            // Crear etapa de procesamiento principal
            await ProductionStage.create({
              manufacturingOrderId: order.id,
              name: 'Procesamiento',
              sequence: 1,
              initialKilos: orderData.kilosToProcess,
              initialCost: rawMaterialCost || 0,
              status: 'pending',
              description: 'Procesamiento según receta'
            }, { transaction });
          }
        } else {
          // Si no hay receta, crear al menos la etapa inicial
          await ProductionStage.create({
            manufacturingOrderId: order.id,
            name: 'Materia Prima',
            sequence: 0,
            initialKilos: orderData.kilosToProcess,
            finalKilos: orderData.kilosToProcess,
            yield: 100.00,
            initialCost: rawMaterialCost || 0,
            additionalCost: 0,
            finalCost: rawMaterialCost || 0,
            costPerKilo: trailerEntry.costPerKilo || 0,
            status: 'completed',
            startDate: new Date(),
            endDate: new Date(),
            description: 'Materia prima inicial'
          }, { transaction });
        }
        
        await transaction.commit();
        
        // Retornar la orden con sus relaciones
        return await this.getOrderById(order.id);
        
      } catch (error) {
        await transaction.rollback();
        
        // Si es un error de timeout y no hemos agotado los intentos, reintentamos
        if (error.name === 'SequelizeDatabaseError' && 
            error.parent && 
            error.parent.code === 'ER_LOCK_WAIT_TIMEOUT' && 
            attemptCount < maxAttempts - 1) {
            
            // Esperar un tiempo exponencial antes de reintentar
            const waitTime = 1000 * Math.pow(2, attemptCount);
            console.log(`Lock timeout, waiting ${waitTime}ms before retry ${attemptCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Reintentar recursivamente
            return this.createOrder(orderData, userId, attemptCount + 1);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Create order error with retries:', error);
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
          as: 'trailerEntry',
          include: [{ model: Product, as: 'product' }]
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
        },
        {
          model: ProcessedProduct,
          as: 'processedProducts',
          include: [
            { model: Product, as: 'product' },
            { model: Warehouse, as: 'warehouse' }
          ]
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
    
    if (filters.trailerEntryId) {
      where.trailerEntryId = filters.trailerEntryId;
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
          as: 'trailerEntry',
          include: [{ model: Product, as: 'product' }]
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
        },
        {
          model: ProcessedProduct,
          as: 'processedProducts',
          include: [{ model: Product, as: 'product' }]
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
      const order = await ManufacturingOrder.findByPk(id, { transaction });
      
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
          
          // Si se está completando la orden, necesitamos los kilos obtenidos y el rendimiento
          if (!additionalData.kilosObtained || additionalData.kilosObtained <= 0) {
            await transaction.rollback();
            throw new Error('Kilos obtained is required and must be greater than zero');
          }
          
          updateData.kilosObtained = additionalData.kilosObtained;
          updateData.boxesObtained = additionalData.boxesObtained || 0;
          
          // Calcular rendimiento real
          const yieldPercentage = (additionalData.kilosObtained / order.kilosToProcess) * 100;
          updateData.actualYield = parseFloat(yieldPercentage.toFixed(2));
          
          // Actualizar costo por kilo si hay kilos obtenidos y costo total
          if (order.totalCost) {
            updateData.costPerKilo = parseFloat((order.totalCost / additionalData.kilosObtained).toFixed(2));
          }
          
          break;
        case 'cancelled':
          // Si se cancela, liberar la entrada de trailer
          await trailerEntryService.updateAvailableKilos(
            order.trailerEntryId, 
            -order.kilosToProcess, // Se suma a los kilos disponibles (negativo para restar)
            false // No resetear hasOrder si hay otras órdenes
          );
          break;
      }
      
      await order.update(updateData, { transaction });
      
      // Si se completó, guardar los productos procesados al inventario
      if (status === 'completed') {
        const processedProducts = await ProcessedProduct.findAll({
          where: { 
            manufacturingOrderId: id,
            addedToInventory: false
          },
          transaction
        });
        
        for (const product of processedProducts) {
          // Agregar al inventario
          await Inventory.findOrCreate({
            where: {
              itemType: 'product',
              itemId: product.productId,
              warehouseId: product.warehouseId
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
              replacements: [product.kilos, 'product', product.productId, product.warehouseId],
              type: sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
          
          // Marcar como agregado al inventario
          await product.update({ addedToInventory: true }, { transaction });
        }
        
        // Si no hay productos procesados registrados, agregar el producto principal
        if (processedProducts.length === 0) {
          // Agregar al inventario
          await Inventory.findOrCreate({
            where: {
              itemType: 'product',
              itemId: order.productId,
              warehouseId: order.destinationWarehouseId
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
              replacements: [additionalData.kilosObtained, 'product', order.productId, order.destinationWarehouseId],
              type: sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
        }
      }
      
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
      const order = await ManufacturingOrder.findByPk(id, { transaction });
      
      if (!order) {
        await transaction.rollback();
        throw new Error('Manufacturing order not found');
      }
      
      // Solo se pueden eliminar órdenes pendientes
      if (order.status !== 'pending') {
        await transaction.rollback();
        throw new Error(`Cannot delete order with status: ${order.status}. Only pending orders can be deleted.`);
      }
      
      // Liberar los kilos de la entrada de trailer
      await trailerEntryService.updateAvailableKilos(
        order.trailerEntryId, 
        -order.kilosToProcess, // Negativo para sumar a lo disponible
        false // No resetear hasOrder si hay otras órdenes
      );
      
      // Eliminar etapas de producción
      await ProductionStage.destroy({
        where: { manufacturingOrderId: id },
        transaction
      });
      
      // Eliminar insumos asociados
      await ProductionInput.destroy({
        where: { manufacturingOrderId: id },
        transaction
      });
      
      // Eliminar productos procesados
      await ProcessedProduct.destroy({
        where: { manufacturingOrderId: id },
        transaction
      });
      
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
 * Agrega múltiples insumos o materiales a una orden de manufactura
 * @param {string} orderId - ID de la orden
 * @param {Array} inputsData - Array de datos de insumos a agregar
 * @returns {Promise<Array>} Insumos agregados
 */
async addMultipleProductionInputs(orderId, inputsData) {
  const transaction = await sequelize.transaction();
  
  try {
    const order = await ManufacturingOrder.findByPk(orderId, { transaction });
    
    if (!order) {
      await transaction.rollback();
      throw new Error('Manufacturing order not found');
    }
    
    // Verificar que la orden esté en estado pendiente o en progreso
    if (order.status !== 'pending' && order.status !== 'in_progress') {
      await transaction.rollback();
      throw new Error(`Cannot add inputs to order with status: ${order.status}`);
    }
    
    const addedInputs = [];
    
    // Procesar cada insumo
    for (const inputData of inputsData) {
      // Si se proporciona un ID de etapa, verificar que existe
      if (inputData.productionStageId) {
        const stage = await ProductionStage.findOne({
          where: {
            id: inputData.productionStageId,
            manufacturingOrderId: orderId
          },
          transaction
        });
        
        if (!stage) {
          await transaction.rollback();
          throw new Error(`Production stage not found: ${inputData.productionStageId}`);
        }
      }
      
      // Si el tipo es 'supply', verificar que existe el insumo
      if (inputData.inputType === 'supply' && inputData.itemId) {
        const supply = await Supply.findByPk(inputData.itemId, { transaction });
        if (!supply) {
          await transaction.rollback();
          throw new Error(`Supply not found: ${inputData.itemId}`);
        }
      }
      
      // Calcular costo total
      const totalCost = parseFloat(inputData.quantity) * parseFloat(inputData.unitCost);
      
      // Crear el insumo
      const input = await ProductionInput.create({
        ...inputData,
        manufacturingOrderId: orderId,
        totalCost
      }, { transaction });
      
      addedInputs.push(input);
    }
    
    // Actualizar el costo total de la orden
    const allInputs = await ProductionInput.findAll({
      where: { manufacturingOrderId: orderId },
      transaction
    });
    
    // Calcular costos por categoría
    let supplyCost = 0;
    let packagingCost = 0;
    let otherCosts = 0;
    
    allInputs.forEach(inp => {
      switch (inp.inputType) {
        case 'supply':
          supplyCost += parseFloat(inp.totalCost);
          break;
        case 'packaging':
          packagingCost += parseFloat(inp.totalCost);
          break;
        case 'other':
          otherCosts += parseFloat(inp.totalCost);
          break;
      }
    });
    
    // Actualizar la orden con los costos desglosados
    await order.update({
      supplyCost,
      packagingCost,
      otherCosts,
      totalCost: (order.rawMaterialCost || 0) + supplyCost + packagingCost + otherCosts
    }, { transaction });
    
    // Actualizar costos adicionales de etapas
    const inputsByStage = {};
    
    // Agrupar insumos por etapa
    allInputs.forEach(input => {
      if (input.productionStageId) {
        if (!inputsByStage[input.productionStageId]) {
          inputsByStage[input.productionStageId] = [];
        }
        inputsByStage[input.productionStageId].push(input);
      }
    });
    
    // Actualizar cada etapa
    for (const stageId in inputsByStage) {
      const stage = await ProductionStage.findByPk(stageId, { transaction });
      if (stage) {
        const stageInputs = inputsByStage[stageId];
        const additionalCost = stageInputs.reduce((sum, input) => sum + parseFloat(input.totalCost), 0);
        
        await stage.update({
          additionalCost,
          finalCost: parseFloat(stage.initialCost) + additionalCost
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Cargar los insumos con sus relaciones
    const result = [];
    for (const input of addedInputs) {
      const loadedInput = await ProductionInput.findByPk(input.id, {
        include: [
          {
            model: Supply,
            as: 'supply'
          }
        ]
      });
      result.push(loadedInput);
    }
    
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
},

  /**
   * Elimina un insumo de una orden de manufactura
   * @param {string} inputId - ID del insumo
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async removeProductionInput(inputId) {
    const transaction = await sequelize.transaction();
    
    try {
      const input = await ProductionInput.findByPk(inputId, { transaction });
      
      if (!input) {
        await transaction.rollback();
        throw new Error('Production input not found');
      }
      
      const order = await ManufacturingOrder.findByPk(input.manufacturingOrderId, { transaction });
      
      // Verificar que la orden esté en estado pendiente o en progreso
      if (order.status !== 'pending' && order.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`Cannot remove inputs from order with status: ${order.status}`);
      }
      
      // Guardar datos para actualizar después
      const { totalCost, inputType, productionStageId, manufacturingOrderId } = input;
      
      // Eliminar el insumo
      await input.destroy({ transaction });
      
      // Actualizar el costo total de la orden
      const allInputs = await ProductionInput.findAll({
        where: { manufacturingOrderId },
        transaction
      });
      
      // Calcular costos por categoría
      let supplyCost = 0;
      let packagingCost = 0;
      let otherCosts = 0;
      
      allInputs.forEach(inp => {
        switch (inp.inputType) {
          case 'supply':
            supplyCost += parseFloat(inp.totalCost);
            break;
          case 'packaging':
            packagingCost += parseFloat(inp.totalCost);
            break;
          case 'other':
            otherCosts += parseFloat(inp.totalCost);
            break;
        }
      });
      
      // Actualizar la orden con los costos desglosados
      await order.update({
        supplyCost,
        packagingCost,
        otherCosts,
        totalCost: (order.rawMaterialCost || 0) + supplyCost + packagingCost + otherCosts
      }, { transaction });
      
      // Si pertenecía a una etapa, actualizar el costo adicional de la etapa
      if (productionStageId) {
        const stage = await ProductionStage.findByPk(productionStageId, { transaction });
        
        if (stage) {
          // Calcular costos adicionales de la etapa
          const stageInputs = await ProductionInput.findAll({
            where: { 
              manufacturingOrderId,
              productionStageId
            },
            transaction
          });
          
          const additionalCost = stageInputs.reduce((sum, input) => sum + parseFloat(input.totalCost), 0);
          
          await stage.update({
            additionalCost,
            finalCost: parseFloat(stage.initialCost) + additionalCost
          }, { transaction });
        }
      }
      
      await transaction.commit();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Crea una nueva etapa de producción en una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @param {Object} stageData - Datos de la etapa
   * @returns {Promise<Object>} Etapa creada
   */
  async createProductionStage(orderId, stageData) {
    const transaction = await sequelize.transaction();
    
    try {
      const order = await ManufacturingOrder.findByPk(orderId, { transaction });
      
      if (!order) {
        await transaction.rollback();
        throw new Error('Manufacturing order not found');
      }
      
      // Verificar que la orden esté en estado pendiente o en progreso
      if (order.status !== 'pending' && order.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`Cannot add stages to order with status: ${order.status}`);
      }
      
      // Obtener la última etapa para determinar el orden y valores iniciales
      const lastStage = await ProductionStage.findOne({
        where: { manufacturingOrderId: orderId },
        order: [['sequence', 'DESC']],
        transaction
      });
      
      const sequence = lastStage ? lastStage.sequence + 1 : 0;
      
      // Valores predeterminados basados en la etapa anterior
      const initialKilos = lastStage && lastStage.finalKilos ? lastStage.finalKilos : order.kilosToProcess;
      const initialCost = lastStage && lastStage.finalCost ? lastStage.finalCost : (order.rawMaterialCost || 0);
      
      // Crear la etapa
      const stage = await ProductionStage.create({
        ...stageData,
        manufacturingOrderId: orderId,
        sequence,
        initialKilos: stageData.initialKilos || initialKilos,
        initialCost: stageData.initialCost || initialCost,
        status: stageData.status || 'pending'
      }, { transaction });
      
      await transaction.commit();
      
      return await ProductionStage.findByPk(stage.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  /**
   * Actualiza una etapa de producción
   * @param {string} stageId - ID de la etapa
   * @param {Object} stageData - Datos a actualizar
   * @returns {Promise<Object>} Etapa actualizada
   */
  async updateProductionStage(stageId, stageData) {
    const transaction = await sequelize.transaction();
    
    try {
      const stage = await ProductionStage.findByPk(stageId, { transaction });
      
      if (!stage) {
        await transaction.rollback();
        throw new Error('Production stage not found');
      }
      
      const order = await ManufacturingOrder.findByPk(stage.manufacturingOrderId, { transaction });
      
      // Verificar que la orden esté en estado pendiente o en progreso
      if (order.status !== 'pending' && order.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`Cannot update stages for order with status: ${order.status}`);
      }
      
      // Si se cambia el estado a "completed", necesitamos los kilos finales y el rendimiento
      if (stageData.status === 'completed' && (!stageData.finalKilos || stageData.finalKilos <= 0)) {
        await transaction.rollback();
        throw new Error('Final kilos are required when completing a stage');
      }
      
      // Si se proporcionan finalKilos, calcular rendimiento
      if (stageData.finalKilos) {
        const yield = (stageData.finalKilos / stage.initialKilos) * 100;
        stageData.yield = parseFloat(yield.toFixed(2));
      }
      
      // Si hay costPerKilo o se actualizan kilos, calcular costo final
      if (stageData.costPerKilo || stageData.finalKilos) {
        const finalKilos = stageData.finalKilos || stage.finalKilos;
        const additionalCost = stageData.additionalCost !== undefined ? stageData.additionalCost : stage.additionalCost;
        const totalCost = parseFloat(stage.initialCost) + parseFloat(additionalCost || 0);
        
        if (finalKilos && finalKilos > 0) {
          stageData.costPerKilo = parseFloat((totalCost / finalKilos).toFixed(2));
          stageData.finalCost = totalCost;
        }
      }
      
      // Si se completa la etapa, actualizar fechas
      if (stageData.status === 'completed') {
        if (!stage.startDate && !stageData.startDate) {
          stageData.startDate = new Date();
        }
        
        if (!stageData.endDate) {
          stageData.endDate = new Date();
        }
      } else if (stageData.status === 'in_progress' && !stage.startDate && !stageData.startDate) {
        stageData.startDate = new Date();
      }
      
      await stage.update(stageData, { transaction });
      
      // Si se completó esta etapa, actualizar la siguiente etapa (si existe)
      if (stageData.status === 'completed' && stageData.finalKilos) {
        const nextStage = await ProductionStage.findOne({
          where: {
            manufacturingOrderId: stage.manufacturingOrderId,
            sequence: stage.sequence + 1
          },
          transaction
        });
        
        if (nextStage) {
          await nextStage.update({
            initialKilos: stageData.finalKilos,
            initialCost: stageData.finalCost || stage.finalCost
          }, { transaction });
        }
      }
      
      await transaction.commit();
      
      return await ProductionStage.findByPk(stageId, {
        include: [
          {
            model: ProductionInput,
            as: 'inputs',
            include: [{ model: Supply, as: 'supply' }]
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Agrega un producto procesado a una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @param {Object} productData - Datos del producto procesado
   * @returns {Promise<Object>} Producto procesado agregado
   */
  async addProcessedProduct(orderId, productData) {
    const transaction = await sequelize.transaction();
    
    try {
      const order = await ManufacturingOrder.findByPk(orderId, { transaction });
      
      if (!order) {
        await transaction.rollback();
        throw new Error('Manufacturing order not found');
      }
      
      // Verificar que la orden esté en estado pendiente o en progreso
      if (order.status !== 'pending' && order.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`Cannot add processed products to order with status: ${order.status}`);
      }
      
      // Verificar que existe el producto
      const product = await Product.findByPk(productData.productId, { transaction });
      
      if (!product) {
        await transaction.rollback();
        throw new Error('Product not found');
      }
      
      // Verificar que existe el almacén
      const warehouse = await Warehouse.findByPk(productData.warehouseId, { transaction });
      
      if (!warehouse) {
        await transaction.rollback();
        throw new Error('Warehouse not found');
      }
      
      // Obtener el total actual de kilos procesados
      const existingProducts = await ProcessedProduct.findAll({
        where: { manufacturingOrderId: orderId },
        transaction
      });
      
      const totalExistingKilos = existingProducts.reduce((sum, p) => sum + parseFloat(p.kilos), 0);
      
      // Verificar que no se exceda el rendimiento máximo esperado
      // Permitir hasta un 110% como margen de error (algunos procesos pueden aumentar el peso)
      const maxExpectedKilos = order.kilosToProcess * 1.1;
      
      if (totalExistingKilos + parseFloat(productData.kilos) > maxExpectedKilos) {
        await transaction.rollback();
        throw new Error(`Cannot exceed maximum expected kilos (${maxExpectedKilos})`);
      }
      
      // Calcular porcentaje sobre el total procesado
      const yieldPercentage = (productData.kilos / order.kilosToProcess) * 100;
      
      // Crear el producto procesado
      const processedProduct = await ProcessedProduct.create({
        ...productData,
        manufacturingOrderId: orderId,
        yieldPercentage: parseFloat(yieldPercentage.toFixed(2)),
        addedToInventory: false
      }, { transaction });
      
      await transaction.commit();
      
      return await ProcessedProduct.findByPk(processedProduct.id, {
        include: [
          { model: Product, as: 'product' },
          { model: Warehouse, as: 'warehouse' }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Elimina un producto procesado
   * @param {string} productId - ID del producto procesado
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async removeProcessedProduct(productId) {
    const transaction = await sequelize.transaction();
    
    try {
      const processedProduct = await ProcessedProduct.findByPk(productId, { transaction });
      
      if (!processedProduct) {
        await transaction.rollback();
        throw new Error('Processed product not found');
      }
      
      // Verificar que no se haya agregado al inventario
      if (processedProduct.addedToInventory) {
        await transaction.rollback();
        throw new Error('Cannot remove a processed product that has already been added to inventory');
      }
      
      const order = await ManufacturingOrder.findByPk(processedProduct.manufacturingOrderId, { transaction });
      
      // Verificar que la orden esté en estado pendiente o en progreso
      if (order.status !== 'pending' && order.status !== 'in_progress') {
        await transaction.rollback();
        throw new Error(`Cannot remove processed products from order with status: ${order.status}`);
      }
      
      await processedProduct.destroy({ transaction });
      
      await transaction.commit();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  /**
   * Calcula los costos totales de una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} Resumen de costos
   */
  async calculateTotalCosts(orderId) {
    const transaction = await sequelize.transaction();
    
    try {
      const order = await ManufacturingOrder.findByPk(orderId, {
        include: [
          {
            model: TrailerEntry,
            as: 'trailerEntry'
          },
          {
            model: ProductionInput,
            as: 'inputs'
          },
          {
            model: OrderExpense,
            as: 'expenses'
          }
        ],
        transaction
      });
      
      if (!order) {
        await transaction.rollback();
        throw new Error('Manufacturing order not found');
      }
      
      // Calcular costo de materia prima si no existe
      let rawMaterialCost = order.rawMaterialCost;
      if (!rawMaterialCost && order.trailerEntry && order.trailerEntry.costPerKilo) {
        rawMaterialCost = parseFloat(order.trailerEntry.costPerKilo) * parseFloat(order.kilosToProcess);
      }
      
      // Calcular costos de insumos por categoría
      let supplyCost = 0;
      let packagingCost = 0;
      let otherCosts = 0;
      
      if (order.inputs && order.inputs.length > 0) {
        for (const input of order.inputs) {
          switch (input.inputType) {
            case 'supply':
              supplyCost += parseFloat(input.totalCost);
              break;
            case 'packaging':
              packagingCost += parseFloat(input.totalCost);
              break;
            case 'other':
              otherCosts += parseFloat(input.totalCost);
              break;
          }
        }
      }
      
      // Sumar gastos adicionales
      const expensesTotal = order.expenses && order.expenses.length > 0
        ? order.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
        : 0;
      
      // Calcular costo total
      const totalCost = (rawMaterialCost || 0) + supplyCost + packagingCost + otherCosts + expensesTotal;
      
      // Calcular costo por kilo
      let costPerKilo = null;
      if (order.kilosObtained && order.kilosObtained > 0) {
        costPerKilo = totalCost / parseFloat(order.kilosObtained);
      } else if (order.kilosToProcess > 0) {
        // Si aún no se ha completado, usar kilosToProcess
        costPerKilo = totalCost / parseFloat(order.kilosToProcess);
      }
      
      // Actualizar la orden con los costos calculados
      await order.update({
        rawMaterialCost,
        supplyCost,
        packagingCost,
        otherCosts,
        totalCost,
        costPerKilo: costPerKilo ? parseFloat(costPerKilo.toFixed(2)) : null
      }, { transaction });
      
      await transaction.commit();
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        costs: {
          rawMaterial: rawMaterialCost || 0,
          supplies: supplyCost,
          packaging: packagingCost,
          other: otherCosts,
          expenses: expensesTotal,
          total: totalCost,
          perKilo: costPerKilo ? parseFloat(costPerKilo.toFixed(2)) : null
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Calcula la rentabilidad para una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} Información de utilidad
   */
  async calculateProfitability(orderId) {
    // Primero actualizamos los costos totales
    await this.calculateTotalCosts(orderId);
    
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
    
    // Determinar cantidad de kilos para cálculo de utilidad
    const kilos = order.kilosObtained && order.kilosObtained > 0 
      ? parseFloat(order.kilosObtained) 
      : parseFloat(order.kilosToProcess);
    
    // Calcular utilidades
    const profitPerKilo = pricePerKilo - costPerKilo;
    const profitPercentage = (profitPerKilo / pricePerKilo) * 100;
    const totalProfit = profitPerKilo * kilos;
    
    // Agrupar los costos por categorías
    const rawMaterialCost = parseFloat(order.rawMaterialCost) || 0;
    const supplyCost = parseFloat(order.supplyCost) || 0;
    const packagingCost = parseFloat(order.packagingCost) || 0;
    const otherCosts = parseFloat(order.otherCosts) || 0;
    
    const totalCost = parseFloat(order.totalCost) || (rawMaterialCost + supplyCost + packagingCost + otherCosts);
    
    // Calcular porcentajes del costo total
    const rawMaterialPercentage = totalCost > 0 ? (rawMaterialCost / totalCost) * 100 : 0;
    const supplyPercentage = totalCost > 0 ? (supplyCost / totalCost) * 100 : 0;
    const packagingPercentage = totalCost > 0 ? (packagingCost / totalCost) * 100 : 0;
    const otherPercentage = totalCost > 0 ? (otherCosts / totalCost) * 100 : 0;
    
    // Calcular punto de equilibrio (cantidad necesaria para cubrir costos)
    // Asumimos que los costos de materias primas y suministros son variables, y los demás son fijos
    const fixedCosts = otherCosts;
    const variableCostPerKilo = (rawMaterialCost + supplyCost + packagingCost) / kilos;
    const breakEvenKilos = pricePerKilo !== variableCostPerKilo 
      ? fixedCosts / (pricePerKilo - variableCostPerKilo)
      : 0;
    
    // Preparar datos de productos procesados
    const processedProducts = order.processedProducts && order.processedProducts.length > 0
      ? order.processedProducts.map(product => ({
        id: product.id,
        productId: product.productId,
        productName: product.product.name,
        kilos: parseFloat(product.kilos),
        costPerKilo: parseFloat(product.costPerKilo),
        totalCost: parseFloat(product.totalCost),
        warehouseId: product.warehouseId,
        warehouseName: product.warehouse ? product.warehouse.name : '',
        yieldPercentage: parseFloat(product.yieldPercentage)
      }))
      : [];
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      product: order.product.name,
      kilosToProcess: parseFloat(order.kilosToProcess),
      kilosObtained: order.kilosObtained ? parseFloat(order.kilosObtained) : null,
      yield: order.actualYield ? parseFloat(order.actualYield) : null,
      costAnalysis: {
        totalCost,
        costPerKilo,
        costBreakdown: {
          rawMaterial: {
            total: rawMaterialCost,
            percentage: rawMaterialPercentage.toFixed(2)
          },
          supplies: {
            total: supplyCost,
            percentage: supplyPercentage.toFixed(2)
          },
          packaging: {
            total: packagingCost,
            percentage: packagingPercentage.toFixed(2)
          },
          other: {
            total: otherCosts,
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
          percentage: kilos > 0 ? ((breakEvenKilos / kilos) * 100).toFixed(2) : '0.00'
        }
      },
      processedProducts
    };
  },
  
  /**
   * Obtiene análisis de gastos por producto y período
   * @param {Object} params - Parámetros de búsqueda
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
          model: ProcessedProduct,
          as: 'processedProducts',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });
    
    if (orders.length === 0) {
      return {
        message: 'No orders found with the specified criteria',
        data: []
      };
    }
    
    // Agrupar por producto
    const productGroups = {};
    
    orders.forEach(order => {
      // Si la orden tiene productos procesados, analizarlos individualmente
      if (order.processedProducts && order.processedProducts.length > 0) {
        order.processedProducts.forEach(processed => {
          const processedProductId = processed.productId;
          const processedProductName = processed.product.name;
          
          if (!productGroups[processedProductId]) {
            productGroups[processedProductId] = {
              productId: processedProductId,
              productName: processedProductName,
              orders: [],
              totalKilos: 0,
              totalCost: 0
            };
          }
          
          // Añadir datos del producto procesado
          productGroups[processedProductId].orders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            kilos: parseFloat(processed.kilos),
            cost: parseFloat(processed.totalCost),
            costPerKilo: parseFloat(processed.costPerKilo),
            date: order.createdAt
          });
          
          productGroups[processedProductId].totalKilos += parseFloat(processed.kilos);
          productGroups[processedProductId].totalCost += parseFloat(processed.totalCost);
        });
      } else {
        // Si no tiene productos procesados, usar el producto principal
        const productId = order.productId;
        const productName = order.product.name;
        
        if (!productGroups[productId]) {
          productGroups[productId] = {
            productId,
            productName,
            orders: [],
            totalKilos: 0,
            totalCost: 0
          };
        }
        
        // Determinar kilos y costos
        const kilos = order.kilosObtained && order.kilosObtained > 0 
          ? parseFloat(order.kilosObtained) 
          : parseFloat(order.kilosToProcess);
          
        const cost = order.totalCost ? parseFloat(order.totalCost) : 0;
        const costPerKilo = order.costPerKilo ? parseFloat(order.costPerKilo) : (cost / kilos);
        
        // Añadir datos de la orden
        productGroups[productId].orders.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          kilos,
          cost,
          costPerKilo,
          date: order.createdAt
        });
        
        productGroups[productId].totalKilos += kilos;
        productGroups[productId].totalCost += cost;
      }
    });
    
    // Calcular promedios y realizar análisis adicional
    const productAnalysis = Object.values(productGroups).map(group => {
      const avgCostPerKilo = group.totalCost / group.totalKilos;
      
      // Intentar obtener el precio de venta del producto
      const product = orders.find(o => o.productId === group.productId)?.product;
      const avgPrice = product ? parseFloat(product.pricePerKilo) : null;
      
      // Calcular rentabilidad si hay precio
      let avgProfit = null;
      let profitPercentage = null;
      
      if (avgPrice) {
        avgProfit = avgPrice - avgCostPerKilo;
        profitPercentage = (avgProfit / avgPrice) * 100;
      }
      
      return {
        productId: group.productId,
        productName: group.productName,
        totalKilosProcessed: group.totalKilos.toFixed(2),
        totalCost: group.totalCost.toFixed(2),
        averageCostPerKilo: avgCostPerKilo.toFixed(2),
        averageSellingPrice: avgPrice ? avgPrice.toFixed(2) : 'N/A',
        averageProfitPerKilo: avgProfit ? avgProfit.toFixed(2) : 'N/A',
        profitabilityPercentage: profitPercentage ? profitPercentage.toFixed(2) : 'N/A',
        ordersCount: group.orders.length
      };
    });
    
    return {
      period: {
        start: startDate || 'All time',
        end: endDate || 'Current date'
      },
      products: productAnalysis
    };
  }
};

module.exports = manufacturingOrderService;