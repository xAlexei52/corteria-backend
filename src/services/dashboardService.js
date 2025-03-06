// src/services/dashboardService.js
const { Sale, SaleDetail, TrailerEntry, Customer, Product, Usuario, sequelize } = require('../config/database');
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
      recentSales
    ] = await Promise.all([
      this.getCurrentMonthSales(city),
      this.compareSalesWithPreviousMonth(city),
      this.getRecentTrailerEntries(city),
      this.getRecentSales(city)
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