// src/controllers/fixedExpenseController.js
const fixedExpenseService = require('../services/fixedExpenseService');

const fixedExpenseController = {
  /**
   * Crea un nuevo gasto fijo
   * @route POST /api/fixed-expenses
   */
  async createFixedExpense(req, res) {
    try {
      const { name, description, amount, city, period } = req.body;
      
      // Validación básica
      if (!name || amount === undefined || !city) {
        return res.status(400).json({
          success: false,
          message: 'Name, amount, and city are required'
        });
      }
      
      // Validar que el monto sea un número positivo
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      
      // Validar período
      const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
      if (period && !validPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          message: 'Period must be one of: daily, weekly, monthly, yearly'
        });
      }
      
      const expense = await fixedExpenseService.createFixedExpense({
        name,
        description,
        amount,
        city,
        period: period || 'monthly' // Valor por defecto
      });
      
      res.status(201).json({
        success: true,
        message: 'Fixed expense created successfully',
        expense
      });
    } catch (error) {
      console.error('Create fixed expense error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error creating fixed expense',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un gasto fijo por ID
   * @route GET /api/fixed-expenses/:id
   */
  async getFixedExpenseById(req, res) {
    try {
      const { id } = req.params;
      
      const expense = await fixedExpenseService.getFixedExpenseById(id);
      
      // Calcular y agregar el promedio diario
      expense.dataValues.dailyAverage = fixedExpenseService.calculateDailyAverage(expense);
      
      res.status(200).json({
        success: true,
        expense
      });
    } catch (error) {
      console.error('Get fixed expense error:', error);
      
      if (error.message === 'Fixed expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Fixed expense not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching fixed expense',
        error: error.message
      });
    }
  },
  
  /**
   * Lista gastos fijos con filtros opcionales
   * @route GET /api/fixed-expenses
   */
  async listFixedExpenses(req, res) {
    try {
      const { page = 1, limit = 10, search, city, period, active } = req.query;
      
      // Si el usuario no es admin, solo puede ver gastos de su ciudad
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        search,
        period,
        active: active === 'true' ? true : (active === 'false' ? false : undefined),
        city: userRole === 'admin' ? (city || undefined) : userCity
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await fixedExpenseService.listFixedExpenses(filters, pagination);
      
      // Calcular y agregar el promedio diario para cada gasto
      result.expenses = result.expenses.map(expense => {
        const expenseObj = expense.toJSON();
        expenseObj.dailyAverage = fixedExpenseService.calculateDailyAverage(expense);
        return expenseObj;
      });
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List fixed expenses error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing fixed expenses',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un gasto fijo
   * @route PUT /api/fixed-expenses/:id
   */
  async updateFixedExpense(req, res) {
    try {
      const { id } = req.params;
      const { name, description, amount, period, active } = req.body;
      
      // Obtener el gasto para verificar permisos
      const currentExpense = await fixedExpenseService.getFixedExpenseById(id);
      
      // Si no es admin, solo puede editar gastos de su ciudad
      if (req.user.role !== 'admin' && currentExpense.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update expenses from other cities'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      if (amount !== undefined) {
        // Validar que el monto sea un número positivo
        if (isNaN(amount) || amount < 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
          });
        }
        updateData.amount = amount;
      }
      
      if (period) {
        // Validar período
        const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!validPeriods.includes(period)) {
          return res.status(400).json({
            success: false,
            message: 'Period must be one of: daily, weekly, monthly, yearly'
          });
        }
        updateData.period = period;
      }
      
      if (active !== undefined) updateData.active = active;
      
      // No permitir cambiar la ciudad
      const expense = await fixedExpenseService.updateFixedExpense(id, updateData);
      
      // Calcular y agregar el promedio diario
      expense.dataValues.dailyAverage = fixedExpenseService.calculateDailyAverage(expense);
      
      res.status(200).json({
        success: true,
        message: 'Fixed expense updated successfully',
        expense
      });
    } catch (error) {
      console.error('Update fixed expense error:', error);
      
      if (error.message === 'Fixed expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Fixed expense not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating fixed expense',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene el costo diario total por ciudad
   * @route GET /api/fixed-expenses/total-daily-cost/:city
   */
  async getTotalDailyCost(req, res) {
    try {
      const { city } = req.params;
      
      // Si no es admin, solo puede ver costos de su ciudad
      if (req.user.role !== 'admin' && city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view costs from other cities'
        });
      }
      
      const totalDailyCost = await fixedExpenseService.getTotalDailyCost(city);
      
      res.status(200).json({
        success: true,
        city,
        totalDailyCost
      });
    } catch (error) {
      console.error('Get total daily cost error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error calculating total daily cost',
        error: error.message
      });
    }
  }
};

module.exports = fixedExpenseController;