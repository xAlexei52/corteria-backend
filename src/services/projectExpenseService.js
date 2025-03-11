// src/services/projectExpenseService.js
const { ProjectExpense, Project, Usuario } = require('../config/database');
const { Op } = require('sequelize');

const projectExpenseService = {
  /**
   * Registra un nuevo gasto en un proyecto
   * @param {Object} expenseData - Datos del gasto
   * @param {string} userId - ID del usuario que registra el gasto
   * @returns {Promise<Object>} Gasto registrado
   */
  async createExpense(expenseData, userId) {
    // Verificar que el proyecto existe
    const project = await Project.findByPk(expenseData.projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Crear el gasto
    const expense = await ProjectExpense.create({
      ...expenseData,
      createdBy: userId
    });
    
    return await this.getExpenseById(expense.id);
  },

  /**
   * Obtiene un gasto por ID
   * @param {string} id - ID del gasto
   * @returns {Promise<Object>} Gasto encontrado
   */
  async getExpenseById(id) {
    const expense = await ProjectExpense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    return expense;
  },

  /**
   * Lista gastos de un proyecto con filtros opcionales
   * @param {string} projectId - ID del proyecto
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de gastos y metadatos de paginación
   */
  async listExpenses(projectId, filters = {}, pagination = {}) {
    const where = { projectId };
    
    // Aplicar filtros
    if (filters.startDate && filters.endDate) {
      where.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.search) {
      where.description = { [Op.like]: `%${filters.search}%` };
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await ProjectExpense.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['date', 'DESC']],
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
   * Actualiza un gasto
   * @param {string} id - ID del gasto
   * @param {Object} expenseData - Datos a actualizar
   * @returns {Promise<Object>} Gasto actualizado
   */
  async updateExpense(id, expenseData) {
    const expense = await ProjectExpense.findByPk(id);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    await expense.update(expenseData);
    
    return await this.getExpenseById(id);
  },

  /**
   * Elimina un gasto
   * @param {string} id - ID del gasto
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteExpense(id) {
    const expense = await ProjectExpense.findByPk(id);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    await expense.destroy();
    
    return true;
  }
};

module.exports = projectExpenseService;