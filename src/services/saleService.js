// src/services/saleService.js
const { Sale, SaleDetail, Customer, Payment, Product, Warehouse, Usuario, Inventory, City, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const inventoryService = require('./inventoryService');

const saleService = {
  /**
   * Genera un número de venta único
   * @returns {string} Número de venta
   */
  generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `S-${year}${month}${day}-${random}`;
  },

  /**
   * Crea una nueva venta
   * @param {Object} saleData - Datos de la venta
   * @param {Array} products - Productos de la venta
   * @param {string} userId - ID del usuario que crea la venta
   * @returns {Promise<Object>} Venta creada
   */
  async createSale(saleData, products, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que existe el cliente
      const customer = await Customer.findByPk(saleData.customerId);
      
      if (!customer) {
        await transaction.rollback();
        throw new Error('Customer not found');
      }
      
      // Validar que haya productos
      if (!products || products.length === 0) {
        await transaction.rollback();
        throw new Error('At least one product is required');
      }
      
      // Generar número de venta único
      const saleNumber = this.generateSaleNumber();
      
      // Calcular el total de la venta
      let totalAmount = 0;
      
      // Verificar inventario y calcular subtotales
      for (const product of products) {
        // Verificar que existe el producto
        const productObj = await Product.findByPk(product.productId);
        
        if (!productObj) {
          await transaction.rollback();
          throw new Error(`Product with ID ${product.productId} not found`);
        }
        
        // Verificar que existe el almacén
        const warehouse = await Warehouse.findByPk(product.warehouseId);
        
        if (!warehouse) {
          await transaction.rollback();
          throw new Error(`Warehouse with ID ${product.warehouseId} not found`);
        }
        
        // Verificar que haya suficiente inventario
        const currentStock = await inventoryService.getItemInventory(
          product.warehouseId,
          'product',
          product.productId
        );
        
        if (currentStock < product.quantity) {
          await transaction.rollback();
          throw new Error(`Insufficient stock for product ${productObj.name}: ${currentStock} available`);
        }
        
        // Calcular subtotal
        const subtotal = product.quantity * product.unitPrice;
        product.subtotal = subtotal;
        totalAmount += subtotal;
      }
      
      // Crear la venta
      const sale = await Sale.create({
        saleNumber,
        date: saleData.date || new Date(),
        status: 'pending',
        totalAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        notes: saleData.notes || null,
        cityId: customer.cityId, // La ciudad se toma del cliente
        customerId: saleData.customerId,
        createdBy: userId
      }, { transaction });
      
      // Crear los detalles de la venta
      for (const product of products) {
        await SaleDetail.create({
          saleId: sale.id,
          productId: product.productId,
          warehouseId: product.warehouseId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          subtotal: product.subtotal,
          boxes: product.boxes || null,
          notes: product.notes || null
        }, { transaction });
        
        // Actualizar el inventario (restar)
        await inventoryService.updateInventory(
          product.warehouseId,
          'product',
          product.productId,
          -product.quantity,
          transaction
        );
      }
      
      // Actualizar datos del cliente
      await customer.update({
        balance: sequelize.literal(`balance + ${totalAmount}`),
        totalPurchases: sequelize.literal(`total_purchases + ${totalAmount}`),
        lastPurchaseDate: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      // Retornar la venta completa
      return await this.getSaleById(sale.id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene una venta por ID
   * @param {string} id - ID de la venta
   * @returns {Promise<Object>} Venta encontrada
   */
  async getSaleById(id) {
    const sale = await Sale.findByPk(id, {
      include: [
        {
          model: SaleDetail,
          as: 'details',
          include: [
            {
              model: Product,
              as: 'product'
            },
            {
              model: Warehouse,
              as: 'warehouse'
            }
          ]
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });
    
    if (!sale) {
      throw new Error('Sale not found');
    }
    
    return sale;
  },

  /**
   * Lista ventas con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de ventas y metadatos de paginación
   */
  async listSales(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.customerId) {
      where.customerId = filters.customerId;
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
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        },
      ],
      order: [['date', 'DESC']],
      limit,
      offset
    });
    
    return {
      sales: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Cancela una venta
   * @param {string} id - ID de la venta
   * @returns {Promise<Object>} Venta cancelada
   */
// En saleService.js, modificar la función cancelSale
async cancelSale(id) {
    const transaction = await sequelize.transaction();
    
    try {
      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleDetail,
            as: 'details'
          },
          {
            model: Payment,
            as: 'payments'
          }
        ],
        transaction
      });
      
      if (!sale) {
        await transaction.rollback();
        throw new Error('Sale not found');
      }
      
      // Verificar si tiene pagos
      if (sale.payments && sale.payments.length > 0) {
        await transaction.rollback();
        throw new Error('Cannot cancel a sale with payments. Refund the payments first.');
      }
      
      // Guardar el monto pendiente antes de actualizar la venta
      const pendingAmount = parseFloat(sale.pendingAmount);
      const totalAmount = parseFloat(sale.totalAmount);
      
      // Actualizar estado de la venta
      await sale.update({ 
        status: 'cancelled',
        pendingAmount: 0
      }, { transaction });
      
      // Actualizar inventario (devolver productos)
      for (const detail of sale.details) {
        await inventoryService.updateInventory(
          detail.warehouseId,
          'product',
          detail.productId,
          detail.quantity,
          transaction
        );
      }
      
      // Actualizar saldo del cliente y total de compras
      // Usamos los valores guardados anteriormente
      await Customer.update(
        { 
          balance: sequelize.literal(`balance - ${pendingAmount}`),
          totalPurchases: sequelize.literal(`total_purchases - ${totalAmount}`)
        },
        { 
          where: { id: sale.customerId },
          transaction
        }
      );
      
      await transaction.commit();
      
      // Retornar la venta actualizada
      return await this.getSaleById(id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Registra un pago para una venta
   * @param {string} saleId - ID de la venta
   * @param {Object} paymentData - Datos del pago
   * @param {string} userId - ID del usuario que registra el pago
   * @returns {Promise<Object>} Resultado del pago
   */
  // En saleService.js, modificar la función registerPayment
async registerPayment(saleId, paymentData, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      const sale = await Sale.findByPk(saleId, {
        transaction
      });
      
      if (!sale) {
        await transaction.rollback();
        throw new Error('Sale not found');
      }
      
      // Verificar que la venta no esté cancelada
      if (sale.status === 'cancelled') {
        await transaction.rollback();
        throw new Error('Cannot register payment for a cancelled sale');
      }
      
      // Verificar que no se pague más de lo pendiente
      if (paymentData.amount > sale.pendingAmount) {
        await transaction.rollback();
        throw new Error(`Cannot pay more than pending amount: ${sale.pendingAmount}`);
      }
      
      // Crear el pago
      const payment = await Payment.create({
        amount: paymentData.amount,
        date: paymentData.date || new Date(),
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber || null,
        notes: paymentData.notes || null,
        customerId: sale.customerId,
        saleId: sale.id,
        receivedBy: userId
      }, { transaction });
      
      // Actualizar la venta - CORRECCIÓN AQUÍ
      const newPaidAmount = parseFloat(sale.paidAmount) + parseFloat(paymentData.amount);
      const newPendingAmount = parseFloat(sale.totalAmount) - newPaidAmount;
      const newStatus = newPendingAmount <= 0 ? 'paid' : 'partially_paid';
      
      await sale.update({
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus
      }, { transaction });
      
      // Actualizar saldo del cliente
      await Customer.update(
        { 
          balance: sequelize.literal(`balance - ${paymentData.amount}`)
        },
        { 
          where: { id: sale.customerId },
          transaction
        }
      );
      
      await transaction.commit();
      
      // Retornar resultado
      const updatedSale = await this.getSaleById(saleId);
      
      return {
        payment,
        sale: updatedSale
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de ventas
   * @param {Object} filters - Filtros para las estadísticas
   * @returns {Promise<Object>} Estadísticas de ventas
   */
  async getSalesStats(filters = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.city) {
      where.city = filters.city;
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
    
    // Contar ventas por estado
    const salesByStatus = await Sale.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
      ],
      group: ['status'],
      raw: true
    });
    
    // Total de ventas
    const totalStats = await Sale.findAll({
      where: {
        ...where,
        status: { [Op.ne]: 'cancelled' } // Excluir canceladas
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalPaid'],
        [sequelize.fn('SUM', sequelize.col('pending_amount')), 'totalPending']
      ],
      raw: true
    });
    
    // Top 5 clientes
    const topCustomers = await Sale.findAll({
      where: {
        ...where,
        status: { [Op.ne]: 'cancelled' } // Excluir canceladas
      },
      attributes: [
        'customerId',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
      ],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['firstName', 'lastName']
        }
      ],
      group: ['customerId', 'customer.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Top 5 productos
    const topProducts = await SaleDetail.findAll({
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: {
            ...where,
            status: { [Op.ne]: 'cancelled' } // Excluir canceladas
          }
        },
        {
          model: Product,
          as: 'product',
          attributes: ['name']
        }
      ],
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalAmount']
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('subtotal')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Formatear la respuesta
    return {
      filters,
      summary: {
        totalSales: totalStats[0]?.totalSales || 0,
        totalAmount: totalStats[0]?.totalAmount || 0,
        totalPaid: totalStats[0]?.totalPaid || 0,
        totalPending: totalStats[0]?.totalPending || 0
      },
      salesByStatus: salesByStatus.map(status => ({
        status: status.status,
        count: status.count,
        total: status.total
      })),
      topCustomers: topCustomers.map(customer => ({
        id: customer.customerId,
        name: `${customer['customer.firstName']} ${customer['customer.lastName']}`,
        total: customer.total
      })),
      topProducts: topProducts.map(product => ({
        id: product.productId,
        name: product['product.name'],
        quantity: product.totalQuantity,
        total: product.totalAmount
      }))
    };
  }
};

module.exports = saleService;