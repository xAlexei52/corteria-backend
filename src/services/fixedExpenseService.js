// src/services/fixedExpenseService.js
const { FixedExpense } = require('../config/database');
const { Op } = require('sequelize');

const fixedExpenseService = {
  /**
   * Crea un nuevo gasto fijo
   * @param {Object} expenseData - Datos del gasto
   * @returns {Promise<Object>} Gasto creado
   */
  async createFixedExpense(expenseData) {
    const expense = await FixedExpense.create(expenseData);
    return expense;
  },

  /**
   * Obtiene un gasto fijo por ID
   * @param {string} id - ID del gasto
   * @returns {Promise<Object>} Gasto encontrado
   */
  async getFixedExpenseById(id) {
    const expense = await FixedExpense.findByPk(id);
    
    if (!expense) {
      throw new Error('Fixed expense not found');
    }
    
    return expense;
  },

  /**
   * Lista gastos fijos con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de gastos y metadatos de paginación
   */
  async listFixedExpenses(filters = {}, pagination = {}) {
    const where = {};
    
    if (filters.city) {
      where.city = filters.city;
    }
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.period) {
      where.period = filters.period;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await FixedExpense.findAndCountAll({
      where,
      order: [
        ['city', 'ASC'],
        ['name', 'ASC']
      ],
      limit,
      offset
    });
    
    return {
      expenses: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un gasto fijo
   * @param {string} id - ID del gasto
   * @param {Object} expenseData - Datos a actualizar
   * @returns {Promise<Object>} Gasto actualizado
   */
  async updateFixedExpense(id, expenseData) {
    const expense = await FixedExpense.findByPk(id);
    
    if (!expense) {
      throw new Error('Fixed expense not found');
    }
    
    await expense.update(expenseData);
    
    return expense;
  },

  /**
   * Elimina un gasto fijo (desactivación lógica)
   * @param {string} id - ID del gasto
   * @returns {Promise<boolean>} True si se desactivó correctamente
   */
  async deleteFixedExpense(id) {
    const expense = await FixedExpense.findByPk(id);
    
    if (!expense) {
      throw new Error('Fixed expense not found');
    }
    
    await expense.update({ active: false });
    
    return true;
  },

  /**
   * Calcula el promedio diario de un gasto fijo
   * @param {Object} expense - Gasto fijo
   * @returns {number} Promedio diario
   */
  calculateDailyAverage(expense) {
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
    
    return parseFloat(dailyAmount.toFixed(2));
  },

  /**
   * Obtiene el costo diario total de todos los gastos fijos por ciudad
   * @param {string} city - Ciudad para filtrar
   * @returns {Promise<number>} Costo diario total
   */
  async getTotalDailyCost(city) {
    // Obtener todos los gastos fijos activos de la ciudad
    const expenses = await FixedExpense.findAll({
      where: {
        city,
        active: true
      }
    });
    
    // Calcular costo diario total
    const totalDailyCost = expenses.reduce((total, expense) => {
      return total + this.calculateDailyAverage(expense);
    }, 0);
    
    return parseFloat(totalDailyCost.toFixed(2));
  }
};

module.exports = fixedExpenseService;