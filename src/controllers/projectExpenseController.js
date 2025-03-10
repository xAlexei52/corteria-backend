// src/controllers/projectExpenseController.js
const projectExpenseService = require('../services/projectExpenseService');
const projectService = require('../services/projectService');

const projectExpenseController = {
  /**
   * Registra un nuevo gasto en un proyecto
   * @route POST /api/projects/:projectId/expenses
   */
  async createExpense(req, res) {
    try {
      const { projectId } = req.params;
      const { description, amount, date, category, notes } = req.body;
      
      // Validación básica
      if (!description || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Description and amount are required'
        });
      }
      
      // Validar que el monto sea un número positivo
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      
      // Verificar que el proyecto existe
      try {
        await projectService.getProjectById(projectId);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      const expense = await projectExpenseService.createExpense({
        projectId,
        description,
        amount: parseFloat(amount),
        date: date || new Date(),
        category,
        notes
      }, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Expense registered successfully',
        expense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error registering expense',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un gasto por ID
   * @route GET /api/projects/expenses/:id
   */
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      
      const expense = await projectExpenseService.getExpenseById(id);
      
      res.status(200).json({
        success: true,
        expense
      });
    } catch (error) {
      console.error('Get expense error:', error);
      
      if (error.message === 'Expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching expense',
        error: error.message
      });
    }
  },
  
  /**
   * Lista gastos de un proyecto con filtros opcionales
   * @route GET /api/projects/:projectId/expenses
   */
  async listExpenses(req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;
      
      // Verificar que el proyecto existe
      try {
        await projectService.getProjectById(projectId);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      const filters = {
        search,
        category,
        startDate,
        endDate
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await projectExpenseService.listExpenses(
        projectId, 
        filters, 
        pagination
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List expenses error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing expenses',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un gasto
   * @route PUT /api/projects/expenses/:id
   */
  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { description, amount, date, category, notes } = req.body;
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (description) updateData.description = description;
      
      if (amount !== undefined) {
        // Validar que el monto sea un número positivo
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
          });
        }
        updateData.amount = parseFloat(amount);
      }
      
      if (date) updateData.date = date;
      if (category !== undefined) updateData.category = category;
      if (notes !== undefined) updateData.notes = notes;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      const expense = await projectExpenseService.updateExpense(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        expense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      
      if (error.message === 'Expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating expense',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un gasto
   * @route DELETE /api/projects/expenses/:id
   */
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      
      await projectExpenseService.deleteExpense(id);
      
      res.status(200).json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      
      if (error.message === 'Expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting expense',
        error: error.message
      });
    }
  }
};

module.exports = projectExpenseController;