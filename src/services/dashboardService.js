// src/services/dashboardService.js (actualizado para cityId)
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
  City, 
  sequelize 
} = require('../config/database');
const { Op } = require('sequelize');

const dashboardService = {
  /**
   * Obtiene las ventas del mes actual
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Estadísticas de ventas del mes
   */
  async getCurrentMonthSales(cityId) {
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
    if (cityId) {
      where.cityId = cityId;
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
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Comparación de ventas
   */
  async compareSalesWithPreviousMonth(cityId) {
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
      if (cityId) {
        where.cityId = cityId;
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
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @param {number} limit - Número de entradas a obtener
   * @returns {Promise<Array>} Lista de entradas recientes
   */
  async getRecentTrailerEntries(cityId, limit = 5) {
    const where = {};
    
    // Filtrar por ciudad si se proporciona
    if (cityId) {
      where.cityId = cityId;
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
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['date', 'DESC']],
      limit
    });
    
    return entries;
  },
  
  /**
   * Obtiene las últimas ventas
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @param {number} limit - Número de ventas a obtener
   * @returns {Promise<Array>} Lista de ventas recientes
   */
  async getRecentSales(cityId, limit = 5) {
    const where = {};
    
    // Filtrar por ciudad si se proporciona
    if (cityId) {
      where.cityId = cityId;
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
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['date', 'DESC']],
      limit
    });
    
    return sales;
  },

  /**
   * Obtiene una comparativa de utilidades entre entrada de trailer y orden de manufactura
   * @param {string} cityId - ID de la ciudad para filtrar
   * @param {Object} dateRange - Rango de fechas opcional
   * @returns {Promise<Object>} Datos de comparación
   */
  async getManufacturingProfitComparison(cityId, dateRange = {}) {
    // Construir condiciones where para filtrar por fecha
    const whereTrailer = {};
    const whereOrder = {};
    
    if (cityId) {
      whereTrailer.cityId = cityId;
      whereOrder.cityId = cityId;
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
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
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
   * @param {string} cityId - ID de la ciudad para filtrar
   * @returns {Promise<Object>} Estadísticas de inventario
   */
  async getInventoryStatistics(cityId) {
    // Construir condiciones where
    const warehouseWhere = {};
    if (cityId) {
      warehouseWhere.cityId = cityId;
    }

    // Obtener todos los almacenes activos de la ciudad
    const warehouses = await Warehouse.findAll({
      where: {
        ...warehouseWhere,
        active: true
      },
      attributes: ['id', 'name'],
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        }
      ]
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

    // Obtener nombre de la ciudad si se proporcionó un ID
    let cityName = 'Todas';
    if (cityId) {
      const city = await City.findByPk(cityId);
      if (city) {
        cityName = city.name;
      }
    }

    return {
      cityId,
      cityName,
      inventoryByType,
      totalProductValue: productInventory[0]?.totalValue ? parseFloat(productInventory[0].totalValue) : 0,
      warehouseCount: warehouses.length
    };
  },
  
  /**
   * Obtiene un resumen completo para el dashboard
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Datos completos para el dashboard
   */
  async getDashboardSummary(cityId) {
    // Ejecutar todas las consultas en paralelo
    const [
      currentMonthSales,
      salesComparison,
      recentEntries,
      recentSales,
      manufacturingProfit,
      inventoryStats
    ] = await Promise.all([
      this.getCurrentMonthSales(cityId),
      this.compareSalesWithPreviousMonth(cityId),
      this.getRecentTrailerEntries(cityId),
      this.getRecentSales(cityId),
      this.getManufacturingProfitComparison(cityId, {
        startDate: new Date(new Date().setDate(1)), // Primer día del mes
        endDate: new Date() // Hoy
      }),
      this.getInventoryStatistics(cityId)
    ]);
    
    // Consulta para clientes con deudas
    const where = {
      balance: {
        [Op.gt]: 0
      }
    };
    
    if (cityId) {
      where.cityId = cityId;
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
        },
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: {
            status: { [Op.ne]: 'cancelled' },
            ...(cityId ? { cityId } : {})
          }
        }
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Obtener información de la ciudad
    let cityInfo = null;
    if (cityId) {
      cityInfo = await City.findByPk(cityId, {
        attributes: ['id', 'name', 'code']
      });
    }
    
    return {
      cityInfo,
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