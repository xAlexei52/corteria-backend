// src/services/manufacturingOrderService.js (modificado)
const { 
  ManufacturingOrder, 
  OrderExpense, 
  OrderSubproduct,
  TrailerEntry, 
  Product, 
  Usuario, 
  Warehouse,
  Supply,
  City,
  FixedExpense,
  Inventory,
  sequelize 
} = require('../config/database');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const trailerEntryService = require('./trailerEntryService');
const inventoryService = require('./inventoryService');

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
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      
      // Verificar que existe la entrada de trailer
      const trailerEntry = await TrailerEntry.findByPk(orderData.trailerEntryId, { transaction });
      
      if (!trailerEntry) {
        throw new Error('Trailer entry not found');
      }
      
      // Verificar que la entrada necesita procesamiento
      if (!trailerEntry.needsProcessing) {
        throw new Error('This trailer entry does not require processing');
      }
      
      // Verificar que la entrada tiene kilos disponibles
      if (!trailerEntry.availableKilos || trailerEntry.availableKilos <= 0) {
        throw new Error('This trailer entry has no available kilos for processing');
      }
      
      // Verificar que los kilos a usar no excedan los disponibles
      if (orderData.usedKilos > trailerEntry.availableKilos) {
        throw new Error(`Cannot use more than available kilos (${trailerEntry.availableKilos})`);
      }
      
      // Verificar que existe el producto
      const product = await Product.findByPk(orderData.productId, { transaction });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Verificar que existe el almacén de destino
      const warehouse = await Warehouse.findByPk(orderData.destinationWarehouseId, { transaction });
      
      if (!warehouse) {
        throw new Error('Destination warehouse not found');
      }
      
      // Generar número de orden único
      const orderNumber = this.generateOrderNumber();
      
      // Crear la orden
      const order = await ManufacturingOrder.create({
        orderNumber,
        status: 'pending',
        usedKilos: orderData.usedKilos,
        totalOutputKilos: orderData.totalOutputKilos || orderData.usedKilos, // Si no se especifica, asumimos que es igual a los kilos usados
        boxesEstimated: orderData.boxesEstimated || null,
        notes: orderData.notes || null,
        cityId: trailerEntry.cityId, // La ciudad se toma de la entrada de trailer
        trailerEntryId: orderData.trailerEntryId,
        productId: orderData.productId,
        createdById: userId,
        destinationWarehouseId: orderData.destinationWarehouseId,
        calculationStatus: 'pending'
      }, { transaction });
      
      // Actualizar los kilos disponibles en la entrada de trailer
      await trailerEntryService.updateProcessingStatus(
        orderData.trailerEntryId, 
        orderData.usedKilos,
        transaction
      );
      
      await transaction.commit();
      
      // Retornar la orden con sus relaciones
      return await this.getOrderById(order.id);
      
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  },

  /**
   * Agrega insumos y gastos a una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @param {Array} expenses - Lista de gastos a agregar
   * @returns {Promise<Array>} Gastos agregados
   */
  async addOrderExpenses(orderId, expenses) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      
      // Verificar que existe la orden
      const order = await ManufacturingOrder.findByPk(orderId, { transaction });
      
      if (!order) {
        throw new Error('Manufacturing order not found');
      }
      
      // Verificar que la orden no esté completada o cancelada
      if (order.status === 'completed' || order.status === 'cancelled') {
        throw new Error(`Cannot add expenses to an order with status: ${order.status}`);
      }
      
      // Procesar y validar cada gasto
      const processedExpenses = [];
      
      for (const expense of expenses) {
        // Validar tipo
        if (!['supply', 'fixed', 'variable', 'packaging', 'labor'].includes(expense.type)) {
          throw new Error(`Invalid expense type: ${expense.type}`);
        }
        
        // Procesar según el tipo
        if (expense.type === 'supply' && expense.supplyId) {
          // Buscar el insumo en la base de datos
          const supply = await Supply.findByPk(expense.supplyId, { transaction });
          if (!supply) {
            throw new Error(`Supply with ID ${expense.supplyId} not found`);
          }
          
          // Validar cantidad
          if (!expense.quantity || isNaN(expense.quantity) || expense.quantity <= 0) {
            throw new Error('Supply quantity must be a positive number');
          }
          
          // Usar el costo del insumo o el proporcionado
          const costPerUnit = expense.costPerUnit !== undefined ? 
            expense.costPerUnit : 
            parseFloat(supply.costPerUnit);
          
          // Calcular amount automáticamente
          const amount = parseFloat((expense.quantity * costPerUnit).toFixed(2));
          
          processedExpenses.push({
            id: uuidv4(),
            name: supply.name,
            amount,
            type: 'supply',
            quantity: expense.quantity,
            unit: supply.unit,
            costPerUnit,
            notes: expense.notes || `${supply.name} - ${supply.unit}`,
            manufacturingOrderId: orderId,
            supplyId: expense.supplyId
          });
        } else {
          // Para gastos no relacionados con insumos
          if (!expense.amount || isNaN(expense.amount) || expense.amount <= 0) {
            throw new Error('Expense amount must be a positive number');
          }
          
          if (!expense.name) {
            throw new Error('Expense name is required');
          }
          
          processedExpenses.push({
            id: uuidv4(),
            name: expense.name,
            amount: expense.amount,
            type: expense.type,
            quantity: expense.quantity,
            unit: expense.unit,
            costPerUnit: expense.costPerUnit,
            notes: expense.notes,
            manufacturingOrderId: orderId,
            supplyId: expense.supplyId
          });
        }
      }
      
      // Crear los gastos
      const createdExpenses = await OrderExpense.bulkCreate(processedExpenses, { transaction });
      
      // Marcar la orden como pendiente de cálculo
      await order.update({ calculationStatus: 'pending' }, { transaction });
      
      await transaction.commit();
      
      // Retornar los gastos creados
      return await OrderExpense.findAll({
        where: { manufacturingOrderId: orderId },
        include: [
          {
            model: Supply,
            as: 'supply'
          }
        ]
      });
      
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  },

  /**
   * Agrega subproductos a una orden de manufactura
   * @param {string} orderId - ID de la orden
   * @param {Array} subproducts - Lista de subproductos a agregar
   * @returns {Promise<Array>} Subproductos agregados
   */
 // En src/services/manufacturingOrderService.js - Función addOrderSubproducts

async addOrderSubproducts(orderId, subproducts) {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const order = await ManufacturingOrder.findByPk(orderId, {
      include: [
        {
          model: OrderSubproduct,
          as: 'subproducts'
        }
      ],
      transaction
    });
    
    if (!order) {
      throw new Error('Manufacturing order not found');
    }
    
    // Verificar que la orden no esté completada o cancelada
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new Error(`Cannot add subproducts to an order with status: ${order.status}`);
    }
    
    // Calcular total de kilos a restar del producto principal
    let totalSubproductQuantity = 0;
    
    // Validar cada subproducto
    for (const subproduct of subproducts) {
      // Validar cantidad
      if (isNaN(subproduct.quantity) || subproduct.quantity <= 0) {
        throw new Error('Subproduct quantity must be a positive number');
      }
      
      // Acumular cantidad total (asumiendo unidad en kg)
      if (subproduct.unit === 'kg' || !subproduct.unit) {
        totalSubproductQuantity += parseFloat(subproduct.quantity);
      }
      
      // Si se especifica un producto existente, verificar que exista
      if (subproduct.productId) {
        const product = await Product.findByPk(subproduct.productId, { transaction });
        if (!product) {
          throw new Error(`Product with ID ${subproduct.productId} not found`);
        }
      }
    }
    
    // Verificar que no estemos restando más kilos de los disponibles
    const currentSubproductsKilos = order.subproducts.reduce((sum, sub) => {
      return sum + (sub.unit === 'kg' || !sub.unit ? parseFloat(sub.quantity) : 0);
    }, 0);
    
    const totalOutputAfterNewSubproducts = parseFloat(order.totalOutputKilos) - totalSubproductQuantity;
    
    if (totalOutputAfterNewSubproducts <= 0) {
      throw new Error('Cannot add subproducts. Total subproduct quantity exceeds available output kilos.');
    }
    
    // Crear los subproductos
    const createdSubproducts = await OrderSubproduct.bulkCreate(
      subproducts.map(subproduct => ({
        id: uuidv4(),
        name: subproduct.name,
        quantity: subproduct.quantity,
        unit: subproduct.unit || 'kg',
        costPerUnit: subproduct.costPerUnit,
        totalCost: subproduct.costPerUnit ? subproduct.quantity * subproduct.costPerUnit : null,
        notes: subproduct.notes,
        productId: subproduct.productId,
        manufacturingOrderId: orderId
      })),
      { transaction }
    );
    
    // Actualizar los kilos totales del producto principal
    await order.update({
      totalOutputKilos: totalOutputAfterNewSubproducts,
      calculationStatus: 'pending' // Marcar para recalcular costos
    }, { transaction });
    
    await transaction.commit();
    
    // Retornar los subproductos creados
    return await OrderSubproduct.findAll({
      where: { manufacturingOrderId: orderId },
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    });
    
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
},

  /**
   * Calcula los costos y rentabilidad de una orden
   * @param {string} orderId - ID de la orden
   * @param {Object} calculationData - Datos para el cálculo (precio de venta)
   * @returns {Promise<Object>} Resumen de costos y rentabilidad
   */
  // Modificación para src/services/manufacturingOrderService.js - función calculateOrderCosts

async calculateOrderCosts(orderId, calculationData = {}) {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    // Obtener la orden con todos sus datos
    const order = await ManufacturingOrder.findByPk(orderId, {
      include: [
        {
          model: TrailerEntry,
          as: 'trailerEntry'
        },
        {
          model: OrderExpense,
          as: 'expenses',
          include: [
            {
              model: Supply,
              as: 'supply'
            }
          ]
        },
        {
          model: OrderSubproduct,
          as: 'subproducts',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
        {
          model: Product,
          as: 'product'
        }
      ],
      transaction
    });
    
    if (!order) {
      throw new Error('Manufacturing order not found');
    }
    
    // Calcular costo de materia prima
    const rawMaterialCost = order.trailerEntry.costPerKilo 
      ? parseFloat(order.usedKilos) * parseFloat(order.trailerEntry.costPerKilo)
      : 0;
    
    // Agrupar gastos por tipo
    const expenses = order.expenses || [];
    const expensesByType = {
      supply: [],
      fixed: [],
      variable: [],
      packaging: [],
      labor: []
    };
    
    expenses.forEach(expense => {
      expensesByType[expense.type].push(expense);
    });
    
    // Calcular costos por categoría
    const suppliesCost = expensesByType.supply.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const laborCost = expensesByType.labor.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const packagingCost = expensesByType.packaging.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const fixedCost = expensesByType.fixed.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const variableCost = expensesByType.variable.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    // Calcular costo total
    const totalCost = rawMaterialCost + suppliesCost + laborCost + packagingCost + fixedCost + variableCost;
    
    // NUEVO: Calcular el valor total de los subproductos
    const subproducts = order.subproducts || [];
    const subproductsValue = subproducts.reduce((sum, subproduct) => {
      const quantity = parseFloat(subproduct.quantity) || 0;
      const costPerUnit = parseFloat(subproduct.costPerUnit) || 0;
      return sum + (quantity * costPerUnit);
    }, 0);
    
    // NUEVO: Total de kilos producidos (producto principal + subproductos)
    const totalOutputKilos = parseFloat(order.totalOutputKilos);
    const totalSubproductKilos = subproducts.reduce((sum, subproduct) => {
      return sum + (parseFloat(subproduct.quantity) || 0);
    }, 0);
    const combinedOutputKilos = totalOutputKilos + totalSubproductKilos;
    
    // NUEVO: Costo por kilo considerando el valor de los subproductos
    // Costo efectivo = (Costo total - Valor de subproductos) / Kilos de producto principal
    const effectiveCost = totalCost - subproductsValue;
    const costPerKilo = effectiveCost > 0 
      ? parseFloat(effectiveCost) / parseFloat(order.totalOutputKilos)
      : 0;
    
    // Usar precio de venta proporcionado o el del producto
    let sellingPricePerKilo = calculationData.sellingPricePerKilo;
    
    // Si no se proporciona precio de venta, usar el del producto
    if (!sellingPricePerKilo && order.product && order.product.pricePerKilo) {
      sellingPricePerKilo = parseFloat(order.product.pricePerKilo);
    }
    
    let profitPerKilo = 0;
    let profitPercentage = 0;
    
    if (sellingPricePerKilo) {
      profitPerKilo = parseFloat(sellingPricePerKilo) - costPerKilo;
      profitPercentage = (profitPerKilo / parseFloat(sellingPricePerKilo)) * 100;
    }
    
    // NUEVO: Calcular rentabilidad global (incluyendo subproductos)
    const mainProductValue = parseFloat(order.totalOutputKilos) * parseFloat(sellingPricePerKilo || 0);
    const totalValue = mainProductValue + subproductsValue;
    const globalProfit = totalValue - totalCost;
    const globalProfitPercentage = totalValue > 0 ? (globalProfit / totalValue) * 100 : 0;
    
    // Actualizar costos en el producto si es necesario
    if (order.product && !order.product.costPerKilo) {
      await Product.update(
        { costPerKilo },
        { where: { id: order.productId }, transaction }
      );
    }
    
    // Actualizar la orden con los cálculos
    await order.update({
      rawMaterialCost,
      suppliesCost,
      laborCost,
      packagingCost,
      fixedCost,
      variableCost,
      totalCost,
      costPerKilo,
      sellingPricePerKilo,
      profitPerKilo,
      profitPercentage,
      calculationStatus: 'calculated'
    }, { transaction });
    
    // Procesar subproductos para añadirlos al inventario cuando se complete la orden
    if (order.status === 'completed') {
      const subproducts = order.subproducts || [];
      for (const subproduct of subproducts) {
        // Solo para subproductos con productId definido
        if (subproduct.productId) {
          // Actualizamos el costPerKilo del producto si no tiene costo definido
          if (!subproduct.product?.costPerKilo && subproduct.costPerUnit) {
            await Product.update(
              { costPerKilo: subproduct.costPerUnit },
              { where: { id: subproduct.productId }, transaction }
            );
          }
        }
      }
    }
    
    await transaction.commit();
    
    // Construir respuesta detallada
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      rawMaterial: {
        kilosUsed: parseFloat(order.usedKilos),
        costPerKilo: parseFloat(order.trailerEntry.costPerKilo) || 0,
        totalCost: rawMaterialCost
      },
      expenses: {
        supplies: {
          items: expensesByType.supply,
          totalCost: suppliesCost
        },
        labor: {
          items: expensesByType.labor,
          totalCost: laborCost
        },
        packaging: {
          items: expensesByType.packaging,
          totalCost: packagingCost
        },
        fixed: {
          items: expensesByType.fixed,
          totalCost: fixedCost
        },
        variable: {
          items: expensesByType.variable,
          totalCost: variableCost
        }
      },
      subproducts: {
        items: order.subproducts || [],
        totalKilos: totalSubproductKilos,
        totalValue: subproductsValue
      },
      totals: {
        totalOutputKilos: parseFloat(order.totalOutputKilos),
        totalCost,
        costPerKilo,
        sellingPricePerKilo: parseFloat(sellingPricePerKilo) || 0,
        profitPerKilo,
        profitPercentage,
        totalProfit: profitPerKilo * parseFloat(order.totalOutputKilos)
      },
      // NUEVO: Información de rentabilidad global
      globalAnalysis: {
        combinedOutputKilos,
        mainProductValue,
        subproductsValue,
        totalValue,
        effectiveCost,
        globalProfit,
        globalProfitPercentage
      }
    };
    
  } catch (error) {
    if (transaction) await transaction.rollback();
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
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
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
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        },
        {
          model: OrderExpense,
          as: 'expenses',
          include: [
            {
              model: Supply,
              as: 'supply'
            }
          ]
        },
        {
          model: OrderSubproduct,
          as: 'subproducts',
          include: [
            {
              model: Product,
              as: 'product'
            }
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
  // Actualización parcial de src/services/manufacturingOrderService.js

// Este es solo el método listOrders actualizado, el resto del servicio permanece igual
async listOrders(filters = {}, pagination = {}) {
  const where = {};
  
  // Aplicar filtros
  if (filters.cityId) {
    where.cityId = filters.cityId;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.calculationStatus) {
    where.calculationStatus = filters.calculationStatus;
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
        include: [
          {
            model: Product,
            as: 'product'
          }
        ]
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
        model: City,
        as: 'city',
        attributes: ['id', 'name', 'code']
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
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      
      const order = await ManufacturingOrder.findByPk(id, {
        include: [
          {
            model: OrderSubproduct,
            as: 'subproducts'
          }
        ],
        transaction
      });
      
      if (!order) {
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
          
          // Verificar si se calcularon los costos
          if (order.calculationStatus !== 'calculated') {
            throw new Error('Order costs must be calculated before completion');
          }
          
          console.log(`Procesando orden ${order.id} para completar...`);
          
          // Calcular el total de kilos de subproductos
          let totalSubproductKilos = 0;
          if (order.subproducts && order.subproducts.length > 0) {
            totalSubproductKilos = order.subproducts.reduce((total, subproduct) => {
              return total + parseFloat(subproduct.quantity || 0);
            }, 0);
          }
          
          // Calcular kilos del producto principal (total menos subproductos)
          const mainProductKilos = parseFloat(order.totalOutputKilos) - totalSubproductKilos;
          
          // Verificar que no resulte en números negativos
          if (mainProductKilos < 0) {
            throw new Error(`Los subproductos (${totalSubproductKilos} kg) exceden el total de kilos producidos (${order.totalOutputKilos} kg)`);
          }
          
          console.log(`Actualizando inventario: Producto principal: ${mainProductKilos} kg, Subproductos: ${totalSubproductKilos} kg`);
          
          // Actualizar inventario para el producto principal con la cantidad reducida
          await inventoryService.updateInventory(
            order.destinationWarehouseId,
            'product',
            order.productId,
            mainProductKilos,
            transaction
          );
          
          // Procesar subproductos individualmente
          if (order.subproducts && order.subproducts.length > 0) {
            console.log(`Procesando ${order.subproducts.length} subproductos...`);
            
            for (const subproduct of order.subproducts) {
              console.log(`Procesando subproducto: ${subproduct.name}, ${subproduct.quantity} kg`);
              
              // Si tiene un productId asignado, usarlo, si no, crear un nuevo producto
              let productId = subproduct.productId;
              
              if (!productId) {
                console.log(`Creando nuevo producto para subproducto ${subproduct.name}`);
                
                // Crear nuevo producto para el subproducto
                const newProduct = await Product.create({
                  name: subproduct.name,
                  description: `Subproducto generado de la orden ${order.orderNumber}`,
                  pricePerKilo: subproduct.costPerUnit || 0,
                  costPerKilo: subproduct.costPerUnit || 0,
                  active: true
                }, { transaction });
                
                productId = newProduct.id;
                
                // Actualizar el subproducto con el nuevo productId
                await subproduct.update({
                  productId: newProduct.id
                }, { transaction });
                
                console.log(`Nuevo producto creado con ID: ${productId}`);
              } else {
                console.log(`Usando productId existente: ${productId}`);
              }
              
              // Agregar subproducto al inventario
              await inventoryService.updateInventory(
                order.destinationWarehouseId,
                'product',
                productId,
                parseFloat(subproduct.quantity),
                transaction
              );
              
              console.log(`Subproducto ${subproduct.name} (${subproduct.quantity} kg) agregado al inventario`);
            }
          } else {
            console.log('La orden no tiene subproductos');
          }
          break;
        case 'cancelled':
          // Si se cancela, devolver los kilos a la entrada de trailer
          const trailerEntry = await TrailerEntry.findByPk(order.trailerEntryId, { transaction });
          
          if (trailerEntry && trailerEntry.needsProcessing) {
            // Actualizar kilos disponibles
            const newAvailableKilos = parseFloat(trailerEntry.availableKilos) + parseFloat(order.usedKilos);
            
            // Actualizar estado de procesamiento
            let processingStatus = 'pending';
            if (newAvailableKilos >= parseFloat(trailerEntry.kilos)) {
              processingStatus = 'pending';
            } else if (newAvailableKilos > 0) {
              processingStatus = 'partial';
            }
            
            await trailerEntry.update({
              availableKilos: newAvailableKilos,
              processingStatus
            }, { transaction });
          }
          break;
      }
      
      await order.update(updateData, { transaction });
      
      await transaction.commit();
      console.log(`Transacción completada para la orden ${order.id}`);
      
      return await this.getOrderById(id);
    } catch (error) {
      console.error(`Error procesando orden: ${error.message}`);
      if (transaction) await transaction.rollback();
      throw error;
    }
  },
  /**
   * Elimina una orden (solo si está en estado pendiente)
   * @param {string} id - ID de la orden
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteOrder(id) {
    let transaction;
    
    try {
      transaction = await sequelize.transaction();
      
      const order = await ManufacturingOrder.findByPk(id, { transaction });
      
      if (!order) {
        throw new Error('Manufacturing order not found');
      }
      
      // Solo se pueden eliminar órdenes pendientes
      if (order.status !== 'pending') {
        throw new Error(`Cannot delete order with status: ${order.status}. Only pending orders can be deleted.`);
      }
      
      // Devolver los kilos a la entrada de trailer
      await this.updateOrderStatus(id, 'cancelled', {}, transaction);
      
      // Eliminar los gastos asociados
      await OrderExpense.destroy({
        where: { manufacturingOrderId: id },
        transaction
      });
      
      // Eliminar los subproductos asociados
      await OrderSubproduct.destroy({
        where: { manufacturingOrderId: id },
        transaction
      });
      
      // Eliminar la orden
      await order.destroy({ transaction });
      
      await transaction.commit();
      
      return true;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
};

module.exports = manufacturingOrderService;