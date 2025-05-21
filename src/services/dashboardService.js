// src/services/dashboardService.js (actualizado con análisis de utilidades)
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
   * NUEVO MÉTODO: Obtiene las utilidades reales del mes: Ventas - Costos de Producción
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @param {Object} dateRange - Rango de fechas opcional
   * @returns {Promise<Object>} Estadísticas de utilidades reales
   */
  async getMonthlyProfitAnalysis(cityId, dateRange = {}) {
    // Si no se proporciona rango de fechas, usar el mes actual
    if (!dateRange.startDate || !dateRange.endDate) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      dateRange = {
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth
      };
    }
    
    // Construir condiciones where para ventas
    const salesWhere = {
      date: {
        [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)]
      },
      status: {
        [Op.ne]: 'cancelled' // Excluir ventas canceladas
      }
    };
    
    // Filtrar por ciudad si se proporciona
    if (cityId) {
      salesWhere.cityId = cityId;
    }
    
    // Construir condiciones where para órdenes de manufactura
    const ordersWhere = {
      status: 'completed', // Solo órdenes completadas
      calculationStatus: 'calculated', // Solo con costos calculados
      endDate: {
        [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)]
      }
    };
    
    // Filtrar por ciudad si se proporciona
    if (cityId) {
      ordersWhere.cityId = cityId;
    }
    
    // Ejecutar consultas en paralelo para mejor rendimiento
    const [salesData, manufacturingData] = await Promise.all([
      // Obtener datos de ventas para el período
      Sale.findAll({
        where: salesWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'salesCount']
        ],
        raw: true
      }),
      
      // Obtener datos de órdenes de manufactura para el período
      ManufacturingOrder.findAll({
        where: ordersWhere,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost'],
          
          [sequelize.fn('COUNT', sequelize.col('id')), 'ordersCount']
        ],
        raw: true
      })
    ]);
    
    // Obtener totales
    const totalSales = parseFloat(salesData[0]?.totalSales || 0);
    const totalManufacturingCost = parseFloat(manufacturingData[0]?.totalCost || 0);
    const totalProfit = totalSales - totalManufacturingCost;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    
    // Calcular costos por kilos y kilos totales producidos
    const totalKilosProduced = parseFloat(manufacturingData[0]?.totalKilos || 0);
    const avgCostPerKilo = totalKilosProduced > 0 ? totalManufacturingCost / totalKilosProduced : 0;
    
    // Obtener datos más detallados para análisis
    const salesByDay = await Sale.findAll({
      where: salesWhere,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date')), 'day'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: [sequelize.fn('DATE', sequelize.col('date'))],
      order: [[sequelize.fn('DATE', sequelize.col('date')), 'ASC']],
      raw: true
    });
    
    const costsByDay = await ManufacturingOrder.findAll({
      where: ordersWhere,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('end_date')), 'day'],
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'amount']
      ],
      group: [sequelize.fn('DATE', sequelize.col('end_date'))],
      order: [[sequelize.fn('DATE', sequelize.col('end_date')), 'ASC']],
      raw: true
    });
    
    // Combinar datos por día para crear un análisis diario
    const dailyAnalysis = {};
    
    // Llenar con datos de ventas
    salesByDay.forEach(sale => {
      const day = sale.day;
      if (!dailyAnalysis[day]) {
        dailyAnalysis[day] = { sales: 0, costs: 0, profit: 0 };
      }
      dailyAnalysis[day].sales = parseFloat(sale.amount || 0);
    });
    
    // Llenar con datos de costos
    costsByDay.forEach(cost => {
      const day = cost.day;
      if (!dailyAnalysis[day]) {
        dailyAnalysis[day] = { sales: 0, costs: 0, profit: 0 };
      }
      dailyAnalysis[day].costs = parseFloat(cost.amount || 0);
    });
    
    // Calcular ganancia diaria
    Object.keys(dailyAnalysis).forEach(day => {
      dailyAnalysis[day].profit = dailyAnalysis[day].sales - dailyAnalysis[day].costs;
    });
    
    // Convertir el objeto a un array para facilitar su consumo en el frontend
    const dailyProfitAnalysis = Object.keys(dailyAnalysis).map(day => ({
      date: day,
      sales: dailyAnalysis[day].sales,
      costs: dailyAnalysis[day].costs,
      profit: dailyAnalysis[day].profit
    }));
    
    // Obtener top de productos por rentabilidad
    const topProductsByProfit = await ManufacturingOrder.findAll({
      where: ordersWhere,
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost'],
        [sequelize.fn('AVG', sequelize.col('profit_per_kilo')), 'avgProfitPerKilo']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name']
        }
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.literal('avgProfitPerKilo'), 'DESC']],
      limit: 5,
      raw: true
    });
    
    return {
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      summary: {
        totalSales,
        totalManufacturingCost,
        totalProfit,
        profitMargin,
        totalKilosProduced,
        avgCostPerKilo,
        salesCount: parseInt(salesData[0]?.salesCount || 0),
        manufacturingOrdersCount: parseInt(manufacturingData[0]?.ordersCount || 0)
      },
      dailyProfitAnalysis,
      topProductsByProfit: topProductsByProfit.map(product => ({
        productId: product.productId,
        productName: product['product.name'],
        totalKilos: parseFloat(product.totalKilos || 0),
        totalCost: parseFloat(product.totalCost || 0),
        profitPerKilo: parseFloat(product.avgProfitPerKilo || 0),
        estimatedProfit: parseFloat(product.totalKilos || 0) * parseFloat(product.avgProfitPerKilo || 0)
      }))
    };
  },
  
  /**
   * NUEVO MÉTODO: Obtiene la tendencia de utilidades mensuales para los últimos 12 meses
   * @param {string} cityId - ID de la ciudad para filtrar (opcional para admin)
   * @returns {Promise<Object>} Tendencia de utilidades mensuales
   */
  async getMonthlyProfitTrend(cityId) {
    // Configurar rango de fechas para los últimos 12 meses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11); // 12 meses atrás (incluyendo el actual)
    startDate.setDate(1); // Primer día del mes
    startDate.setHours(0, 0, 0, 0);
    
    // Para cada mes, calcular ventas y costos
    const months = [];
    const currentMonth = new Date(startDate);
    
    while (currentMonth <= endDate) {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      months.push({
        month: currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        startDate: new Date(monthStart),
        endDate: new Date(monthEnd)
      });
      
      // Avanzar al siguiente mes
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Construir condiciones base para las consultas
    const baseWhere = {};
    if (cityId) {
      baseWhere.cityId = cityId;
    }
    
    // Recopilar datos para cada mes
    const monthlyData = await Promise.all(months.map(async (monthInfo) => {
      // Ventas del mes (excluyendo canceladas)
      const salesWhere = {
        ...baseWhere,
        date: {
          [Op.between]: [monthInfo.startDate, monthInfo.endDate]
        },
        status: {
          [Op.ne]: 'cancelled'
        }
      };
      
      // Órdenes de manufactura completadas en el mes
      const ordersWhere = {
        ...baseWhere,
        status: 'completed',
        calculationStatus: 'calculated',
        endDate: {
          [Op.between]: [monthInfo.startDate, monthInfo.endDate]
        }
      };
      
      // Ejecutar consultas en paralelo
      const [salesData, manufacturingData] = await Promise.all([
        Sale.findAll({
          where: salesWhere,
          attributes: [
            [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          raw: true
        }),
        
        ManufacturingOrder.findAll({
          where: ordersWhere,
          attributes: [
            [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          raw: true
        })
      ]);
      
      // Obtener totales
      const totalSales = parseFloat(salesData[0]?.totalSales || 0);
      const totalCost = parseFloat(manufacturingData[0]?.totalCost || 0);
      const profit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      
      return {
        month: monthInfo.month,
        totalSales,
        totalCost,
        profit,
        profitMargin,
        salesCount: parseInt(salesData[0]?.count || 0),
        manufacturingOrdersCount: parseInt(manufacturingData[0]?.count || 0)
      };
    }));
    
    // Calcular totales generales
    const totals = monthlyData.reduce((acc, month) => {
      acc.totalSales += month.totalSales;
      acc.totalCost += month.totalCost;
      acc.totalProfit += month.profit;
      acc.salesCount += month.salesCount;
      acc.manufacturingOrdersCount += month.manufacturingOrdersCount;
      return acc;
    }, { 
      totalSales: 0, 
      totalCost: 0, 
      totalProfit: 0, 
      salesCount: 0, 
      manufacturingOrdersCount: 0 
    });
    
    // Calcular margen de utilidad promedio general
    totals.avgProfitMargin = totals.totalSales > 0 
      ? (totals.totalProfit / totals.totalSales) * 100 
      : 0;
    
    return {
      period: {
        start: startDate,
        end: endDate
      },
      monthlyData,
      totals
    };
  },
  
// src/services/dashboardService.js (continuación)

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
      inventoryStats,
      // Añadir el análisis de utilidades
      monthlyProfitAnalysis
    ] = await Promise.all([
      this.getCurrentMonthSales(cityId),
      this.compareSalesWithPreviousMonth(cityId),
      this.getRecentTrailerEntries(cityId),
      this.getRecentSales(cityId),
      this.getManufacturingProfitComparison(cityId, {
        startDate: new Date(new Date().setDate(1)), // Primer día del mes
        endDate: new Date() // Hoy
      }),
      this.getInventoryStatistics(cityId),
      // Llamar al nuevo método de análisis de utilidades
      this.getMonthlyProfitAnalysis(cityId)
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
      })),
      // Añadir la información de utilidades al resultado
      monthlyProfitAnalysis
    };
  }
};

module.exports = dashboardService;