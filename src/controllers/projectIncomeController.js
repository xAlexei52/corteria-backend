// src/controllers/projectIncomeController.js
const projectIncomeService = require('../services/projectIncomeService');
const projectService = require('../services/projectService');

const projectIncomeController = {
  /**
   * Registra un nuevo ingreso en un proyecto
   * @route POST /api/projects/:projectId/incomes
   */
  async createIncome(req, res) {
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
      
      const income = await projectIncomeService.createIncome({
        projectId,
        description,
        amount: parseFloat(amount),
        date: date || new Date(),
        category,
        notes
      }, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Income registered successfully',
        income
      });
    } catch (error) {
      console.error('Create income error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error registering income',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un ingreso por ID
   * @route GET /api/projects/incomes/:id
   */
  async getIncomeById(req, res) {
    try {
      const { id } = req.params;
      
      const income = await projectIncomeService.getIncomeById(id);
      
      res.status(200).json({
        success: true,
        income
      });
    } catch (error) {
      console.error('Get income error:', error);
      
      if (error.message === 'Income not found') {
        return res.status(404).json({
          success: false,
          message: 'Income not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching income',
        error: error.message
      });
    }
  },
  
  /**
   * Lista ingresos de un proyecto con filtros opcionales
   * @route GET /api/projects/:projectId/incomes
   */
  async listIncomes(req, res) {
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
      
      const result = await projectIncomeService.listIncomes(
        projectId, 
        filters, 
        pagination
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List incomes error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing incomes',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un ingreso
   * @route PUT /api/projects/incomes/:id
   */
  async updateIncome(req, res) {
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
      
      const income = await projectIncomeService.updateIncome(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Income updated successfully',
        income
      });
    } catch (error) {
      console.error('Update income error:', error);
      
      if (error.message === 'Income not found') {
        return res.status(404).json({
          success: false,
          message: 'Income not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating income',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un ingreso
   * @route DELETE /api/projects/incomes/:id
   */
  async deleteIncome(req, res) {
    try {
      const { id } = req.params;
      
      await projectIncomeService.deleteIncome(id);
      
      res.status(200).json({
        success: true,
        message: 'Income deleted successfully'
      });
    } catch (error) {
      console.error('Delete income error:', error);
      
      if (error.message === 'Income not found') {
        return res.status(404).json({
          success: false,
          message: 'Income not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting income',
        error: error.message
      });
    }
  }
};

module.exports = projectIncomeController;