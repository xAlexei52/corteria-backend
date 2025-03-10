// src/services/projectService.js
const { Project, ProjectExpense, ProjectIncome, Usuario, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const projectService = {
  /**
   * Crea un nuevo proyecto
   * @param {Object} projectData - Datos del proyecto
   * @param {string} userId - ID del usuario que crea el proyecto
   * @returns {Promise<Object>} Proyecto creado
   */
  async createProject(projectData, userId) {
    const project = await Project.create({
      ...projectData,
      createdBy: userId
    });
    
    return await this.getProjectById(project.id);
  },

  /**
   * Obtiene un proyecto por ID
   * @param {string} id - ID del proyecto
   * @returns {Promise<Object>} Proyecto encontrado
   */
  async getProjectById(id) {
    const project = await Project.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    return project;
  },

  /**
   * Lista proyectos con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de proyectos y metadatos de paginación
   */
  async listProjects(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } },
        { location: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    if (filters.startDate && filters.endDate) {
      where.startDate = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.startDate = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.startDate = { [Op.lte]: new Date(filters.endDate) };
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Project.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    return {
      projects: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un proyecto
   * @param {string} id - ID del proyecto
   * @param {Object} projectData - Datos a actualizar
   * @returns {Promise<Object>} Proyecto actualizado
   */
  async updateProject(id, projectData) {
    const project = await Project.findByPk(id);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    await project.update(projectData);
    
    return await this.getProjectById(id);
  },

  /**
   * Cambia el estado de un proyecto
   * @param {string} id - ID del proyecto
   * @param {string} status - Nuevo estado
   * @returns {Promise<Object>} Proyecto actualizado
   */
  async updateProjectStatus(id, status) {
    const project = await Project.findByPk(id);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Validar estado
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      throw new Error('Invalid status. Valid values are: active, completed, cancelled');
    }
    
    await project.update({ status });
    
    return await this.getProjectById(id);
  },

  /**
   * Obtiene el resumen financiero de un proyecto
   * @param {string} id - ID del proyecto
   * @param {Object} filters - Filtros para el período
   * @returns {Promise<Object>} Resumen financiero
   */
  async getProjectFinancialSummary(id, filters = {}) {
    const project = await Project.findByPk(id);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Establecer período para el análisis
    const whereDate = {};
    
    if (filters.startDate && filters.endDate) {
      whereDate.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      whereDate.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      whereDate.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    // Consultar gastos
    const expenses = await ProjectExpense.findAll({
      where: {
        projectId: id,
        ...whereDate
      },
      attributes: [
        [sequelize.fn('sum', sequelize.col('amount')), 'total'],
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m'), 'month']
      ],
      group: ['month'],
      order: [[sequelize.fn('date_format', sequelize.col('date'), '%Y-%m'), 'ASC']],
      raw: true
    });
    
    // Consultar ingresos
    const incomes = await ProjectIncome.findAll({
      where: {
        projectId: id,
        ...whereDate
      },
      attributes: [
        [sequelize.fn('sum', sequelize.col('amount')), 'total'],
        [sequelize.fn('date_format', sequelize.col('date'), '%Y-%m'), 'month']
      ],
      group: ['month'],
      order: [[sequelize.fn('date_format', sequelize.col('date'), '%Y-%m'), 'ASC']],
      raw: true
    });
    
    // Calcular totales
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.total), 0);
    const totalIncomes = incomes.reduce((sum, income) => sum + parseFloat(income.total), 0);
    const netProfit = totalIncomes - totalExpenses;
    
    // Construir análisis por mes
    const monthlyAnalysis = {};
    
    // Agregar gastos por mes
    expenses.forEach(expense => {
      if (!monthlyAnalysis[expense.month]) {
        monthlyAnalysis[expense.month] = { expenses: 0, incomes: 0, profit: 0 };
      }
      monthlyAnalysis[expense.month].expenses = parseFloat(expense.total);
    });
    
    // Agregar ingresos por mes
    incomes.forEach(income => {
      if (!monthlyAnalysis[income.month]) {
        monthlyAnalysis[income.month] = { expenses: 0, incomes: 0, profit: 0 };
      }
      monthlyAnalysis[income.month].incomes = parseFloat(income.total);
    });
    
    // Calcular ganancias por mes
    Object.keys(monthlyAnalysis).forEach(month => {
      monthlyAnalysis[month].profit = 
        monthlyAnalysis[month].incomes - monthlyAnalysis[month].expenses;
    });
    
    return {
      projectId: id,
      projectName: project.name,
      period: {
        startDate: filters.startDate || project.startDate,
        endDate: filters.endDate || 'current'
      },
      summary: {
        totalExpenses,
        totalIncomes,
        netProfit,
        profitMargin: totalIncomes > 0 ? (netProfit / totalIncomes) * 100 : 0
      },
      monthlyAnalysis: Object.keys(monthlyAnalysis).map(month => ({
        month,
        expenses: monthlyAnalysis[month].expenses,
        incomes: monthlyAnalysis[month].incomes,
        profit: monthlyAnalysis[month].profit,
        profitMargin: monthlyAnalysis[month].incomes > 0 
          ? (monthlyAnalysis[month].profit / monthlyAnalysis[month].incomes) * 100 
          : 0
      }))
    };
  }
};

module.exports = projectService;