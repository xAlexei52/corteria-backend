// src/services/dashboardService.js (completo)
const { 
  Sale, 
  SaleDetail, 
  TrailerEntry, 
  Customer, 
  Product, 
  Usuario, 
  ManufacturingOrder, 
  Warehouse, 
  Inventory, 
  sequelize 
} = require('../config/database');
const { Op } = require('sequelize');

const dashboardService = {
  /**
   * Obtiene las ventas del mes actual
   * @param {string} city - Ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Estadísticas de ventas del mes
   */
  async getCurrentMonthSales(city) {
    // Obtener fechas del mes actual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    // Construir condición where
    const where = {
      date: {
        [Op.between]: [firstDayOfMonth, lastDayOfMonth]
      },
      status: {
        [Op.ne]: 'cancelled' // Excluir ventas canceladas
      }
    };
    
    // Filtrar por ciudad si se proporciona
    if (city) {
      where.city = city;
    }
    
    // Obtener estadísticas de ventas
    const sales = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'paidAmount'],
        [sequelize.fn('SUM', sequelize.col('pending_amount')), 'pendingAmount']
      ],
      raw: true
    });
    
    // Obtener conteos por estado
    const salesByStatus = await Sale.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    });
    
    return {
      period: {
        start: firstDayOfMonth,
        end: lastDayOfMonth
      },
      summary: {
        totalSales: parseInt(sales[0]?.totalCount || 0),
        totalAmount: parseFloat(sales[0]?.totalAmount || 0),
        paidAmount: parseFloat(sales[0]?.paidAmount || 0),
        pendingAmount: parseFloat(sales[0]?.pendingAmount || 0),
        collectionRate: sales[0]?.totalAmount 
          ? parseFloat(sales[0].paidAmount) / parseFloat(sales[0].totalAmount) * 100 
          : 0
      },
      byStatus: salesByStatus.map(status => ({
        status: status.status,
        count: parseInt(status.count),
        amount: parseFloat(status.amount)
      }))
    };
  },
  
  /**
   * Compara las ventas del mes actual con el mes anterior
   * @param {string} city - Ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Comparación de ventas
   */
  async compareSalesWithPreviousMonth(city) {
    // Obtener fechas del mes actual
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    // Obtener fechas del mes anterior
    const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    
    // Función para consultar ventas por período
    const getSalesByPeriod = async (startDate, endDate) => {
      const where = {
        date: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.ne]: 'cancelled' // Excluir ventas canceladas
        }
      };
      
      // Filtrar por ciudad si se proporciona
      if (city) {
        where.city = city;
      }
      
      const sales = await Sale.findAll({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount']
        ],
        raw: true
      });
      
      return {
        totalSales: parseInt(sales[0]?.totalCount || 0),
        totalAmount: parseFloat(sales[0]?.totalAmount || 0)
      };
    };
    
    // Obtener datos de ambos meses
    const currentMonth = await getSalesByPeriod(firstDayOfCurrentMonth, lastDayOfCurrentMonth);
    const previousMonth = await getSalesByPeriod(firstDayOfPreviousMonth, lastDayOfPreviousMonth);
    
    // Calcular diferencias y porcentajes
    const salesDifference = currentMonth.totalSales - previousMonth.totalSales;
    const amountDifference = currentMonth.totalAmount - previousMonth.totalAmount;
    
    const salesPercentChange = previousMonth.totalSales > 0 
      ? (salesDifference / previousMonth.totalSales) * 100 
      : (currentMonth.totalSales > 0 ? 100 : 0);
    
    const amountPercentChange = previousMonth.totalAmount > 0 
      ? (amountDifference / previousMonth.totalAmount) * 100 
      : (currentMonth.totalAmount > 0 ? 100 : 0);
    
    return {
      currentMonth: {
        period: {
          start: firstDayOfCurrentMonth,
          end: lastDayOfCurrentMonth
        },
        totalSales: currentMonth.totalSales,
        totalAmount: currentMonth.totalAmount
      },
      previousMonth: {
        period: {
          start: firstDayOfPreviousMonth,
          end: lastDayOfPreviousMonth
        },
        totalSales: previousMonth.totalSales,
        totalAmount: previousMonth.totalAmount
      },
      comparison: {
        salesDifference,
        salesPercentChange,
        amountDifference,
        amountPercentChange,
        trend: amountDifference >= 0 ? 'up' : 'down'
      }
    };
  },
  
  /**
   * Obtiene las últimas entradas de trailer
   * @param {string} city - Ciudad para filtrar (opcional para admin)
   * @param {number} limit - Número de entradas a obtener
   * @returns {Promise<Array>} Lista de entradas recientes
   */
  async getRecentTrailerEntries(city, limit = 5) {
    const where = {};
    
    // Filtrar por ciudad si se proporciona
    if (city) {
      where.city = city;
    }
    
    const entries = await TrailerEntry.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['date', 'DESC']],
      limit
    });
    
    return entries;
  },
  
  /**
   * Obtiene las últimas ventas
   * @param {string} city - Ciudad para filtrar (opcional para admin)
   * @param {number} limit - Número de ventas a obtener
   * @returns {Promise<Array>} Lista de ventas recientes
   */
  async getRecentSales(city, limit = 5) {
    const where = {};
    
    // Filtrar por ciudad si se proporciona
    if (city) {
      where.city = city;
    }
    
    const sales = await Sale.findAll({
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
        }
      ],
      order: [['date', 'DESC']],
      limit
    });
    
    return sales;
  },

  /**
   * Obtiene una comparativa de utilidades entre entrada de trailer y orden de manufactura
   * @param {string} city - Ciudad para filtrar
   * @param {Object} dateRange - Rango de fechas opcional
   * @returns {Promise<Object>} Datos de comparación
   */
  async getManufacturingProfitComparison(city, dateRange = {}) {
    // Construir condiciones where para filtrar por fecha
    const whereTrailer = {};
    const whereOrder = {};
    
    if (city) {
      whereTrailer.city = city;
      whereOrder.city = city;
    }

    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      whereTrailer.date = {
        [Op.between]: [startDate, endDate]
      };
      
      whereOrder.updatedAt = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Obtener órdenes de manufactura completadas
    const orders = await ManufacturingOrder.findAll({
      where: {
        ...whereOrder,
        status: 'completed',
        calculationStatus: 'calculated'
      },
      include: [
        {
          model: TrailerEntry,
          as: 'trailerEntry'
        },
        {
          model: Product,
          as: 'product'
        }
      ],
      attributes: [
        'id', 
        'orderNumber', 
        'totalOutputKilos', 
        'totalCost', 
        'costPerKilo', 
        'sellingPricePerKilo',
        'profitPerKilo',
        'profitPercentage',
        'rawMaterialCost'
      ]
    });

    // Calcular estadísticas de rentabilidad
    const totalOrders = orders.length;
    let totalInputKilos = 0;
    let totalOutputKilos = 0;
    let totalRawMaterialCost = 0;
    let totalProcessingCost = 0;
    let totalProductionValue = 0;
    let totalProfit = 0;
    
    orders.forEach(order => {
      const usedKilos = parseFloat(order.usedKilos || 0);
      const outputKilos = parseFloat(order.totalOutputKilos || 0);
      const rawMaterialCost = parseFloat(order.rawMaterialCost || 0);
      const totalCost = parseFloat(order.totalCost || 0);
      const processingCost = totalCost - rawMaterialCost;
      const productionValue = outputKilos * parseFloat(order.sellingPricePerKilo || 0);
      const profit = productionValue - totalCost;
      
      totalInputKilos += usedKilos;
      totalOutputKilos += outputKilos;
      totalRawMaterialCost += rawMaterialCost;
      totalProcessingCost += processingCost;
      totalProductionValue += productionValue;
      totalProfit += profit;
    });

    // Calcular promedios y porcentajes
    const avgProfitPercentage = totalProductionValue > 0 
      ? (totalProfit / totalProductionValue) * 100 
      : 0;
    
    const avgYieldPercentage = totalInputKilos > 0 
      ? (totalOutputKilos / totalInputKilos) * 100 
      : 0;
    
    return {
      period: dateRange.startDate && dateRange.endDate ? {
        start: dateRange.startDate,
        end: dateRange.endDate
      } : 'Todos los tiempos',
      summary: {
        totalOrders,
        totalInputKilos,
        totalOutputKilos,
        avgYieldPercentage,
        totalRawMaterialCost,
        totalProcessingCost,
        totalProductionValue,
        totalProfit,
        avgProfitPercentage
      }
    };
  },

  /**
   * Obtiene estadísticas de inventario por tipo de producto
   * @param {string} city - Ciudad para filtrar
   * @returns {Promise<Object>} Estadísticas de inventario
   */
  async getInventoryStatistics(city) {
    // Construir condiciones where
    const warehouseWhere = {};
    if (city) {
      warehouseWhere.city = city;
    }

    // Obtener todos los almacenes activos de la ciudad
    const warehouses = await Warehouse.findAll({
      where: {
        ...warehouseWhere,
        active: true
      },
      attributes: ['id', 'name', 'city']
    });

    const warehouseIds = warehouses.map(w => w.id);

    // Obtener inventario agrupado por tipo
    const inventoryStats = await Inventory.findAll({
      attributes: [
        'itemType',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'itemCount']
      ],
      where: {
        warehouseId: {
          [Op.in]: warehouseIds
        }
      },
      group: ['itemType'],
      raw: true
    });

    // Obtener valor total del inventario (solo para productos)
    const productInventory = await Inventory.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('quantity * product.price_per_kilo')), 'totalValue']
      ],
      where: {
        warehouseId: {
          [Op.in]: warehouseIds
        },
        itemType: 'product'
      },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: []
        }
      ],
      raw: true
    });

    // Formar objeto de respuesta
    const inventoryByType = {};
    inventoryStats.forEach(stat => {
      inventoryByType[stat.itemType] = {
        totalQuantity: parseFloat(stat.totalQuantity),
        itemCount: parseInt(stat.itemCount)
      };
    });

    return {
      city: city || 'Todas',
      inventoryByType,
      totalProductValue: productInventory[0]?.totalValue ? parseFloat(productInventory[0].totalValue) : 0,
      warehouseCount: warehouses.length
    };
  },
  
  /**
   * Obtiene un resumen completo para el dashboard
   * @param {string} city - Ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Datos completos para el dashboard
   */
  async getDashboardSummary(city) {
    // Ejecutar todas las consultas en paralelo
    const [
      currentMonthSales,
      salesComparison,
      recentEntries,
      recentSales,
      manufacturingProfit,
      inventoryStats
    ] = await Promise.all([
      this.getCurrentMonthSales(city),
      this.compareSalesWithPreviousMonth(city),
      this.getRecentTrailerEntries(city),
      this.getRecentSales(city),
      this.getManufacturingProfitComparison(city, {
        startDate: new Date(new Date().setDate(1)), // Primer día del mes
        endDate: new Date() // Hoy
      }),
      this.getInventoryStatistics(city)
    ]);
    
    // Consulta para clientes con deudas
    const where = {
      balance: {
        [Op.gt]: 0
      }
    };
    
    if (city) {
      where.city = city;
    }
    
    const customersWithDebt = await Customer.count({ where });
    
    // Consulta para productos más vendidos (top 5)
    const topProducts = await SaleDetail.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name']
        }
      ],
      where: {
        '$sale.status$': { [Op.ne]: 'cancelled' },
        ...(city ? { '$sale.city$': city } : {})
      },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name']
        },
        {
          model: Sale,
          as: 'sale',
          attributes: []
        }
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    return {
      currentMonthSales,
      salesComparison,
      recentEntries,
      recentSales,
      manufacturingProfit,
      inventoryStats,
      customersWithDebt,
      topProducts: topProducts.map(product => ({
        id: product.productId,
        name: product['product.name'],
        totalQuantity: parseFloat(product.totalQuantity)
      }))
    };
  }
};

module.exports = dashboardService;